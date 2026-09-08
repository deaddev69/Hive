// convex/orderFinancials.ts
// One order's money and logistics trail, gathered for the admin drawer.
//
// Every value here already existed — on the payment record, on the order's
// Route mirror fields, on the shipment, in the pricing snapshot — but it was
// spread across four tables and none of it was rendered anywhere. When a
// customer says "I paid and nothing happened", or a seller asks "where is my
// money", the answer needed a Convex query typed by hand. This gathers it.
//
// Nothing here calls Razorpay or Porter. The Route hold fields are the mirror
// Hive keeps of what it last told Razorpay, so the panel is readable even when
// those APIs are down, and it never costs an API call to open an order.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/** What the customer paid, split the way the money actually moves. */
function buildMoneySplit(order: any) {
  const snapshot = order.pricingSnapshot ?? null;
  const settlement = (order as any).orderSnapshot ?? null;

  if (snapshot) {
    // Hive's own revenue on this order: the fees, plus GST collected on them.
    const platformRevenuePaise =
      snapshot.handlingChargePaise +
      snapshot.platformFeePaise +
      snapshot.platformChargesGstPaise;

    return {
      source: "pricingSnapshot" as const,
      productSubtotalPaise: snapshot.productSubtotalPaise,
      handlingChargePaise: snapshot.handlingChargePaise,
      platformFeePaise: snapshot.platformFeePaise,
      platformChargesGstPaise: snapshot.platformChargesGstPaise,
      deliveryFeePaise: snapshot.deliveryFeePaise,
      discountPaise: snapshot.discountPaise,
      totalPayablePaise: snapshot.totalPayablePaise,
      sellerCommissionPercent: snapshot.sellerCommissionPercent,
      sellerCommissionPaise: snapshot.sellerCommissionPaise,
      sellerCommissionGstPaise: snapshot.sellerCommissionGstPaise,
      sellerPayoutPaise: snapshot.sellerPayoutPaise,
      platformRevenuePaise,
      sellerTierName: snapshot.sellerTierName ?? null,
    };
  }

  // Legacy orders predate the pricing snapshot; fall back to the settlement
  // figures so the panel still shows something true rather than nothing.
  return {
    source: settlement ? ("settlementSnapshot" as const) : ("order" as const),
    productSubtotalPaise: order.subtotal ?? 0,
    handlingChargePaise: null,
    platformFeePaise: null,
    platformChargesGstPaise: null,
    deliveryFeePaise: order.deliveryFee ?? 0,
    discountPaise: order.discount ?? 0,
    totalPayablePaise: order.total ?? 0,
    sellerCommissionPercent: settlement?.platformCommissionRate ?? null,
    sellerCommissionPaise: settlement?.commissionAmount ?? null,
    sellerCommissionGstPaise: settlement?.gstAmount ?? null,
    sellerPayoutPaise: settlement?.merchantPayable ?? null,
    platformRevenuePaise: null,
    sellerTierName: null,
  };
}

/**
 * Payment, Route settlement, refund and courier state for one order.
 *
 * Admin-only: it exposes Razorpay identifiers and the seller's payout position,
 * neither of which belongs on a seller or customer surface.
 */
export const getOrderFinancialsAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    // The payment record. Orders normally have exactly one; take the newest if
    // a retry ever produced more, since that is the one that captured.
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();
    const payment =
      payments.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null;

    // Anything queued for refund against this order, including failed attempts
    // that need a retry — the queue is the only place a failure is recorded.
    const refundJobs = (await ctx.db.query("refundQueue").order("desc").take(200))
      .filter(
        (job) =>
          job.orderId === args.orderId ||
          (payment && job.paymentId === payment._id)
      )
      .map((job) => ({
        _id: job._id,
        status: job.status,
        amountPaise: job.amountPaise,
        reason: job.reason,
        lastError: job.lastError ?? null,
        createdAt: job.createdAt,
        processedAt: job.processedAt ?? null,
      }));

    const shipment = order.shipmentId ? await ctx.db.get(order.shipmentId) : null;
    const returnShipment = order.returnShipmentId
      ? await ctx.db.get(order.returnShipmentId)
      : null;

    const coupon = order.couponId ? await ctx.db.get(order.couponId) : null;

    // A boutique cannot be paid through Route until it has a linked account.
    const boutique = await ctx.db.get(order.boutiqueId);
    const linkedAccountId = (boutique as any)?.razorpayAccountId ?? null;
    const linkedAccountStatus = (boutique as any)?.razorpayAccountStatus ?? null;

    return {
      orderNumber: order.orderNumber,

      // ── Razorpay: what the customer paid ────────────────────────────────
      payment: payment
        ? {
            razorpayOrderId: payment.razorpayOrderId ?? null,
            razorpayPaymentId: payment.razorpayPaymentId ?? null,
            status: payment.status,
            method: payment.method ?? null,
            amountPaise: payment.amount,
            currency: payment.currency,
            refundId: payment.refundId ?? null,
            refundAmountPaise: payment.refundAmount ?? null,
            refundedAt: payment.refundedAt ?? null,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            webhookEvents: payment.webhookEvents.map((e: any) => ({
              event: e.event,
              timestamp: e.timestamp,
            })),
          }
        : null,
      // The order's own view, which is what the rest of Hive gates on. A
      // disagreement with `payment.status` is itself the finding.
      orderPaymentStatus: order.paymentStatus,

      // ── Route: where the money went ─────────────────────────────────────
      route: {
        transferId: order.razorpayTransferId ?? payment?.razorpayTransferId ?? null,
        transferStatus: order.transferStatus ?? null,
        linkedAccountId,
        linkedAccountStatus,
        payoutStatus: order.payoutStatus ?? null,
        payoutEligibleAt: order.payoutEligibleAt ?? null,
        // Undefined while withheld means an indefinite hold: a return or an
        // unredeemed exchange coupon is keeping it open.
        payoutHoldUntil: order.payoutHoldUntil ?? null,
        payoutHoldReason: order.payoutHoldReason ?? null,
        payoutProcessedAt: order.payoutProcessedAt ?? null,
        payoutFailureReason: order.payoutFailureReason ?? null,
        // Set only for payouts settled manually by bank transfer.
        manualSettlement: order.payoutDetails ?? null,
      },

      // ── Refunds ─────────────────────────────────────────────────────────
      refund: {
        orderRefundStatus: order.refundStatus ?? null,
        returnStatus: order.returnStatus ?? null,
        returnCompletedAt: order.returnCompletedAt ?? null,
        jobs: refundJobs,
      },

      // ── Coupon funding, when an exchange paid for part of this order ────
      coupon: coupon
        ? {
            code: (coupon as any).code ?? null,
            appliedPaise: order.couponAppliedPaise ?? null,
            valuePaise: (coupon as any).amountPaise ?? null,
            status: (coupon as any).status ?? null,
          }
        : null,

      // ── Porter ──────────────────────────────────────────────────────────
      courier: shipment
        ? {
            provider: (shipment as any).provider ?? null,
            crn: (shipment as any).awbNumber || null,
            status: (shipment as any).status ?? null,
            trackingUrl: (shipment as any).trackingUrl ?? null,
            driverName: (shipment as any).driverName ?? null,
            driverPhone: (shipment as any).driverPhone ?? null,
            vehiclePlate: (shipment as any).vehiclePlate ?? null,
            pickedUpAt: (shipment as any).pickedUpAt ?? null,
            deliveredAt: (shipment as any).deliveredAt ?? null,
            lastWebhookAt: (shipment as any).lastWebhookAt ?? null,
          }
        : null,
      returnCourier: returnShipment
        ? {
            crn: (returnShipment as any).awbNumber || null,
            status: (returnShipment as any).status ?? null,
            trackingUrl: (returnShipment as any).trackingUrl ?? null,
            pickedUpAt: (returnShipment as any).pickedUpAt ?? null,
            deliveredAt: (returnShipment as any).deliveredAt ?? null,
          }
        : null,

      // ── The split ───────────────────────────────────────────────────────
      money: buildMoneySplit(order),
      estimatedCourierCostPaise:
        (order as any).orderSnapshot?.courierQuote?.estimatedCourierCost ??
        (order as any).orderSnapshot?.courierQuote?.estimatedPorterCost ??
        null,
      actualCourierCostPaise: (order as any).orderSnapshot?.actualCourierCost ?? null,
    };
  },
});
