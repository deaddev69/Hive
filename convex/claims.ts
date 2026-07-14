// convex/claims.ts
// Customer claim mutations and queries.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { validateUploadedFile } from "./lib/uploads";
import { triggerNotification } from "./lib/notifications";
import { incrementProductStats } from "./lib/productStats";

/**
 * Submit a claim for a specific order item.
 * Includes concurrency / duplication check to prevent double submissions.
 */
export const submitClaimCustomer = mutation({
  args: {
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    type: v.union(v.literal("damage"), v.literal("wrong_item"), v.literal("missing_item")),
    description: v.string(),
    evidenceSnapshot: v.optional(v.object({
      videoUrl: v.string(),
      imageUrls: v.array(v.string()),
      uploadedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const customer = await requireRole(ctx, "customer");

    // Enforce file upload constraints on claims evidence
    if (args.evidenceSnapshot) {
      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
      const allowedVideoMimes = ["video/mp4", "video/webm", "video/quicktime"];
      const maxImageBytes = 5 * 1024 * 1024; // 5MB
      const maxVideoBytes = 50 * 1024 * 1024; // 50MB

      const { videoUrl, imageUrls } = args.evidenceSnapshot;

      if (videoUrl) {
        await validateUploadedFile(ctx, videoUrl, videoUrl, allowedVideoMimes, maxVideoBytes);
      }

      for (const img of imageUrls) {
        await validateUploadedFile(ctx, img, img, allowedImageMimes, maxImageBytes);
      }
    }
    const now = Date.now();

    // 1. Fetch and validate order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }

    if (order.customerId !== customer._id) {
      throw new Error("Unauthorized: You do not own this order.");
    }

    if (order.status !== "delivered") {
      throw new Error("Claims can only be submitted for delivered orders.");
    }

    // 2. Validate claim window expiration
    if (!order.claimWindowExpiresAt || now > order.claimWindowExpiresAt) {
      throw new Error("Claim submission window (24 hours from delivery) has expired.");
    }

    // 3. Validate order item
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem || orderItem.orderId !== order._id) {
      throw new Error("Order item not found or does not belong to this order.");
    }

    // 4. DUPLICATE CLAIM GUARD (Chaos Test #5 gate)
    const existingClaims = await ctx.db
      .query("claims")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect();

    const hasDuplicate = existingClaims.some((c) => c.orderItemId === args.orderItemId);
    if (hasDuplicate) {
      throw new Error("Active claim already exists for this order item.");
    }

    // 5. Generate claim number CLM-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = `CLM-${dateStr}-${randDigits}`;

    // 6. Insert the Claim
    const claimId = await ctx.db.insert("claims", {
      claimNumber,
      orderId: order._id,
      orderItemId: orderItem._id,
      customerId: customer._id,
      boutiqueId: order.boutiqueId,
      type: args.type,
      description: args.description,
      status: "submitted",
      evidenceSnapshot: args.evidenceSnapshot,
      submittedAt: now,
      windowExpiresAt: order.claimWindowExpiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Increment product performance claimCount
    await incrementProductStats(ctx, orderItem.productId, order.boutiqueId, {
      claimCount: 1,
    });

    // 7. Transition order status
    await ctx.db.patch(order._id, {
      status: "claim_submitted",
      updatedAt: now,
    });

    await triggerNotification(
      ctx,
      customer._id,
      "email",
      "claim_submitted",
      "claim",
      claimId,
      JSON.stringify({
        claimNumber,
        orderNumber: order.orderNumber,
      })
    );

    const superadmin = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).first();
    if (superadmin) {
      await triggerNotification(
        ctx,
        superadmin._id,
        "slack",
        "claim_submitted_ops",
        "claim",
        claimId,
        JSON.stringify({
          claimNumber,
          orderNumber: order.orderNumber,
          type: args.type
        })
      );
    }

    // 8. Log claim event
    await ctx.db.insert("claimEvents", {
      claimId,
      action: "status_changed",
      fromStatus: undefined,
      toStatus: "submitted",
      actorId: customer._id,
      note: "Claim submitted by customer",
      createdAt: now,
    });

    // 9. Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: customer._id,
      actorRole: "customer",
      action: "claim.submitted",
      entityType: "claims",
      entityId: claimId,
      metadata: JSON.stringify({
        claimNumber,
        type: args.type,
        orderId: order._id,
        orderItemId: orderItem._id,
      }),
      createdAt: now,
    });

    return claimId;
  },
});
