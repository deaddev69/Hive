// convex/returns.ts
// Return flow completion: the customer gets their money back.
//
// Returns and exchanges share the same Porter leg (customer -> seller) and the
// same money unwind (reverse the seller's held Route transfer). They differ
// only in the ending: a return refunds cash, an exchange issues a coupon.
//
// The existing request/approve/initiate steps live in convex/adminOrders.ts
// (`approveReturnAdmin`, `initiateReturnAdmin`). This module owns the terminal
// step those flows were missing.

import { mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthenticatedUser, requireRole } from "./lib/auth";
import { RETURN_WINDOW_MS } from "./lib/payoutHold";

/**
 * Customer asks to return a delivered order.
 *
 * Until now this step existed only as a WhatsApp deep link, so nothing was ever
 * recorded — `returnStatus: "requested"` was in the schema but never written,
 * and admins approved returns that had no request behind them. This records it.
 */
export const requestReturn = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const now = Date.now();

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    if (order.customerId !== user._id) {
      throw new ConvexError("This order belongs to a different account.");
    }
    if (order.status !== "delivered") {
      throw new ConvexError("A return can only be requested after the order is delivered.");
    }
    if (order.returnsAccepted === false) {
      throw new ConvexError(
        "This was a Final Sale order. Contact Hive support if the item arrived damaged or incorrect."
      );
    }
    if (order.returnStatus) {
      return { success: true, reason: "already_requested", returnStatus: order.returnStatus };
    }

    const existingExchange = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();
    if (existingExchange && ["pending", "accepted", "completed"].includes(existingExchange.status)) {
      throw new ConvexError("An exchange is already in progress for this order.");
    }

    // Window runs from delivery, matching the seller's payout hold so the two
    // can never disagree: money stays frozen for exactly as long as the
    // customer can still act on the order.
    const windowOpensFrom = order.deliveredAt ?? order.updatedAt;
    const windowClosesAt = windowOpensFrom + RETURN_WINDOW_MS;
    if (now > windowClosesAt) {
      throw new ConvexError("The 24-hour return window for this order has closed.");
    }

    await ctx.db.patch(args.orderId, {
      returnStatus: "requested",
      updatedAt: now,
    });

    // Freeze the seller's payout while the return is live, so it cannot settle
    // out from under a return that is about to be approved.
    await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
      orderId: args.orderId,
      onHold: true,
      reason: "return_in_progress",
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      actorRole: "system",
      action: "return.requested",
      entityType: "orders",
      entityId: args.orderId,
      metadata: JSON.stringify({ reason: args.reason, orderNumber: order.orderNumber }),
      createdAt: now,
    });

    return { success: true, returnStatus: "requested" };
  },
});

/**
 * Admin sets the return leg's status by hand.
 *
 * Mirrors the order-status dropdown in the admin order drawer. The Porter
 * webhook drives this automatically when a rider is involved, but returns and
 * exchanges are often handled off-platform — the customer drops the item back,
 * or the boutique collects it — and this is also what makes the flow testable
 * end to end without dispatching a real rider.
 *
 * Setting "delivered" settles whichever flow the order belongs to: an accepted
 * exchange issues its coupon, anything else refunds cash.
 */
export const updateReturnStatusAdmin = mutation({
  args: {
    orderId: v.id("orders"),
    returnStatus: v.union(
      v.literal("requested"),
      v.literal("approved"),
      v.literal("initiated"),
      v.literal("picked_up"),
      v.literal("in_transit"),
      v.literal("delivered"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    const previous = order.returnStatus ?? "none";

    await ctx.db.patch(args.orderId, {
      returnStatus: args.returnStatus,
      updatedAt: now,
    });

    // Keep the payout frozen for as long as the item is in motion, and let it
    // settle again if the return is abandoned.
    if (["requested", "approved", "initiated", "picked_up", "in_transit"].includes(args.returnStatus)) {
      await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
        orderId: args.orderId,
        onHold: true,
        reason: "return_in_progress",
      });
    } else if (args.returnStatus === "cancelled" || args.returnStatus === "failed") {
      await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
        orderId: args.orderId,
        onHold: false,
        reason: `return_${args.returnStatus}`,
      });
    }

    // "delivered" means the seller has it back — settle the right flow.
    if (args.returnStatus === "delivered") {
      const exchange = await ctx.db
        .query("exchangeRequests")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .first();

      if (exchange && exchange.status === "accepted") {
        await ctx.scheduler.runAfter(0, internal.exchanges.completeExchange, {
          exchangeId: exchange._id,
        });
      } else if (!exchange || exchange.status !== "completed") {
        await ctx.scheduler.runAfter(0, internal.returns.completeReturnRefund, {
          orderId: args.orderId,
        });
      }
    }

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "return.status_set_manually",
      entityType: "orders",
      entityId: args.orderId,
      metadata: JSON.stringify({
        orderNumber: order.orderNumber,
        from: previous,
        to: args.returnStatus,
      }),
      createdAt: now,
    });

    return { success: true, from: previous, to: args.returnStatus };
  },
});

/**
 * Terminal step of a cash return: the item is back with the seller, so unwind
 * their payout and refund the customer.
 *
 * Both happen in one Razorpay call. The refund carries `reverse_all`, which
 * reverses the seller's transfer and refunds the customer atomically. An
 * earlier version did these as two independent steps and a live return failed
 * because the refund cron fired before the reversal had settled — Razorpay
 * rejected it, since the seller's share was not refundable from our account.
 *
 * Idempotent: a duplicate Porter `delivered` webhook cannot refund twice, both
 * because of the status guard here and the idempotency key on the refund queue.
 */
export const completeReturnRefund = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    if (order.returnStatus === "completed") {
      return { success: true, reason: "already_completed" };
    }
    if (order.returnStatus !== "delivered") {
      return { success: false, reason: `return_status_${order.returnStatus ?? "none"}` };
    }

    // The refund itself unwinds the seller's transfer, via `reverse_all` in
    // processRefundQueue. Reversing separately here first would race with the
    // refund cron: if the refund fires before the reversal settles, Razorpay
    // rejects it because the seller's share is not refundable from our account.
    // That is exactly how a live return failed, so the two steps are now one
    // atomic Razorpay call instead of two independent ones.
    //
    // Refund through the existing queue, so this inherits the drain cron, the
    // retry behaviour, and a real Razorpay refund id.
    if (order.paymentId) {
      const idempotencyKey = `return_refund_${args.orderId}`;
      const existing = await ctx.db
        .query("refundQueue")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
        .first();

      if (!existing) {
        await ctx.db.insert("refundQueue", {
          paymentId: order.paymentId,
          orderId: args.orderId,
          reason: `Return completed for order ${order.orderNumber}`,
          amountPaise: order.total,
          status: "pending",
          idempotencyKey,
          createdAt: now,
        });
      }
    } else {
      console.error(
        `[completeReturnRefund] Order ${args.orderId} has no payment to refund against — manual action needed.`
      );
    }

    await ctx.db.patch(args.orderId, {
      returnStatus: "completed",
      returnCompletedAt: now,
      paymentStatus: "refunded",
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorRole: "system",
      action: "return.completed",
      entityType: "orders",
      entityId: args.orderId,
      metadata: JSON.stringify({
        orderNumber: order.orderNumber,
        refundAmountPaise: order.total,
        boutiqueId: order.boutiqueId,
      }),
      createdAt: now,
    });

    return { success: true, refundAmountPaise: order.total };
  },
});
