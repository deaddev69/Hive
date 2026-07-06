// convex/adminFinance.ts
// Backend API for Admin Finance, Settlements, Payouts, and Refund Ledgers.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, getAuthenticatedUser } from "./lib/auth";
import { logSystemAlert } from "./lib/alerts";
import { triggerNotification } from "./lib/notifications";
import { decryptData } from "./lib/encryption";
import { incrementProductStats } from "./lib/productStats";
import { formatMoney } from "./lib/money";
import { internal } from "./_generated/api";

/**
 * Get aggregated dashboard metrics for the Admin Finance screen.
 */
export const getFinanceDashboardMetricsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const orders = await ctx.db.query("orders").collect();
    const refunds = await ctx.db
      .query("refundLedger")
      .filter((q) => q.eq(q.field("status"), "processed"))
      .collect();
    const commissions = await ctx.db.query("commissionLedger").collect();
    const settlements = await ctx.db.query("settlementLedger").collect();
    const payouts = await ctx.db
      .query("payoutLedger")
      .filter((q) => q.eq(q.field("status"), "success"))
      .collect();

    // 1. Gross GMV: Total value of all paid/completed orders (excluding cancelled)
    const paidOrders = orders.filter(
      (o) => o.paymentStatus === "paid" && o.status !== "cancelled"
    );
    const grossGmv = paidOrders.reduce((sum, o) => sum + o.total, 0);

    // 2. Total Refunds Amount
    const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);

    // 3. Net GMV: Gross GMV - Refunds
    const netGmv = Math.max(0, grossGmv - totalRefunds);

    // 4. Platform Revenue: Commissions - GST (we pay GST, netCommission is our intake)
    const platformRevenue = commissions.reduce((sum, c) => sum + c.netCommission, 0);

    // 5. Pending Settlements
    const pendingSettlements = settlements
      .filter((s) => s.status === "pending")
      .reduce((sum, s) => sum + s.amount, 0);

    // 6. Available For Payout (unpaid available settlements)
    const availableForPayout = settlements
      .filter((s) => s.status === "available" && s.payoutId === undefined)
      .reduce((sum, s) => sum + s.amount, 0);

    // 7. Paid Out
    const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);

    // 8. Refund Rate: Total Refunds / Gross GMV
    const refundRate = grossGmv > 0 ? (totalRefunds / grossGmv) * 100 : 0;

    return {
      grossGmv,
      netGmv,
      totalRefunds,
      platformRevenue,
      pendingSettlements,
      availableForPayout,
      totalPaidOut,
      refundRate,
    };
  },
});

/**
 * Get financial balance and ledger summary for a specific boutique (wallet).
 */
export const getBoutiqueWallet = query({
  args: { boutiqueId: v.id("boutiques") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const boutique = await ctx.db.get(args.boutiqueId);
    if (!boutique) {
      throw new Error("Boutique not found");
    }

    if (currentUser.role !== "admin") {
      if (currentUser.role === "boutique" || currentUser.role === "boutique_owner") {
        if (boutique.ownerUserId !== currentUser._id) {
          throw new Error("Forbidden: Access denied to this boutique wallet");
        }
      } else {
        throw new Error("Forbidden: Access denied");
      }
    }

    const settlements = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    const payouts = await ctx.db
      .query("payoutLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    // Available Balance: Settled but not paid out
    const availableBalance = settlements
      .filter((s) => s.status === "available" && s.payoutId === undefined)
      .reduce((sum, s) => sum + s.amount, 0);

    // Pending Balance: Still in claim window
    const pendingBalance = settlements
      .filter((s) => s.status === "pending")
      .reduce((sum, s) => sum + s.amount, 0);

    // Lifetime Earnings: Total positive accruals
    const lifetimeEarnings = settlements
      .filter((s) => s.amount > 0 && s.type === "accrual")
      .reduce((sum, s) => sum + s.amount, 0);

    // Total Paid Out: Successful payouts
    const totalPaidOut = payouts
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      availableBalance,
      pendingBalance,
      lifetimeEarnings,
      totalPaidOut,
    };
  },
});

/**
 * Retrieve settlements log registry for audit.
 */
export const getSettlementsAdmin = query({
  args: {
    boutiqueId: v.optional(v.id("boutiques")),
    status: v.optional(v.union(v.literal("pending"), v.literal("available"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let settlements = [];
    if (args.boutiqueId) {
      const bid = args.boutiqueId;
      settlements = await ctx.db
        .query("settlementLedger")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", bid))
        .collect();
    } else {
      settlements = await ctx.db.query("settlementLedger").collect();
    }

    if (args.status) {
      settlements = settlements.filter((s) => s.status === args.status);
    }

    // Enrich with boutique names
    return await Promise.all(
      settlements.map(async (s) => {
        const boutique = await ctx.db.get(s.boutiqueId);
        return {
          ...s,
          boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
        };
      })
    );
  },
});

/**
 * Retrieve payouts log registry.
 */
export const getPayoutsAdmin = query({
  args: {
    boutiqueId: v.optional(v.id("boutiques")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    let targetBoutiqueId = args.boutiqueId;

    if (currentUser.role !== "admin") {
      if (currentUser.role === "boutique" || currentUser.role === "boutique_owner") {
        const boutique = await ctx.db
          .query("boutiques")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", currentUser._id))
          .unique();
        if (!boutique) {
          throw new Error("Forbidden: No boutique associated with this user");
        }
        if (boutique.ownerUserId !== currentUser._id) {
          throw new Error("Forbidden: Owner verification failed");
        }
        targetBoutiqueId = boutique._id;
      } else {
        throw new Error("Forbidden: Access denied");
      }
    }

    let payouts = [];
    if (targetBoutiqueId) {
      const bid = targetBoutiqueId;
      payouts = await ctx.db
        .query("payoutLedger")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", bid))
        .collect();
    } else {
      payouts = await ctx.db.query("payoutLedger").collect();
    }

    // Sort payouts by date (newest first)
    payouts.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      payouts.map(async (p) => {
        const boutique = await ctx.db.get(p.boutiqueId);
        return {
          ...p,
          boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
        };
      })
    );
  },
});

/**
 * Process a payout for a boutique. Batch-transfers all available unpaid settlements.
 */
export const triggerBoutiquePayoutAdmin = mutation({
  args: { boutiqueId: v.id("boutiques") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    const boutique = await ctx.db.get(args.boutiqueId);
    if (!boutique) throw new Error("Boutique not found");

    // 1. Suspension Payout Freeze Lock
    if (boutique.status === "SUSPENDED") {
      await logSystemAlert(
        ctx,
        "payout.blocked",
        `Payout Blocked: Boutique "${boutique.boutiqueName}" is suspended. Payouts are frozen.`,
        "warning",
        { boutiqueId: boutique._id }
      );
      throw new Error("Payout Blocked: Boutique is suspended. Payouts are frozen pending review.");
    }

    // 2. Compliance Bank Proof Lock
    const bankDoc = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_boutiqueId_type", (q) => q.eq("boutiqueId", args.boutiqueId).eq("type", "bank_proof"))
      .first();
    if (!bankDoc || bankDoc.status !== "verified") {
      await logSystemAlert(
        ctx,
        "payout.blocked",
        `Payout Blocked: Bank Proof document is not verified for boutique "${boutique.boutiqueName}".`,
        "warning",
        { boutiqueId: boutique._id }
      );
      throw new Error("Payout Blocked: Bank Proof document is not verified.");
    }

    // Concurrency / double-click protection: assert no scheduled or processing payout exists
    const activePayouts = await ctx.db
      .query("payoutLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();
    const hasPendingPayout = activePayouts.some(
      (p) => p.status === "scheduled" || p.status === "processing"
    );
    if (hasPendingPayout) {
      throw new Error("Payout Blocked: A pending payout is already scheduled or processing for this boutique.");
    }

    // Fetch all available, unpaid settlements
    const settlements = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    const unpaidSettled = settlements.filter(
      (s) => s.status === "available" && s.payoutId === undefined
    );

    if (unpaidSettled.length === 0) {
      throw new Error("No available balance eligible for payout.");
    }

    const availableBalance = unpaidSettled.reduce((sum, s) => sum + s.amount, 0);
    if (availableBalance <= 0) {
      throw new Error("No available balance eligible for payout.");
    }

    // Verify all linked settlements are strictly "available"
    const hasUnsafeSettlements = unpaidSettled.some((s) => s.status !== "available" || s.payoutId !== undefined);
    if (hasUnsafeSettlements) {
      throw new Error("Payout Blocked: One or more linked settlements are not available or already paid.");
    }

    if (!boutique.bankAccount) {
      throw new Error("Payout Blocked: Boutique has not configured bank details.");
    }

    const secret = process.env.BANK_ENCRYPTION_KEY;
    if (!secret) throw new Error("FATAL: BANK_ENCRYPTION_KEY environment variable is not configured. Cannot process payout.");
    let decryptedAccountNo = "";
    try {
      decryptedAccountNo = await decryptData(boutique.bankAccount.encryptedAccountNo, secret);
    } catch (err) {
      console.error("Failed to decrypt boutique bank account:", err);
      throw new Error("Payout Blocked: BANK_ENCRYPTION_KEY invalid or bank data corrupted.");
    }

    if (!decryptedAccountNo || !decryptedAccountNo.trim() || decryptedAccountNo.includes("X")) {
      throw new Error("Payout Blocked: Bank account decryption resulted in empty or masked value.");
    }

    const holderName = boutique.bankAccount.holderName;
    const ifsc = boutique.bankAccount.ifsc;

    if (!holderName || !holderName.trim() || !ifsc || !ifsc.trim()) {
      throw new Error("Payout Blocked: Incomplete bank details (missing holder name or IFSC).");
    }

    const bankAccount = {
      holderName,
      accountNo: decryptedAccountNo,
      ifsc,
    };

    const now = Date.now();
    const payoutNumber = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const settlementIds = unpaidSettled.map((s) => s._id);

    // Create immutable Payout Record
    const payoutId = await ctx.db.insert("payoutLedger", {
      payoutNumber,
      boutiqueId: boutique._id,
      amount: availableBalance,
      status: "success", // Mock successful payment completion
      bankAccount,
      utrReference: "UTR" + Math.floor(100000000000 + Math.random() * 900000000000),
      payoutSnapshot: {
        availableBalance,
        orderCount: unpaidSettled.filter((s) => s.orderId !== undefined).length,
        settlementIds,
        generatedAt: now,
      },
      paidAt: now,
      createdAt: now,
    });

    // Link settlements to payoutId (Status remains 'available' per instruction)
    for (const s of unpaidSettled) {
      await ctx.db.patch(s._id, {
        payoutId,
      });
    }

    // Trigger payout_released notification to boutique owner (WhatsApp or fallback email)
    const isWhatsAppEnabled = boutique?.whatsAppNotificationsEnabled ?? true;
    const recipientPhone = boutique?.notificationPhone || boutique?.phone;

    if (isWhatsAppEnabled && recipientPhone) {
      await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
        recipient: recipientPhone,
        templateName: "payout_released",
        parameters: [
          boutique.ownerName || "Merchant",
          payoutNumber,
          `Rs. ${(availableBalance / 100).toFixed(2)}`
        ],
      });
    } else if (boutique.email || boutique.ownerEmail) {
      await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
        to: boutique.email || boutique.ownerEmail,
        subject: `Payout Released - ${payoutNumber}`,
        html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>A payout of Rs. ${(availableBalance / 100).toFixed(2)} has been successfully processed under reference number ${payoutNumber}.</p>`,
        templateName: "payout_released",
      });
    }

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "payout.processed",
      entityType: "payoutLedger",
      entityId: payoutId,
      metadata: JSON.stringify({
        payoutNumber,
        boutiqueId: boutique._id,
        amount: availableBalance,
        bankAccount: {
          holderName: bankAccount.holderName,
          accountNo: bankAccount.accountNo.length > 4
            ? "X".repeat(bankAccount.accountNo.length - 4) + bankAccount.accountNo.slice(-4)
            : "XXXX",
          ifsc: bankAccount.ifsc,
        },
      }),
      createdAt: now,
    });

    return payoutId;
  },
});

/**
 * Payout failure recovery mutation. Simulates a payout failure and restores settlement availability.
 */
export const failBoutiquePayoutAdmin = mutation({
  args: { payoutId: v.id("payoutLedger") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    const payout = await ctx.db.get(args.payoutId);
    if (!payout) throw new Error("Payout not found");
    if (payout.status !== "success" && payout.status !== "processing") {
      throw new Error(`Payout is already in ${payout.status} status.`);
    }

    const now = Date.now();

    // 1. Mutate Payout status to failed
    await ctx.db.patch(args.payoutId, {
      status: "failed",
      utrReference: undefined,
      paidAt: undefined,
    });

    // 2. Recovery: Find settlements linked to this payout and unlink them (reset payoutId)
    const settlements = await ctx.db
      .query("settlementLedger")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", args.payoutId))
      .collect();

    for (const s of settlements) {
      await ctx.db.patch(s._id, {
        payoutId: undefined, // Restore availability
      });
    }

    // 3. Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "payout.failed_recovery",
      entityType: "payoutLedger",
      entityId: args.payoutId,
      metadata: JSON.stringify({
        payoutId: args.payoutId,
        amount: payout.amount,
        unlinkedCount: settlements.length,
      }),
      createdAt: now,
    });

    return args.payoutId;
  },
});

/**
 * Post a manual financial adjustment (compensating ledger entry) for a boutique.
 */
export const postManualAdjustmentAdmin = mutation({
  args: {
    boutiqueId: v.id("boutiques"),
    amount: v.number(), // negative for penalty/debit, positive for bonus/credit (paise)
    adjustmentType: v.union(
      v.literal("bonus"),
      v.literal("penalty"),
      v.literal("commission_correction"),
      v.literal("refund_correction"),
      v.literal("manual_credit"),
      v.literal("manual_debit")
    ),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    const boutique = await ctx.db.get(args.boutiqueId);
    if (!boutique) throw new Error("Boutique not found");

    const now = Date.now();

    // Insert compensating ledger entry
    const settlementId = await ctx.db.insert("settlementLedger", {
      boutiqueId: args.boutiqueId,
      type: "adjustment",
      source: "admin",
      adjustmentType: args.adjustmentType,
      amount: args.amount,
      status: "available", // Available immediately
      accruedAt: now,
      settledAt: now,
      createdAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "manual_adjustment.posted",
      entityType: "settlementLedger",
      entityId: settlementId,
      metadata: JSON.stringify({
        boutiqueId: args.boutiqueId,
        amount: args.amount,
        adjustmentType: args.adjustmentType,
        notes: args.notes,
      }),
      createdAt: now,
    });

    return settlementId;
  },
});

/**
 * Shared helper to mark an order as financially delivered.
 * Idempotently generates commission and pending settlement accrual records.
 * Runs in the same database transaction as webhook / admin updates.
 */
export async function markOrderFinanciallyDelivered(ctx: any, orderId: any, now: number) {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error("Order not found.");

  // Hardening Check: Verify order paymentStatus is paid
  if (order.paymentStatus !== "paid") {
    console.log(`Order ${order.orderNumber} is not paid. Skipping financial accrual.`);
    return { success: false, reason: "not_paid" };
  }

  // 1. Verify shipment delivered
  if (!order.shipmentId) {
    console.log(`Order ${order.orderNumber} does not have a shipment. Skipping financial accrual.`);
    return { success: false, reason: "missing_shipment" };
  }
  const shipment = await ctx.db.get(order.shipmentId);
  if (!shipment || shipment.status !== "delivered") {
    console.log(`Shipment for Order ${order.orderNumber} is not delivered. Skipping financial accrual.`);
    return { success: false, reason: "shipment_not_delivered" };
  }

  // 2. Verify order delivered
  if (order.status !== "delivered") {
    console.log(`Order ${order.orderNumber} status is not delivered. Skipping financial accrual.`);
    return { success: false, reason: "order_not_delivered" };
  }

  // 3. Verify settlement accrual not already created (Idempotency Guard specifically for type: accrual)
  const existingAccrual = await ctx.db
    .query("settlementLedger")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .filter((q: any) => q.eq(q.field("type"), "accrual"))
    .first();

  if (existingAccrual) {
    console.log(`Settlement accrual already exists for Order ${order.orderNumber}. Skipping.`);
    return { success: true, message: "already_accrued", settlementId: existingAccrual._id };
  }

  // Fetch boutique and items
  const boutique = await ctx.db.get(order.boutiqueId);
  if (!boutique) throw new Error("Boutique not found.");

  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .collect();

  const commissionRate = boutique.commissionRate || 10;
  let totalCommissionAmount = 0;
  let totalGstAmount = 0;

  // Insert commission per item
  for (const item of items) {
    // Check if commissionLedger entry already exists for this orderItem
    const existingCommission = await ctx.db
      .query("commissionLedger")
      .withIndex("by_orderItemId", (q: any) => q.eq("orderItemId", item._id))
      .first();

    if (existingCommission) continue;

    const commissionAmount = Math.floor(item.subtotal * (commissionRate / 100));
    const gstAmount = Math.floor(commissionAmount * 0.18);
    const netCommission = commissionAmount - gstAmount;

    await ctx.db.insert("commissionLedger", {
      orderId: order._id,
      orderItemId: item._id,
      productId: item.productId,
      boutiqueId: order.boutiqueId,
      priceAtPurchase: item.priceAtPurchase,
      quantity: item.quantity,
      commissionRate,
      commissionAmount,
      gstAmount,
      netCommission,
      commissionVersion: "v1",
      createdAt: now,
    });

    totalCommissionAmount += commissionAmount;
    totalGstAmount += gstAmount;
  }

  // Calculate Net Boutique Accrual (Exclude customer-paid delivery fee)
  const accrualAmount = (order.subtotal - order.discount) - totalCommissionAmount;
  const claimWindowDays = 2; // 48h

  // Fetch courier cost from deliverySubsidyLedger
  const subsidyRecord = await ctx.db
    .query("deliverySubsidyLedger")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .first();
  const courierCost = subsidyRecord ? (subsidyRecord.actualCourierCost ?? subsidyRecord.actualPorterCost ?? 9000) : 9000;

  const settlementSnapshot = {
    orderValue: order.total,
    commissionAmount: totalCommissionAmount,
    gstAmount: totalGstAmount,
    courierCost,
    merchantPayable: accrualAmount,
    settledAt: now,
    courierQuote: order.orderSnapshot?.courierQuote ?? undefined, // Freeze the original quote
  };

  const settlementId = await ctx.db.insert("settlementLedger", {
    boutiqueId: order.boutiqueId,
    orderId: order._id,
    type: "accrual",
    source: "order",
    amount: accrualAmount,
    status: "pending",
    claimWindowDays,
    accruedAt: now,
    createdAt: now,
    settlementSnapshot,
  });

  // Write audit log check existence
  const existingAudit = await ctx.db
    .query("auditLogs")
    .withIndex("by_entityType_entityId", (q: any) => q.eq("entityType", "orders").eq("entityId", orderId))
    .filter((q: any) => q.eq(q.field("action"), "settlement.accrued"))
    .first();

  if (!existingAudit) {
    await ctx.db.insert("auditLogs", {
      actorRole: "system",
      action: "settlement.accrued",
      entityType: "orders",
      entityId: orderId,
      metadata: JSON.stringify({
        settlementId,
        orderNumber: order.orderNumber,
        accrualAmount,
        commissionAmount: totalCommissionAmount,
      }),
      createdAt: now,
    });
  }

  // Increment product stats per delivered item
  for (const item of items) {
    await incrementProductStats(ctx, item.productId, order.boutiqueId, {
      salesRevenue: item.subtotal || (item.priceAtPurchase * item.quantity),
      orderCount: item.quantity,
      lastSoldAt: now,
    });
  }

  return { success: true, settlementId };
}

/**
 * Shared helper to settle all eligible pending settlements where the claim window has expired.
 * IDEMPOTENT: skips any settlements that are not 'pending'.
 */
export async function settleEligibleOrdersHelper(ctx: any, adminId?: any) {
  const now = Date.now();
  const startedAt = now;

  // Cron Lock Protection: Check if settlement_cron is already running within last 10 minutes
  const tenMinutesAgo = startedAt - 10 * 60 * 1000;
  const latestRun = await ctx.db
    .query("cronRuns")
    .withIndex("by_cronName_createdAt", (q: any) => q.eq("cronName", "settlement_cron"))
    .order("desc")
    .first();

  if (latestRun && latestRun.status === "running" && latestRun.startedAt > tenMinutesAgo) {
    console.log(`Cron settlement_cron is already running. Skipping execution.`);
    return { success: false, reason: "running" };
  }

  // Insert running lock record
  const runId = await ctx.db.insert("cronRuns", {
    cronName: "settlement_cron",
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    status: "running",
    metrics: {},
    createdAt: startedAt,
  });

  // Fetch all pending settlements
  const pendingSettlements = await ctx.db
    .query("settlementLedger")
    .withIndex("by_status", (q: any) => q.eq("status", "pending"))
    .collect();

  let settledCount = 0;
  let settledAmountSum = 0;
  let failures = 0;

  try {
    for (const s of pendingSettlements) {
      // Idempotency: skip if not pending (handled by index, but verify just in case)
      if (s.status !== "pending") continue;

      // Check if order claim window has expired
      if (s.orderId) {
        const order = await ctx.db.get(s.orderId);
        if (order && order.claimWindowExpiresAt && order.claimWindowExpiresAt <= now) {
          // Hardening Check: Require both order AND shipment status to be explicitly "delivered"
          if (order.shipmentId) {
            const shipment = await ctx.db.get(order.shipmentId);
            if (!shipment || shipment.status !== "delivered" || order.status !== "delivered") {
              await logSystemAlert(
                ctx,
                "settlement.frozen",
                `Settlement frozen: Order ${order.orderNumber} reached expiry but shipment/order status is not delivered (shipment: ${shipment?.status || "missing"}, order: ${order.status})`,
                "warning",
                { orderId: order._id, shipmentId: order.shipmentId }
              );
              failures++;
              continue; // Freeze settlement
            }
          } else {
            if (order.status !== "delivered") {
              await logSystemAlert(
                ctx,
                "settlement.frozen",
                `Settlement frozen: Order ${order.orderNumber} reached expiry but order status is ${order.status} (not delivered)`,
                "warning",
                { orderId: order._id }
              );
              failures++;
              continue; // Freeze settlement
            }
          }

          // Dispute Gating: Verify that there are no open claims on the order
          const openClaims = await ctx.db
            .query("claims")
            .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
            .collect();
          const hasOpenClaims = openClaims.some(
            (c: any) => !["closed", "rejected", "refunded"].includes(c.status)
          );
          if (hasOpenClaims) {
            await logSystemAlert(
              ctx,
              "settlement.frozen",
              `Settlement frozen: Order ${order.orderNumber} has open claims/disputes.`,
              "warning",
              { orderId: order._id }
            );
            failures++;
            continue; // Freeze settlement: skip/lock as pending during active disputes
          }

          await ctx.db.patch(s._id, {
            status: "available",
            settledAt: now,
          });
          settledCount++;
          settledAmountSum += s.amount;
        }
      }
    }

    if (settledCount > 0) {
      await ctx.db.insert("auditLogs", {
        actorId: adminId,
        actorRole: adminId ? "admin" : "system",
        action: "settlements.batch_settled",
        entityType: "settlementLedger",
        entityId: "batch",
        metadata: JSON.stringify({
          settledCount,
          settledAmountSum,
        }),
        createdAt: now,
      });
    }

    const finishedAt = Date.now();
    await ctx.db.patch(runId, {
      finishedAt,
      durationMs: finishedAt - startedAt,
      status: "success",
      metrics: { ordersReleased: settledCount, failures },
    });

    return { success: true, settledCount, settledAmountSum };
  } catch (err: any) {
    const finishedAt = Date.now();
    await ctx.db.patch(runId, {
      finishedAt,
      durationMs: finishedAt - startedAt,
      status: "failed",
      metrics: { ordersReleased: settledCount, failures },
      error: err.message,
    });
    // Log system alert for cron failure!
    await logSystemAlert(
      ctx,
      "cron.failed",
      `Cron Job Failed: settlement_cron execution error: ${err.message}`,
      "critical",
      { cronName: "settlement_cron", error: err.message }
    );
    throw err;
  }
}

/**
 * Settle all eligible pending settlements where the claim window has expired.
 */
export const settleEligibleOrdersAdmin = mutation({
  args: {},
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    return await settleEligibleOrdersHelper(ctx, admin._id);
  },
});

/**
 * Seed historical finance records backfilling orders, commissions and settlements.
 */
export const seedFinanceMockDataAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Seeding mock finance data is disabled in this environment.");
    }
    await requireRole(ctx, "admin");

    const orders = await ctx.db.query("orders").collect();
    const now = Date.now();
    let seededCount = 0;

    for (const order of orders) {
      if (order.paymentStatus !== "paid") continue;

      // 1. Skip if settlements or commissions already exist for this order
      const existingSettlement = await ctx.db
        .query("settlementLedger")
        .filter((q) => q.eq(q.field("orderId"), order._id))
        .first();

      if (existingSettlement) continue;

      const boutique = await ctx.db.get(order.boutiqueId);
      if (!boutique) continue;

      // 2. Fetch order items
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      const netOrderSubtotal = order.subtotal - (order.discount ?? 0);
      const globalPlatformCommission = order.orderSnapshot?.commissionAmount ?? 0;
      const globalGstOnCommission = order.orderSnapshot?.gstAmount ?? 0;
      const commissionRate = order.orderSnapshot?.commissionRate || boutique.commissionRate || 10;

      let allocatedCommissionSum = 0;
      let allocatedGstSum = 0;
      const totalItems = items.length;

      // 3. Insert commission per item
      for (let i = 0; i < totalItems; i++) {
        const item = items[i];

        // Calculate the item's proportional discount share to find its true net value
        const itemProportionalDiscount = Math.floor(
          (item.subtotal / order.subtotal) * (order.discount ?? 0)
        );
        const itemNetSubtotal = item.subtotal - itemProportionalDiscount;

        let itemCommission = 0;
        let itemGst = 0;

        // Check if we have arrived at the final item in the array
        if (i === totalItems - 1) {
          // Allocate the exact algebraic remainder to guarantee 100% split accuracy
          itemCommission = globalPlatformCommission - allocatedCommissionSum;
          itemGst = globalGstOnCommission - allocatedGstSum;
        } else {
          // Proportional calculation step for intermediate items
          const proportionalShare = itemNetSubtotal / netOrderSubtotal;
          itemCommission = Math.floor(globalPlatformCommission * proportionalShare);
          itemGst = Math.floor(globalGstOnCommission * proportionalShare);

          // Update running sums
          allocatedCommissionSum += itemCommission;
          allocatedGstSum += itemGst;
        }

        const netCommission = itemCommission - itemGst;

        await ctx.db.insert("commissionLedger", {
          orderId: order._id,
          orderItemId: item._id,
          productId: item.productId,
          boutiqueId: order.boutiqueId,
          priceAtPurchase: item.priceAtPurchase,
          quantity: item.quantity,
          commissionRate,
          commissionAmount: itemCommission,
          gstAmount: itemGst,
          netCommission,
          commissionVersion: "v2_proportional", // updated rule snapshot
          createdAt: order.createdAt,
        });
      }

      // 4. Calculate Net Boutique Accrual (Exclude customer-paid delivery fee)
      const accrualAmount = netOrderSubtotal - (globalPlatformCommission + globalGstOnCommission);

      // 5. Determine if settled (Claim window has expired)
      const claimWindowDays = 2; // 48h
      const expiresAt = order.claimWindowExpiresAt || (order.deliveredAt || order.createdAt) + claimWindowDays * 24 * 3600 * 1000;
      const isSettled = expiresAt <= now && order.status === "delivered";

      const settlementId = await ctx.db.insert("settlementLedger", {
        boutiqueId: order.boutiqueId,
        orderId: order._id,
        type: "accrual",
        source: "order",
        amount: accrualAmount,
        status: isSettled ? "available" : "pending",
        claimWindowDays,
        accruedAt: order.deliveredAt || order.createdAt,
        settledAt: isSettled ? expiresAt : undefined,
        createdAt: order.createdAt,
      });

      // 6. Handle refund mock details if order was refunded
      if (order.status === "refunded") {
        const refundNumber = `REF-${new Date(order.updatedAt || now).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

        await ctx.db.insert("refundLedger", {
          refundNumber,
          orderId: order._id,
          amount: order.total,
          status: "processed",
          refundType: "full_refund",
          razorpayRefundId: "re_" + Math.random().toString(36).slice(2, 11),
          notes: "Customer dispute claim settled",
          createdAt: order.updatedAt || now,
        });

        // Insert compensating deduction
        await ctx.db.insert("settlementLedger", {
          boutiqueId: order.boutiqueId,
          orderId: order._id,
          type: "refund_deduction",
          source: "claim",
          amount: -accrualAmount,
          status: "available",
          createdAt: order.updatedAt || now,
          accruedAt: order.updatedAt || now,
          settledAt: order.updatedAt || now,
        });
      }

      seededCount++;
    }

    return { seededCount };
  },
});

/**
 * Retrieve platform commissions cuts ledger.
 */
export const getCommissionsAdmin = query({
  args: {
    boutiqueId: v.optional(v.id("boutiques")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let commissions = [];
    if (args.boutiqueId) {
      const bid = args.boutiqueId;
      commissions = await ctx.db
        .query("commissionLedger")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", bid))
        .collect();
    } else {
      commissions = await ctx.db.query("commissionLedger").collect();
    }

    commissions.sort((a, b) => b.createdAt - a.createdAt);

    return commissions;
  },
});

/**
 * Helper logic for performing platform-wide ledger reconciliation checks.
 * Shared between runLedgerReconciliationAdmin (query) and triggerCronJobAdmin (mutation).
 */
export async function runReconciliationHelper(db: any) {
  const orders = await db.query("orders").collect();
  const commissions = await db.query("commissionLedger").collect();
  const settlements = await db.query("settlementLedger").collect();
  const payouts = await db.query("payoutLedger").collect();
  const refunds = await db.query("refundLedger").collect();
  const payments = await db.query("payments").collect();

  const orderExceptions = [];
  const payoutExceptions = [];
  const refundExceptions = [];

  // --- Reconciliation A: Order Economics ---
  // Paid orders (excluding cancelled) must equal boutique accrual + platform commission (excluding delivery fees retained by Hive)
  const paidOrders = orders.filter((o: any) => o.paymentStatus === "paid" && o.status !== "cancelled");
  for (const order of paidOrders) {
    const orderCommissions = commissions.filter((c: any) => c.orderId === order._id);
    const totalCommission = orderCommissions.reduce((sum: number, c: any) => sum + c.commissionAmount, 0);

    const accrual = settlements.find((s: any) => s.orderId === order._id && s.type === "accrual");
    const accrualAmount = accrual ? accrual.amount : 0;

    const expectedTotal = order.total - order.deliveryFee;
    const actualTotal = accrualAmount + totalCommission;

    if (expectedTotal !== actualTotal) {
      orderExceptions.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        expected: expectedTotal,
        actual: actualTotal,
        diff: expectedTotal - actualTotal,
        notes: `Boutique Accrual: ${accrualAmount}, Platform Commission: ${totalCommission}`,
      });
    }
  }

  // --- Reconciliation B: Payout Batches ---
  // Successful payouts must equal the sum of their linked settlements
  const successfulPayouts = payouts.filter((p: any) => p.status === "success");
  for (const payout of successfulPayouts) {
    const linkedSettlements = settlements.filter((s: any) => s.payoutId === payout._id);
    const settlementsTotal = linkedSettlements.reduce((sum: number, s: any) => sum + s.amount, 0);

    const expectedAmount = payout.amount;
    const actualAmount = settlementsTotal;

    if (expectedAmount !== actualAmount) {
      payoutExceptions.push({
        payoutId: payout._id,
        payoutNumber: payout.payoutNumber,
        expected: expectedAmount,
        actual: actualAmount,
        diff: expectedAmount - actualAmount,
      });
    }
  }

  // --- Reconciliation C: Refund Deductions ---
  // Processed refunds must equal the negative settlement deduction entry
  const processedRefunds = refunds.filter((r: any) => r.status === "processed");
  for (const refund of processedRefunds) {
    const originalAccrual = settlements.find(
      (s: any) => s.orderId === refund.orderId && s.type === "accrual"
    );
    const deduction = settlements.find(
      (s: any) => s.orderId === refund.orderId && s.type === "refund_deduction"
    );

    if (originalAccrual && (!deduction || deduction.amount !== -originalAccrual.amount)) {
      refundExceptions.push({
        refundId: refund._id,
        refundNumber: refund.refundNumber,
        orderId: refund.orderId,
        expectedDeduction: originalAccrual ? -originalAccrual.amount : 0,
        actualDeduction: deduction ? deduction.amount : 0,
      });
    }
  }

  // --- Reconciliation D: Platform-Wide Funds Reconciliation (P0) ---
  const capturedPaymentsSum = payments
    .filter((p: any) => ["captured", "refunded", "partially_refunded", "refund_pending"].includes(p.status))
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const refundsSum = refunds
    .filter((r: any) => r.status === "processed")
    .reduce((sum: number, r: any) => sum + r.amount, 0);

  const outstandingSettlementsSum = settlements
    .filter((s: any) => s.payoutId === undefined)
    .reduce((sum: number, s: any) => sum + s.amount, 0);

  const paidOutSettlementsSum = payouts
    .filter((p: any) => p.status === "success")
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const refundedOrderIds = new Set(
    orders.filter((o: any) => o.status === "refunded" || o.status === "cancelled").map((o: any) => o._id)
  );

  const platformRevenueSum = commissions
    .filter((c: any) => !refundedOrderIds.has(c.orderId))
    .reduce((sum: number, c: any) => sum + c.commissionAmount, 0);

  // Exclude delivery fees from merchant payout, so they are retained by the platform to pay for logistics.
  // To balance platform-wide funds reconciliation, delivery fees for active paid orders must be added to the right-hand side.
  const deliveryFeesSum = orders
    .filter((o: any) => o.paymentStatus === "paid" && !refundedOrderIds.has(o._id))
    .reduce((sum: number, o: any) => sum + o.deliveryFee, 0);

  const leftHandSide = capturedPaymentsSum - refundsSum;
  const rightHandSide = outstandingSettlementsSum + paidOutSettlementsSum + platformRevenueSum + deliveryFeesSum;

  const reconciliationDiff = leftHandSide - rightHandSide;
  const reconciliationPassed = reconciliationDiff === 0;

  const fundsExceptions = [];
  if (!reconciliationPassed) {
    fundsExceptions.push({
      expected: leftHandSide,
      actual: rightHandSide,
      diff: reconciliationDiff,
      notes: `Captured: ${capturedPaymentsSum}, Refunds: ${refundsSum}, Outstanding: ${outstandingSettlementsSum}, Paid Out: ${paidOutSettlementsSum}, Platform Revenue: ${platformRevenueSum}, Delivery Fees Retained: ${deliveryFeesSum}`,
    });
  }

  // --- Reconciliation E: Settlement Completeness Assertion (P0) ---
  const deliveredOrders = orders.filter((o: any) => o.status === "delivered");
  const missingSettlementExceptions = [];

  for (const order of deliveredOrders) {
    const hasAccrual = settlements.some(
      (s: any) => s.orderId === order._id && s.type === "accrual"
    );
    if (!hasAccrual) {
      missingSettlementExceptions.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        notes: "Delivered order is missing its accrual settlement record.",
      });
    }
  }

  const exceptionsCount =
    orderExceptions.length +
    payoutExceptions.length +
    refundExceptions.length +
    fundsExceptions.length +
    missingSettlementExceptions.length;

  return {
    exceptionsCount,
    missingSettlementExceptions,
    orderReconciliation: {
      totalChecked: paidOrders.length,
      exceptions: orderExceptions,
      passed: orderExceptions.length === 0,
    },
    payoutReconciliation: {
      totalChecked: successfulPayouts.length,
      exceptions: payoutExceptions,
      passed: payoutExceptions.length === 0,
    },
    refundReconciliation: {
      totalChecked: processedRefunds.length,
      exceptions: refundExceptions,
      passed: refundExceptions.length === 0,
    },
    fundsReconciliation: {
      totalChecked: 1,
      exceptions: fundsExceptions,
      passed: reconciliationPassed,
      capturedPayments: capturedPaymentsSum,
      refunds: refundsSum,
      outstandingSettlements: outstandingSettlementsSum,
      paidOutSettlements: paidOutSettlementsSum,
      platformRevenue: platformRevenueSum,
      deliveryFeesRetained: deliveryFeesSum,
      diff: reconciliationDiff,
    },
    reconciled: exceptionsCount === 0,
  };
}

/**
 * Perform platform-wide ledger reconciliation checks (accounting smoke test).
 */
export const runLedgerReconciliationAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await runReconciliationHelper(ctx.db);
  },
});

/**
 * Perform platform-wide ledger reconciliation checks and immediately raise system alerts on mismatch.
 */
export const reconcileFinanceLedgerAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const report = await runReconciliationHelper(ctx.db);

    if (report.missingSettlementExceptions && report.missingSettlementExceptions.length > 0) {
      await logSystemAlert(
        ctx,
        "finance.settlement_missing",
        `Critical: ${report.missingSettlementExceptions.length} delivered order(s) are missing settlement accrual records.`,
        "critical",
        { exceptions: report.missingSettlementExceptions }
      );
    }

    if (report.exceptionsCount > 0) {
      await logSystemAlert(
        ctx,
        "finance.reconciliation_failed",
        `Finance Reconciliation Failed: ${report.exceptionsCount} ledger mismatch exception(s) detected.`,
        "critical",
        {
          exceptionsCount: report.exceptionsCount,
          orderReconciliationPassed: report.orderReconciliation.passed,
          payoutReconciliationPassed: report.payoutReconciliation.passed,
          refundReconciliationPassed: report.refundReconciliation.passed,
        }
      );
    }
    return report;
  },
});

/**
 * Get aggregated regional economics dashboard metrics grouped by customer delivery locality.
 */
export const getRegionalEconomicsDashboardAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const orders = await ctx.db.query("orders").collect();
    const subsidies = await ctx.db.query("deliverySubsidyLedger").collect();

    const subsidyMap = new Map();
    for (const sub of subsidies) {
      subsidyMap.set(sub.orderId, sub);
    }

    const localityMap = new Map<string, {
      orderCount: number;
      gmvPaise: number;
      deliveryRevenuePaise: number;
      actualCourierCostPaise: number;
      contributionMarginPaise: number;
    }>();

    // Group only paid and active (non-cancelled) orders for economics mapping
    const paidOrders = orders.filter(
      (o) => o.paymentStatus === "paid" && o.status !== "cancelled"
    );

    for (const order of paidOrders) {
      const locality = order.deliveryAddress?.locality || "Unknown Locality";
      const subsidy = subsidyMap.get(order._id);

      const gmv = order.total; // in paise
      const deliveryRevenue = order.deliveryFee; // in paise
      const actualCourierCost = subsidy ? (subsidy.actualCourierCost ?? subsidy.actualPorterCost ?? 0) : 0; // in paise
      const commission = order.commissionAmount || 0; // in paise
      
      // Contribution Margin = Platform Commission + Delivery Fee - Actual Courier Cost
      const contributionMargin = commission + deliveryRevenue - actualCourierCost;

      if (!localityMap.has(locality)) {
        localityMap.set(locality, {
          orderCount: 0,
          gmvPaise: 0,
          deliveryRevenuePaise: 0,
          actualCourierCostPaise: 0,
          contributionMarginPaise: 0,
        });
      }

      const current = localityMap.get(locality)!;
      current.orderCount += 1;
      current.gmvPaise += gmv;
      current.deliveryRevenuePaise += deliveryRevenue;
      current.actualCourierCostPaise += actualCourierCost;
      current.contributionMarginPaise += contributionMargin;
    }

    const results = [];
    for (const [locality, data] of localityMap.entries()) {
      results.push({
        locality,
        orderCount: data.orderCount,
        gmv: formatMoney(data.gmvPaise),
        deliveryRevenue: formatMoney(data.deliveryRevenuePaise),
        actualCourierCost: formatMoney(data.actualCourierCostPaise),
        contributionMargin: formatMoney(data.contributionMarginPaise),
      });
    }

    // Sort by GMV descending
    results.sort((a, b) => b.gmv - a.gmv);

    return results;
  },
});

