// convex/adminClaims.ts
// Admin-only claim queries and operations.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { logSystemAlert } from "./lib/alerts";
import { triggerNotification } from "./lib/notifications";
import { incrementProductStats } from "./lib/productStats";

/**
 * Fetch all claims for admin queues with status and queue filters.
 */
export const getAdminClaims = query({
  args: {
    queue: v.optional(v.union(
      v.literal("Needs Review"),
      v.literal("Evidence Requested"),
      v.literal("Refund Approved"),
      v.literal("Return Pending"),
      v.literal("Closed"),
      v.literal("All")
    )),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let claims = await ctx.db.query("claims").collect();

    // Filter by queue
    if (args.queue) {
      if (args.queue === "Needs Review") {
        claims = claims.filter(c => c.status === "submitted" || c.status === "under_review");
      } else if (args.queue === "Evidence Requested") {
        claims = claims.filter(c => c.status === "evidence_requested");
      } else if (args.queue === "Refund Approved") {
        claims = claims.filter(c => c.status === "refund_approved");
      } else if (args.queue === "Return Pending") {
        claims = claims.filter(c => 
          (c.status === "refund_approved" || c.status === "refunded") && 
          c.inventoryRestored !== true
        );
      } else if (args.queue === "Closed") {
        claims = claims.filter(c => c.status === "closed" || c.status === "rejected");
      }
    }

    // Filter by individual status if provided (and not overridden by queue)
    if (args.status && !args.queue) {
      claims = claims.filter(c => c.status === args.status);
    }

    // Sort by submittedAt descending (newest first)
    claims.sort((a, b) => b.submittedAt - a.submittedAt);

    // Enrich claims in batch
    return await Promise.all(
      claims.map(async (claim) => {
        const [customer, boutique, orderItem, order] = await Promise.all([
          ctx.db.get(claim.customerId),
          ctx.db.get(claim.boutiqueId),
          ctx.db.get(claim.orderItemId),
          ctx.db.get(claim.orderId),
        ]);

        const evidence = await ctx.db
          .query("claimEvidence")
          .withIndex("by_claimId", (q: any) => q.eq("claimId", claim._id))
          .collect();

        return {
          ...claim,
          customerEmail: customer?.email || "Unknown",
          customerPhone: customer?.phone || "Unknown",
          boutiqueName: boutique?.boutiqueName || "Unknown",
          productName: orderItem?.productName || "Unknown Product",
          productSize: orderItem?.variantSize || "Unknown Size",
          productSku: orderItem?.sku || "Unknown SKU",
          orderNumber: order?.orderNumber || "Unknown Order",
          evidence,
        };
      })
    );
  },
});

/**
 * Fetch a single claim by ID with full details, events, and evidence.
 */
export const getAdminClaimById = query({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const claim = await ctx.db.get(args.claimId);
    if (!claim) return null;

    const [customer, boutique, orderItem, order] = await Promise.all([
      ctx.db.get(claim.customerId),
      ctx.db.get(claim.boutiqueId),
      ctx.db.get(claim.orderItemId),
      ctx.db.get(claim.orderId),
    ]);

    const evidence = await ctx.db
      .query("claimEvidence")
      .withIndex("by_claimId", (q: any) => q.eq("claimId", claim._id))
      .collect();

    const events = await ctx.db
      .query("claimEvents")
      .withIndex("by_claimId", (q: any) => q.eq("claimId", claim._id))
      .collect();

    // Sort events by createdAt ascending
    events.sort((a, b) => a.createdAt - b.createdAt);

    return {
      ...claim,
      customerEmail: customer?.email || "Unknown",
      customerPhone: customer?.phone || "Unknown",
      boutiqueName: boutique?.boutiqueName || "Unknown",
      productName: orderItem?.productName || "Unknown Product",
      productSize: orderItem?.variantSize || "Unknown Size",
      productSku: orderItem?.sku || "Unknown SKU",
      orderNumber: order?.orderNumber || "Unknown Order",
      evidence,
      events,
    };
  },
});

const VALID_CLAIM_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review"],
  under_review: ["evidence_requested", "refund_approved", "rejected", "closed"],
  evidence_requested: ["under_review", "rejected", "closed"],
  refund_approved: ["refunded", "closed"],
  refunded: ["return_received", "closed"],
  return_received: ["refunded", "closed"],
  closed: [],
  rejected: [],
};

/**
 * General status update mutation for claims (logs events and audit trails).
 */
export const updateClaimStatusAdmin = mutation({
  args: {
    claimId: v.id("claims"),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("evidence_requested"),
      v.literal("refund_approved"),
      v.literal("refunded"),
      v.literal("return_received"),
      v.literal("closed"),
      v.literal("rejected")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found");

    const now = Date.now();
    const fromStatus = claim.status;
    const toStatus = args.status;

    // Enforce transition rules
    const allowed = VALID_CLAIM_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus) && fromStatus !== toStatus) {
      await logSystemAlert(ctx, "claim.transition_failed", `Invalid claim transition: cannot move claim from "${fromStatus}" to "${toStatus}" on Claim Number ${claim.claimNumber}`, "critical", { claimId: claim._id });
      throw new Error(`Invalid claim transition: cannot move claim from "${fromStatus}" to "${toStatus}".`);
    }

    const patches: any = { status: toStatus, updatedAt: now };

    // Set timeline fields
    if (toStatus === "under_review") patches.underReviewAt = now;
    else if (toStatus === "evidence_requested") patches.evidenceRequestedAt = now;
    else if (toStatus === "refund_approved") patches.refundApprovedAt = now;
    else if (toStatus === "refunded") patches.refundedAt = now;
    else if (toStatus === "return_received") patches.returnReceivedAt = now;
    else if (toStatus === "closed") patches.closedAt = now;
    else if (toStatus === "rejected") patches.rejectedAt = now;

    await ctx.db.patch(args.claimId, patches);

    if (toStatus === "refund_approved" && fromStatus !== "refund_approved") {
      const orderItem = await ctx.db.get(claim.orderItemId);
      if (orderItem) {
        await incrementProductStats(ctx, orderItem.productId, claim.boutiqueId, {
          approvedClaimCount: 1,
        });
      }
    }

    if (toStatus === "rejected") {
      const order = await ctx.db.get(claim.orderId);
      await triggerNotification(
        ctx,
        claim.customerId,
        "email",
        "claim_rejected",
        "claim",
        claim._id,
        JSON.stringify({
          claimNumber: claim.claimNumber,
          orderNumber: order?.orderNumber || "",
          reason: args.note || "Insufficient evidence provided."
        })
      );
    }

    // Insert claim event
    await ctx.db.insert("claimEvents", {
      claimId: args.claimId,
      action: "status_changed",
      fromStatus,
      toStatus,
      actorId: adminUser._id,
      note: args.note,
      createdAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: "claim.status_changed",
      entityType: "claims",
      entityId: args.claimId,
      metadata: JSON.stringify({
        fromStatus,
        toStatus,
        note: args.note,
      }),
      createdAt: now,
    });

    return args.claimId;
  },
});

/**
 * Approve a refund for a claim. Updates order and payment records.
 */
export const approveClaimRefundAdmin = mutation({
  args: {
    claimId: v.id("claims"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found");

    const order = await ctx.db.get(claim.orderId);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    const fromStatus = claim.status;

    // Enforce transition rules
    const allowed = VALID_CLAIM_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes("refund_approved") && fromStatus !== "refund_approved") {
      await logSystemAlert(ctx, "claim.transition_failed", `Invalid claim transition: cannot approve refund for claim in status "${fromStatus}" on Claim Number ${claim.claimNumber}`, "critical", { claimId: claim._id });
      throw new Error(`Invalid claim transition: cannot approve refund for claim in status "${fromStatus}".`);
    }

    // Update claim status to refund_approved
    await ctx.db.patch(args.claimId, {
      status: "refund_approved",
      refundApprovedAt: now,
      updatedAt: now,
    });

    if (fromStatus !== "refund_approved") {
      const orderItem = await ctx.db.get(claim.orderItemId);
      if (orderItem) {
        await incrementProductStats(ctx, orderItem.productId, claim.boutiqueId, {
          approvedClaimCount: 1,
        });
      }
    }

    // Update order status to refunded
    await ctx.db.patch(claim.orderId, {
      status: "refunded",
      paymentStatus: "refunded",
      updatedAt: now,
    });

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", claim.orderId))
      .first();

    const refundAmount = payment ? payment.amount : order.total;

    // Trigger claim_approved notification
    await triggerNotification(
      ctx,
      claim.customerId,
      "email",
      "claim_approved",
      "claim",
      claim._id,
      JSON.stringify({
        claimNumber: claim.claimNumber,
        orderNumber: order.orderNumber,
        resolution: "refund"
      })
    );

    // Trigger refund_processed notification
    await triggerNotification(
      ctx,
      claim.customerId,
      "email",
      "refund_processed",
      "order",
      order._id,
      JSON.stringify({
        orderNumber: order.orderNumber,
        amount: refundAmount
      })
    );

    if (payment) {
      await ctx.db.patch(payment._id, {
        status: "refunded",
        refundAmount: refundAmount,
        refundedAt: now,
        updatedAt: now,
      });
    }

    // Create entry in refundLedger
    const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    await ctx.db.insert("refundLedger", {
      refundNumber,
      orderId: claim.orderId,
      claimId: claim._id,
      amount: refundAmount,
      status: "processed",
      refundType: "full_refund",
      razorpayRefundId: "re_" + Math.random().toString(36).slice(2, 11),
      notes: args.note || "Refund approved by admin on claim review",
      createdAt: now,
    });

    // Locate original accrual to compute exact deduction
    const originalAccrual = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", claim.boutiqueId))
      .filter((q) => q.and(q.eq(q.field("orderId"), claim.orderId), q.eq(q.field("type"), "accrual")))
      .first();

    // Deduct exact accrual or fallback to 90%
    const deductionAmount = originalAccrual ? -originalAccrual.amount : -Math.floor(refundAmount * 0.9);

    // Insert compensating negative deduction entry in settlementLedger
    await ctx.db.insert("settlementLedger", {
      boutiqueId: claim.boutiqueId,
      orderId: claim.orderId,
      type: "refund_deduction",
      source: "claim",
      amount: deductionAmount,
      status: "available", // Available immediately as a penalty correction
      createdAt: now,
      accruedAt: now,
      settledAt: now,
    });

    // Insert claim event
    await ctx.db.insert("claimEvents", {
      claimId: args.claimId,
      action: "status_changed",
      fromStatus,
      toStatus: "refund_approved",
      actorId: adminUser._id,
      note: args.note || "Refund approved by admin",
      createdAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: "claim.refund_approved",
      entityType: "claims",
      entityId: args.claimId,
      metadata: JSON.stringify({
        note: args.note,
        orderId: claim.orderId,
        refundNumber,
        deductionAmount,
      }),
      createdAt: now,
    });

    return args.claimId;
  },
});

/**
 * Mark a return shipment as received. Increments inventory stock idempotently.
 */
export const markClaimReturnReceivedAdmin = mutation({
  args: {
    claimId: v.id("claims"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found");

    if (claim.inventoryRestored === true) {
      await logSystemAlert(ctx, "inventory.restore_blocked", `Idempotency Guard: Attempted double stock restoral on Claim Number ${claim.claimNumber}`, "critical", { claimId: claim._id });
      throw new Error("Idempotency Guard: Inventory has already been restored for this claim return.");
    }

    const orderItem = await ctx.db.get(claim.orderItemId);
    if (!orderItem) throw new Error("Order item not found for this claim.");

    const product = await ctx.db.get(orderItem.productId);
    if (!product) throw new Error("Product not found");

    const now = Date.now();
    const fromStatus = claim.status;

    // Enforce transition rules
    const allowed = VALID_CLAIM_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes("return_received") && fromStatus !== "return_received") {
      await logSystemAlert(ctx, "claim.transition_failed", `Invalid claim transition: cannot mark return received for claim in status "${fromStatus}" on Claim Number ${claim.claimNumber}`, "critical", { claimId: claim._id });
      throw new Error(`Invalid claim transition: cannot mark return received for claim in status "${fromStatus}".`);
    }

    // 1. Increment product stock
    const currentStockBySize = { ...product.stockBySize };
    const size = orderItem.variantSize;
    const quantity = orderItem.quantity;

    const beforeQty = currentStockBySize[size] ?? 0;
    const afterQty = beforeQty + quantity;
    currentStockBySize[size] = afterQty;

    // If product was auto-deactivated because of out-of-stock, reactivate it!
    let active = product.active;
    let autoDeactivatedBecauseOutOfStock = product.autoDeactivatedBecauseOutOfStock ?? false;
    if (product.autoDeactivatedBecauseOutOfStock && beforeQty === 0 && afterQty > 0) {
      active = true;
      autoDeactivatedBecauseOutOfStock = false;
    }

    await ctx.db.patch(product._id, {
      stockBySize: currentStockBySize,
      active,
      autoDeactivatedBecauseOutOfStock,
      updatedAt: now,
    });

    // 2. Insert inventory movement log
    await ctx.db.insert("inventoryMovements", {
      productId: product._id,
      boutiqueId: claim.boutiqueId,
      size,
      beforeQty,
      afterQty,
      adjustmentQty: quantity,
      reason: "returned_item",
      source: "admin",
      createdBy: adminUser._id,
      notes: args.note || `Return received for Claim ${claim.claimNumber}`,
      createdAt: now,
    });

    // 3. Patch claim status
    await ctx.db.patch(args.claimId, {
      status: "return_received",
      returnReceivedAt: now,
      inventoryRestored: true,
      updatedAt: now,
    });

    // 4. Insert claim event
    await ctx.db.insert("claimEvents", {
      claimId: args.claimId,
      action: "status_changed",
      fromStatus,
      toStatus: "return_received",
      actorId: adminUser._id,
      note: args.note || "Return shipment marked as received by admin.",
      createdAt: now,
    });

    // 5. Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: "claim.return_received",
      entityType: "claims",
      entityId: args.claimId,
      metadata: JSON.stringify({
        productId: product._id,
        size,
        quantity,
        note: args.note,
      }),
      createdAt: now,
    });

    return args.claimId;
  },
});
