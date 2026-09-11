// convex/returnInspection.ts
// Accepting or rejecting a returned item once it is back at the boutique.
//
// The customer's refund — or their exchange credit — used to go out the moment
// Porter dropped the item off, before anyone had looked at what came back. Now
// it waits. The seller checks the item and accepts or rejects it; admin can
// accept at any point and decides every rejection. Until someone acts, the
// money stays where it is.

import { mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireRole, getMyBoutique, getCurrentUserOrNull } from "./lib/auth";
import {
  canSellerDecide,
  canAdminAccept,
  canAdminResolveRejection,
  settlementFlowFor,
} from "./lib/returnInspection";
import { cancelAccrualForReversal, recordRoutePayoutInLedger } from "./lib/routeLedger";

/** Pay out an accepted return: exchange credit, or a full cash refund. */
async function settleAcceptedReturn(ctx: any, order: any): Promise<"coupon" | "refund" | "none"> {
  const exchange = await ctx.db
    .query("exchangeRequests")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
    .first();

  const flow = settlementFlowFor(exchange);
  if (flow === "coupon") {
    await ctx.scheduler.runAfter(0, internal.exchanges.completeExchange, {
      exchangeId: exchange._id,
    });
  } else if (flow === "refund") {
    // Refunds the full order total and reverses the seller's held transfer in
    // one Razorpay call.
    await ctx.scheduler.runAfter(0, internal.returns.completeReturnRefund, {
      orderId: order._id,
    });
  }
  return flow;
}

async function audit(ctx: any, order: any, action: string, actorRole: string, metadata: object) {
  await ctx.db.insert("auditLogs", {
    actorRole,
    action,
    entityType: "orders",
    entityId: order._id,
    metadata: JSON.stringify({ orderNumber: order.orderNumber, ...metadata }),
    createdAt: Date.now(),
  });
}

async function loadSellerOrder(ctx: any, orderId: any, token?: string) {
  const boutique = await getMyBoutique(ctx, token);
  if (!boutique) throw new ConvexError("No boutique associated with this account.");
  const order = await ctx.db.get(orderId);
  if (!order) throw new ConvexError("Order not found.");
  if (order.boutiqueId !== boutique._id) {
    throw new ConvexError("This order belongs to a different boutique.");
  }
  return { boutique, order };
}

/** The seller has checked the item and it is fine: refund or credit the customer. */
export const acceptReturnedItemAsSeller = mutation({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { boutique, order } = await loadSellerOrder(ctx, args.orderId, args.token);
    const gate = canSellerDecide(order);
    if (!gate.ok) throw new ConvexError(gate.message);

    const now = Date.now();
    await ctx.db.patch(order._id, {
      returnInspection: {
        decision: "accepted",
        byRole: "seller",
        byName: boutique.boutiqueName ?? undefined,
        at: now,
      },
      updatedAt: now,
    });

    const flow = await settleAcceptedReturn(ctx, order);
    await audit(ctx, order, "return.accepted_by_seller", "boutique", { flow });
    return { success: true, flow };
  },
});

/**
 * The seller has a problem with what came back. No money moves — the return
 * goes to Hive admin, who decides whether the customer is refunded.
 */
export const rejectReturnedItemAsSeller = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reason = args.reason.trim();
    if (!reason) {
      throw new ConvexError("Tell Hive what is wrong with the item so admin can decide.");
    }

    const { boutique, order } = await loadSellerOrder(ctx, args.orderId, args.token);
    const gate = canSellerDecide(order);
    if (!gate.ok) throw new ConvexError(gate.message);

    const now = Date.now();
    await ctx.db.patch(order._id, {
      returnInspection: {
        decision: "rejected",
        byRole: "seller",
        byName: boutique.boutiqueName ?? undefined,
        at: now,
        reason,
      },
      updatedAt: now,
    });

    await audit(ctx, order, "return.rejected_by_seller", "boutique", { reason });
    return { success: true };
  },
});

/**
 * Admin accepts the returned item — a fresh return, or one the seller rejected
 * where admin has decided the customer is refunded after all.
 */
export const acceptReturnedItemAdmin = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found.");
    const gate = canAdminAccept(order);
    if (!gate.ok) throw new ConvexError(gate.message);

    const now = Date.now();
    const existing = order.returnInspection;
    await ctx.db.patch(order._id, {
      returnInspection:
        existing?.decision === "rejected"
          ? {
              ...existing,
              resolution: "refunded",
              resolvedAt: now,
              resolvedByUserId: admin._id,
            }
          : {
              decision: "accepted",
              byRole: "admin",
              byUserId: admin._id,
              at: now,
            },
      updatedAt: now,
    });

    const flow = await settleAcceptedReturn(ctx, order);
    await audit(ctx, order, "return.accepted_by_admin", "admin", {
      overrodeSellerRejection: existing?.decision === "rejected",
      flow,
    });
    return { success: true, flow };
  },
});

/**
 * Admin decides a return the seller rejected.
 *
 * "refund" pays the customer exactly as an acceptance would. "no_refund" keeps
 * the customer's money with the seller: the return is closed, any exchange is
 * refused, and the seller's held payout is released to them — they have the
 * item back and are paid for the sale.
 */
export const resolveRejectedReturnAdmin = mutation({
  args: {
    orderId: v.id("orders"),
    decision: v.union(v.literal("refund"), v.literal("no_refund")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found.");
    const gate = canAdminResolveRejection(order);
    if (!gate.ok) throw new ConvexError(gate.message);

    const now = Date.now();
    const note = args.note?.trim() || undefined;
    const resolved = {
      ...order.returnInspection!,
      resolution: args.decision === "refund" ? ("refunded" as const) : ("no_refund" as const),
      resolvedAt: now,
      resolvedByUserId: admin._id,
      resolutionNote: note,
    };

    if (args.decision === "refund") {
      await ctx.db.patch(order._id, { returnInspection: resolved, updatedAt: now });
      const flow = await settleAcceptedReturn(ctx, order);
      await audit(ctx, order, "return.rejection_overruled", "admin", { flow, note });
      return { success: true, outcome: "refunded", flow };
    }

    await ctx.db.patch(order._id, {
      returnInspection: resolved,
      returnStatus: "cancelled",
      updatedAt: now,
    });

    const exchange = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .first();
    if (exchange && exchange.status === "accepted") {
      await ctx.db.patch(exchange._id, {
        status: "rejected",
        rejectionReason: note ?? "The returned item was not accepted after inspection.",
        updatedAt: now,
      });
    }

    if (order.razorpayTransferId) {
      await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
        orderId: order._id,
        onHold: false,
        reason: "return_rejected_no_refund",
      });
    }

    await audit(ctx, order, "return.rejection_upheld", "admin", { note });
    return { success: true, outcome: "no_refund" };
  },
});

/**
 * A seller's transfer has been reversed by Razorpay (an exchange took the money
 * back). Actions cannot write the database, so the reversal action calls this.
 */
export const cancelRouteAccrualInternal = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { transferStatus: "reversed", updatedAt: Date.now() });
    return await cancelAccrualForReversal(ctx, args.orderId);
  },
});

/**
 * One-off repair for orders settled before the ledger followed Route: close
 * accruals whose payout Route already released, cancel accruals whose transfer
 * was reversed, and stop reversed payouts reading as still withheld.
 *
 * Idempotent, so running it twice changes nothing the second time.
 */
export const backfillRouteLedgerInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const report = { recorded: [] as string[], cancelled: [] as string[], relabelled: [] as string[] };

    for (const order of orders) {
      if (order.razorpayTransferId && order.payoutStatus === "paid" && order.transferStatus !== "reversed") {
        const result = await recordRoutePayoutInLedger(
          ctx,
          order._id,
          order.payoutProcessedAt ?? order.updatedAt ?? Date.now()
        );
        if (result.changed) report.recorded.push(order.orderNumber);
      }

      if (order.transferStatus === "reversed") {
        const result = await cancelAccrualForReversal(ctx, order._id);
        if (result.changed) report.cancelled.push(order.orderNumber);

        if (order.payoutStatus === "withheld") {
          await ctx.db.patch(order._id, {
            payoutStatus: "not_eligible",
            payoutHoldReason: "reversed_refunded",
            payoutHoldUntil: undefined,
            updatedAt: Date.now(),
          });
          report.relabelled.push(order.orderNumber);
        }
      }
    }

    return report;
  },
});
