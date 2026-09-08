// convex/lib/refunds.ts
// Putting a cancelled order's money back on its way to the customer.
//
// Every cancellation path used to write a status flag and stop there:
// `refundStatus: "pending"` on the seller-decline and SLA-sweep paths, nothing
// at all on the admin cancel, and — worst — `paymentStatus: "refunded"` on the
// RTO and lost-shipment paths, which told anyone reading the order that the
// customer had been paid back when no money had moved. Forty test orders sat
// that way for two months.
//
// The refund machinery itself was already correct and already in use by the
// returns flow: insert into `refundQueue`, and the drain cron calls Razorpay
// with `reverse_all` so the seller's held transfer is unwound and the customer
// refunded in one atomic call. `payments.enqueueRefund` even existed for
// exactly this, with no callers. Cancellations simply never reached it.
//
// This is a plain function rather than a mutation because Convex mutations
// cannot call other mutations, and every caller here is already inside one.

import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

/** Payment states where money has actually been taken and can be returned. */
const REFUNDABLE_PAYMENT_STATUSES = new Set(["captured", "partially_refunded"]);

export type RefundEnqueueResult =
  | { enqueued: true; refundQueueId: Id<"refundQueue">; amountPaise: number }
  | { enqueued: false; reason: string };

/**
 * Queue a full refund for an order that is being cancelled.
 *
 * Safe to call more than once: the idempotency key means a double-cancel, a
 * retried mutation or an overlapping sweep all resolve to the same single
 * refund. Orders that were never paid are a no-op rather than an error, since
 * cancelling an unpaid order is perfectly normal.
 *
 * The caller stays responsible for the order's own status fields — this only
 * owns the money.
 */
export async function enqueueCancellationRefund(
  ctx: any,
  args: {
    orderId: Id<"orders">;
    /** Human-readable, and carried into the Razorpay refund notes. */
    reason: string;
    /** Distinguishes cancellation causes so two different ones never collide. */
    idempotencySuffix: string;
  }
): Promise<RefundEnqueueResult> {
  const order = await ctx.db.get(args.orderId);
  if (!order) throw new ConvexError("Order not found");

  // Nothing was taken, so there is nothing to give back.
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "refund_requested") {
    return { enqueued: false, reason: `order_payment_status_${order.paymentStatus}` };
  }

  // Prefer the order's own pointer; fall back to the payments index for orders
  // written before that pointer was set.
  let payment = order.paymentId ? await ctx.db.get(order.paymentId) : null;
  if (!payment) {
    const candidates = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q: any) => q.eq("orderId", args.orderId))
      .collect();
    payment =
      candidates
        .filter((p: any) => REFUNDABLE_PAYMENT_STATUSES.has(p.status))
        .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null;
  }

  if (!payment) {
    // Loud, because an order marked paid with no payment record is a real
    // inconsistency that a person needs to look at.
    console.error(
      `[cancellationRefund] Order ${args.orderId} is marked paid but has no payment record — refund needs manual action.`
    );
    return { enqueued: false, reason: "no_payment_record" };
  }

  if (!REFUNDABLE_PAYMENT_STATUSES.has(payment.status)) {
    return { enqueued: false, reason: `payment_status_${payment.status}` };
  }

  const amountPaise = order.total ?? payment.amount ?? 0;
  if (amountPaise <= 0) {
    return { enqueued: false, reason: "zero_amount" };
  }

  const idempotencyKey = `cancel_refund_${args.orderId}_${args.idempotencySuffix}`;

  const existing = await ctx.db
    .query("refundQueue")
    .withIndex("by_idempotencyKey", (q: any) => q.eq("idempotencyKey", idempotencyKey))
    .first();

  if (existing) {
    return { enqueued: true, refundQueueId: existing._id, amountPaise: existing.amountPaise };
  }

  // A refund already queued for this order under a different cause — a return
  // that was in flight when the order got cancelled, say — means the customer
  // is already being paid back. Queuing a second one would refund them twice.
  const duplicate = (await ctx.db.query("refundQueue").order("desc").take(200)).find(
    (job: any) =>
      job.orderId === args.orderId &&
      (job.status === "pending" || job.status === "processing" || job.status === "completed")
  );
  if (duplicate) {
    return { enqueued: false, reason: `refund_already_${duplicate.status}` };
  }

  const refundQueueId = await ctx.db.insert("refundQueue", {
    paymentId: payment._id,
    orderId: args.orderId,
    reason: args.reason,
    amountPaise,
    status: "pending",
    idempotencyKey,
    createdAt: Date.now(),
  });

  return { enqueued: true, refundQueueId, amountPaise };
}

/**
 * Cancel an order's money: queue the customer's refund and mark the order so
 * the state is readable while the queue drains.
 *
 * `refundStatus` stays "pending" until the drain cron reports back, which is
 * what it always meant — the difference is that something now actually acts on
 * it. `paymentStatus` is deliberately NOT set to "refunded" here: that is the
 * mistake the RTO and lost-shipment paths made, and it is only true once
 * Razorpay has confirmed the refund.
 */
export async function refundCancelledOrder(
  ctx: any,
  args: {
    orderId: Id<"orders">;
    reason: string;
    idempotencySuffix: string;
  }
): Promise<RefundEnqueueResult> {
  const result = await enqueueCancellationRefund(ctx, args);

  if (result.enqueued) {
    await ctx.db.patch(args.orderId, {
      refundStatus: "pending",
      // The seller is not getting paid for an order that never happened. The
      // transfer itself is unwound by `reverse_all` when the refund fires.
      payoutStatus: "not_eligible",
      payoutHoldReason: "order_cancelled",
      updatedAt: Date.now(),
    });
  }

  return result;
}
