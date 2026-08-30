// convex/coupons.ts
// Exchange store credit: issuance, validation, redemption bookkeeping,
// expiry, revocation, and the admin views over all of it.
//
// Money model (see convex/lib/coupons.ts for the full note): a coupon is a
// Hive-side credit. By the time one exists, the original order's Route transfer
// has already been reversed, so the customer's money is sitting in Hive's own
// balance — redeeming a coupon never touches the seller's old transfer.

import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireRole, getAuthenticatedUser } from "./lib/auth";
import {
  COUPON_VALIDITY_MS,
  generateCouponCode,
  resolveCouponRedemption,
  validateCouponForCart,
} from "./lib/coupons";

// ─── Issuance ────────────────────────────────────────────────────────────────

/**
 * Issue an exchange coupon. Called when an exchange completes — the item is
 * back with the seller and their held transfer has been reversed.
 *
 * Idempotent on the source exchange: a duplicate Porter webhook cannot mint a
 * second coupon for the same exchange.
 */
export const issueExchangeCoupon = internalMutation({
  args: {
    orderId: v.id("orders"),
    exchangeRequestId: v.optional(v.id("exchangeRequests")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_sourceOrderId", (q) => q.eq("sourceOrderId", args.orderId))
      .first();
    if (existing) {
      return { success: true, reason: "already_issued", couponId: existing._id, code: existing.code };
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    // The coupon is worth what the customer actually paid — the order total,
    // post-discount, including delivery and platform fees.
    const amountPaise = order.total;
    if (!amountPaise || amountPaise <= 0) {
      return { success: false, reason: "zero_amount" };
    }

    // Codes are short enough to collide in principle; retry on the unique index.
    let code = generateCouponCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!clash) break;
      code = generateCouponCode();
    }

    const couponId = await ctx.db.insert("coupons", {
      code,
      customerId: order.customerId,
      boutiqueId: order.boutiqueId,
      amountPaise,
      status: "active",
      sourceOrderId: args.orderId,
      sourceExchangeId: args.exchangeRequestId,
      heldTransferId: (order as any).razorpayTransferId,
      expiresAt: now + COUPON_VALIDITY_MS,
      createdAt: now,
      updatedAt: now,
    });

    if (args.exchangeRequestId) {
      await ctx.db.patch(args.exchangeRequestId, {
        couponId,
        status: "completed",
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      actorRole: "system",
      action: "coupon.issued",
      entityType: "coupons",
      entityId: couponId,
      metadata: JSON.stringify({
        code,
        amountPaise,
        orderId: args.orderId,
        boutiqueId: order.boutiqueId,
        expiresAt: now + COUPON_VALIDITY_MS,
      }),
      createdAt: now,
    });

    return { success: true, couponId, code, amountPaise };
  },
});

// ─── Customer-facing validation ──────────────────────────────────────────────

/**
 * Check a coupon against the caller's cart. Scope is the load-bearing rule:
 * a coupon is redeemable only at the boutique that issued it.
 */
export const validateCouponCode = query({
  args: {
    code: v.string(),
    boutiqueIds: v.array(v.id("boutiques")),
    cartTotalPaise: v.optional(v.number()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);

    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .first();

    if (!coupon) {
      return { valid: false as const, reason: "not_found", message: "That coupon code isn't valid." };
    }

    const verdict = validateCouponForCart(
      {
        status: coupon.status,
        boutiqueId: coupon.boutiqueId,
        customerId: coupon.customerId,
        expiresAt: coupon.expiresAt,
      },
      { customerId: user._id, boutiqueIds: args.boutiqueIds },
      Date.now()
    );

    if (!verdict.valid) {
      return { valid: false as const, reason: verdict.reason, message: verdict.message };
    }

    const split =
      args.cartTotalPaise !== undefined
        ? resolveCouponRedemption(coupon.amountPaise, args.cartTotalPaise)
        : undefined;

    return {
      valid: true as const,
      couponId: coupon._id,
      code: coupon.code,
      amountPaise: coupon.amountPaise,
      boutiqueId: coupon.boutiqueId,
      expiresAt: coupon.expiresAt,
      split,
    };
  },
});

/** Coupons belonging to the signed-in customer, newest first. */
export const listMyCoupons = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const now = Date.now();

    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_customerId_status", (q) => q.eq("customerId", user._id))
      .collect();

    return await Promise.all(
      coupons
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (c) => {
          const boutique = await ctx.db.get(c.boutiqueId);
          return {
            _id: c._id,
            code: c.code,
            amountPaise: c.amountPaise,
            status: c.expiresAt <= now && c.status === "active" ? "expired" : c.status,
            boutiqueId: c.boutiqueId,
            boutiqueName: boutique?.boutiqueName || boutique?.name || "Boutique",
            expiresAt: c.expiresAt,
            createdAt: c.createdAt,
          };
        })
    );
  },
});

// ─── Redemption bookkeeping ──────────────────────────────────────────────────

/**
 * Mark a coupon consumed and write the money receipt.
 *
 * Guarded on status so a retry cannot consume a coupon twice, and so two
 * concurrent checkouts cannot both spend the same credit.
 */
export const consumeCoupon = internalMutation({
  args: {
    couponId: v.id("coupons"),
    orderId: v.id("orders"),
    newOrderTotalPaise: v.number(),
    customerPaidPaise: v.number(),
    razorpayRefundId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) throw new ConvexError("Coupon not found");

    if (coupon.status !== "active") {
      // Single-use enforcement, server side.
      return { success: false, reason: `coupon_${coupon.status}` };
    }
    if (coupon.expiresAt <= now) {
      return { success: false, reason: "coupon_expired" };
    }

    const split = resolveCouponRedemption(coupon.amountPaise, args.newOrderTotalPaise);

    await ctx.db.patch(args.couponId, {
      status: "used",
      usedOnOrderId: args.orderId,
      usedAt: now,
      updatedAt: now,
    });

    const redemptionId = await ctx.db.insert("couponRedemptions", {
      couponId: args.couponId,
      orderId: args.orderId,
      customerId: coupon.customerId,
      boutiqueId: coupon.boutiqueId,
      redemptionCase: split.redemptionCase,
      couponAmountPaise: coupon.amountPaise,
      newOrderTotalPaise: args.newOrderTotalPaise,
      customerPaidPaise: args.customerPaidPaise,
      // Filled in by the settlement step once the seller's transfer is created.
      releasedToSellerPaise: 0,
      refundedToCustomerPaise: split.refundToCustomerPaise,
      razorpayRefundId: args.razorpayRefundId,
      settlementStatus: split.refundToCustomerPaise > 0 ? "pending" : "settled",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorRole: "system",
      action: "coupon.redeemed",
      entityType: "coupons",
      entityId: args.couponId,
      metadata: JSON.stringify({
        code: coupon.code,
        orderId: args.orderId,
        case: split.redemptionCase,
        couponAmountPaise: coupon.amountPaise,
        newOrderTotalPaise: args.newOrderTotalPaise,
        refundToCustomerPaise: split.refundToCustomerPaise,
      }),
      createdAt: now,
    });

    return { success: true, redemptionId, split };
  },
});

/**
 * Consume a coupon against a freshly created order, in the same transaction as
 * the order itself.
 *
 * Convex mutations cannot call other mutations, so this is a plain helper that
 * both order-creation paths (direct verify, and the Razorpay webhook) call.
 *
 * Case B remainder is refunded here rather than left on the coupon: the credit
 * is single-use, so anything unspent goes back as cash.
 */
export async function applyCouponToOrder(
  ctx: any,
  session: {
    couponId?: Id<"coupons">;
    couponAppliedPaise?: number;
    total: number;
  },
  orderId: Id<"orders">,
  customerPaidPaise: number,
  now: number
): Promise<{ applied: boolean; reason?: string }> {
  if (!session.couponId) return { applied: false, reason: "no_coupon" };

  const coupon = await ctx.db.get(session.couponId);
  if (!coupon) return { applied: false, reason: "coupon_missing" };

  // Re-check at consumption time: the coupon may have expired or been spent on
  // another order between checkout starting and payment landing.
  if (coupon.status !== "active" || coupon.expiresAt <= now) {
    console.error(
      `[applyCouponToOrder] Coupon ${coupon.code} was ${coupon.status} at consumption for order ${orderId}.`
    );
    return { applied: false, reason: `coupon_${coupon.status}` };
  }

  const split = resolveCouponRedemption(coupon.amountPaise, session.total);

  await ctx.db.patch(session.couponId, {
    status: "used",
    usedOnOrderId: orderId,
    usedAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(orderId, {
    couponId: session.couponId,
    couponAppliedPaise: split.couponAppliedPaise,
    updatedAt: now,
  });

  const redemptionId = await ctx.db.insert("couponRedemptions", {
    couponId: session.couponId,
    orderId,
    customerId: coupon.customerId,
    boutiqueId: coupon.boutiqueId,
    redemptionCase: split.redemptionCase,
    couponAmountPaise: coupon.amountPaise,
    newOrderTotalPaise: session.total,
    customerPaidPaise,
    releasedToSellerPaise: 0,
    refundedToCustomerPaise: split.refundToCustomerPaise,
    settlementStatus: split.refundToCustomerPaise > 0 ? "pending" : "settled",
    createdAt: now,
    updatedAt: now,
  });

  // Case B: the new order was cheaper than the credit. Return the difference in
  // cash through the existing refund queue.
  if (split.refundToCustomerPaise > 0) {
    const sourceOrder = await ctx.db.get(coupon.sourceOrderId);
    if (sourceOrder?.paymentId) {
      const idempotencyKey = `coupon_remainder_${session.couponId}`;
      const existing = await ctx.db
        .query("refundQueue")
        .withIndex("by_idempotencyKey", (q: any) => q.eq("idempotencyKey", idempotencyKey))
        .first();
      if (!existing) {
        await ctx.db.insert("refundQueue", {
          paymentId: sourceOrder.paymentId,
          orderId: coupon.sourceOrderId,
          reason: `Unused remainder of exchange coupon ${coupon.code}`,
          amountPaise: split.refundToCustomerPaise,
          status: "pending",
          idempotencyKey,
          createdAt: now,
        });
      }
    } else {
      await ctx.db.patch(redemptionId, {
        settlementStatus: "recovery_required",
        failureReason: "Source order has no payment to refund the remainder against",
        updatedAt: now,
      });
    }
  }

  await ctx.db.insert("auditLogs", {
    actorRole: "system",
    action: "coupon.redeemed",
    entityType: "coupons",
    entityId: session.couponId,
    metadata: JSON.stringify({
      code: coupon.code,
      orderId,
      case: split.redemptionCase,
      couponAmountPaise: coupon.amountPaise,
      newOrderTotalPaise: session.total,
      customerPaidPaise,
      refundToCustomerPaise: split.refundToCustomerPaise,
    }),
    createdAt: now,
  });

  return { applied: true };
}

/** Record the outcome of a redemption's money movement. */
export const patchRedemptionSettlement = internalMutation({
  args: {
    redemptionId: v.id("couponRedemptions"),
    settlementStatus: v.union(
      v.literal("pending"),
      v.literal("settled"),
      v.literal("recovery_required")
    ),
    releasedToSellerPaise: v.optional(v.number()),
    razorpayRefundId: v.optional(v.string()),
    razorpayTransferId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = { settlementStatus: args.settlementStatus, updatedAt: Date.now() };
    if (args.releasedToSellerPaise !== undefined) patch.releasedToSellerPaise = args.releasedToSellerPaise;
    if (args.razorpayRefundId !== undefined) patch.razorpayRefundId = args.razorpayRefundId;
    if (args.razorpayTransferId !== undefined) patch.razorpayTransferId = args.razorpayTransferId;
    if (args.failureReason !== undefined) patch.failureReason = args.failureReason;
    await ctx.db.patch(args.redemptionId, patch);
  },
});

// ─── Refund helper ───────────────────────────────────────────────────────────

/**
 * Queue the coupon's value back to the customer's original payment method.
 *
 * Goes through the existing `refundQueue` rather than calling Razorpay inline,
 * so it inherits the drain cron, the retry behaviour, and real Razorpay refund
 * ids. The idempotency key means expiry and revocation can never double-refund
 * the same coupon.
 */
async function enqueueCouponRefund(
  ctx: any,
  coupon: { _id: Id<"coupons">; code: string; amountPaise: number; sourceOrderId: Id<"orders"> },
  reason: string,
  now: number
): Promise<{ queued: boolean; reason?: string }> {
  const order = await ctx.db.get(coupon.sourceOrderId);
  if (!order?.paymentId) {
    // COD or an order with no captured payment — nothing to refund against.
    console.error(
      `[enqueueCouponRefund] Coupon ${coupon.code} has no source payment; manual action needed.`
    );
    return { queued: false, reason: "no_source_payment" };
  }

  const idempotencyKey = `coupon_refund_${coupon._id}`;
  const existing = await ctx.db
    .query("refundQueue")
    .withIndex("by_idempotencyKey", (q: any) => q.eq("idempotencyKey", idempotencyKey))
    .first();
  if (existing) return { queued: false, reason: "already_queued" };

  await ctx.db.insert("refundQueue", {
    paymentId: order.paymentId,
    orderId: coupon.sourceOrderId,
    reason,
    amountPaise: coupon.amountPaise,
    status: "pending",
    idempotencyKey,
    createdAt: now,
  });

  return { queued: true };
}

// ─── Expiry ──────────────────────────────────────────────────────────────────

/**
 * Expire coupons past their 30-day window and refund the customer.
 *
 * Expiry is not forfeiture: the customer returned goods and holds no credit, so
 * the money goes back to their original payment method. A short validity is
 * therefore customer-friendly — they get cash back sooner rather than a credit
 * sitting unusable.
 */
export const expireCoupons = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const candidates = await ctx.db
      .query("coupons")
      .withIndex("by_status_expiresAt", (q) => q.eq("status", "active").lt("expiresAt", now))
      .take(100);

    let expired = 0;
    for (const coupon of candidates) {
      await ctx.db.patch(coupon._id, {
        status: "expired",
        updatedAt: now,
      });

      await enqueueCouponRefund(
        ctx,
        coupon,
        `Exchange coupon ${coupon.code} expired unredeemed`,
        now
      );

      await ctx.db.insert("auditLogs", {
        actorRole: "system",
        action: "coupon.expired",
        entityType: "coupons",
        entityId: coupon._id,
        metadata: JSON.stringify({
          code: coupon.code,
          amountPaise: coupon.amountPaise,
          refundQueued: true,
        }),
        createdAt: now,
      });

      expired += 1;
    }

    if (expired > 0) {
      console.log(`[expireCoupons] Expired ${expired} coupon(s) and queued refunds.`);
    }
    return { scanned: candidates.length, expired };
  },
});

// ─── Recovery queue ──────────────────────────────────────────────────────────

/**
 * Queue money that could not be recovered automatically, for a human to chase.
 * Only reached when a reversal fails because funds already left the seller's
 * linked account.
 */
export const createLedgerRecoveryItem = internalMutation({
  args: {
    orderId: v.id("orders"),
    boutiqueId: v.id("boutiques"),
    amountOwedPaise: v.number(),
    reason: v.string(),
    couponId: v.optional(v.id("coupons")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // One open item per order — a retry loop must not fan out duplicates.
    const existing = await ctx.db
      .query("ledgerRecoveryItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();
    if (existing) return { success: true, reason: "already_queued", itemId: existing._id };

    const itemId = await ctx.db.insert("ledgerRecoveryItems", {
      orderId: args.orderId,
      boutiqueId: args.boutiqueId,
      couponId: args.couponId,
      amountOwedPaise: args.amountOwedPaise,
      reason: args.reason,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    console.error(
      `[ledgerRecovery] Manual recovery required: order=${args.orderId} amount=${args.amountOwedPaise} reason=${args.reason}`
    );

    return { success: true, itemId };
  },
});

// ─── Admin ───────────────────────────────────────────────────────────────────

/** All coupons with their redemption receipt, for the admin coupons screen. */
export const listCouponsAdmin = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("used"), v.literal("expired"), v.literal("revoked"))
    ),
    boutiqueId: v.optional(v.id("boutiques")),
    searchCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let coupons = args.boutiqueId
      ? await ctx.db
          .query("coupons")
          .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId!))
          .collect()
      : await ctx.db.query("coupons").collect();

    if (args.status) coupons = coupons.filter((c) => c.status === args.status);
    if (args.searchCode) {
      const needle = args.searchCode.trim().toUpperCase();
      coupons = coupons.filter((c) => c.code.includes(needle));
    }

    coupons.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      coupons.slice(0, 200).map(async (c) => {
        const [boutique, customer, redemption, sourceOrder] = await Promise.all([
          ctx.db.get(c.boutiqueId),
          ctx.db.get(c.customerId),
          ctx.db
            .query("couponRedemptions")
            .withIndex("by_couponId", (q) => q.eq("couponId", c._id))
            .first(),
          ctx.db.get(c.sourceOrderId),
        ]);

        return {
          _id: c._id,
          code: c.code,
          amountPaise: c.amountPaise,
          status: c.status,
          expiresAt: c.expiresAt,
          createdAt: c.createdAt,
          usedAt: c.usedAt,
          revokedReason: c.revokedReason,
          boutiqueId: c.boutiqueId,
          boutiqueName: boutique?.boutiqueName || boutique?.name || "Boutique",
          customerName: (customer as any)?.name || customer?.email || "Customer",
          sourceOrderNumber: (sourceOrder as any)?.orderNumber ?? null,
          heldTransferId: c.heldTransferId ?? null,
          redemption: redemption
            ? {
                case: redemption.redemptionCase,
                newOrderTotalPaise: redemption.newOrderTotalPaise,
                customerPaidPaise: redemption.customerPaidPaise,
                refundedToCustomerPaise: redemption.refundedToCustomerPaise,
                releasedToSellerPaise: redemption.releasedToSellerPaise,
                razorpayRefundId: redemption.razorpayRefundId ?? null,
                settlementStatus: redemption.settlementStatus,
              }
            : null,
        };
      })
    );
  },
});

/** Outstanding-liability summary for the admin coupons screen. */
export const getCouponSummaryAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const now = Date.now();

    const coupons = await ctx.db.query("coupons").collect();
    const recovery = await ctx.db
      .query("ledgerRecoveryItems")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    const active = coupons.filter((c) => c.status === "active" && c.expiresAt > now);

    return {
      activeCount: active.length,
      outstandingLiabilityPaise: active.reduce((sum, c) => sum + c.amountPaise, 0),
      usedCount: coupons.filter((c) => c.status === "used").length,
      expiredCount: coupons.filter((c) => c.status === "expired").length,
      revokedCount: coupons.filter((c) => c.status === "revoked").length,
      expiringWithin7Days: active.filter((c) => c.expiresAt - now < 7 * 24 * 60 * 60 * 1000).length,
      openRecoveryCount: recovery.length,
      openRecoveryPaise: recovery.reduce((sum, r) => sum + r.amountOwedPaise, 0),
    };
  },
});

/**
 * Revoke an active coupon.
 *
 * Revoking must settle the money, never orphan it — the customer's cash is
 * sitting in Hive's balance behind this credit. `refundToCustomer` queues it
 * back to their original payment method; releasing to the seller is only
 * correct when the goods were never actually returned.
 */
export const revokeCouponAdmin = mutation({
  args: {
    couponId: v.id("coupons"),
    reason: v.string(),
    destination: v.union(v.literal("refund_customer"), v.literal("release_seller")),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) throw new ConvexError("Coupon not found");
    if (coupon.status !== "active") {
      throw new ConvexError(`Cannot revoke a coupon that is already ${coupon.status}.`);
    }
    if (!args.reason.trim()) {
      throw new ConvexError("A reason is required to revoke a coupon.");
    }

    await ctx.db.patch(args.couponId, {
      status: "revoked",
      revokedAt: now,
      revokedBy: admin._id,
      revokedReason: args.reason.trim(),
      updatedAt: now,
    });

    if (args.destination === "refund_customer") {
      await enqueueCouponRefund(
        ctx,
        coupon,
        `Exchange coupon ${coupon.code} revoked: ${args.reason.trim()}`,
        now
      );
    } else {
      // The goods were never returned, so the original sale stands: re-create
      // the seller's payout from Hive's balance.
      await ctx.scheduler.runAfter(0, internal.razorpayRoute.createSellerTransfer, {
        orderId: coupon.sourceOrderId,
        allowRetry: true,
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "coupon.revoked",
      entityType: "coupons",
      entityId: args.couponId,
      metadata: JSON.stringify({
        code: coupon.code,
        amountPaise: coupon.amountPaise,
        destination: args.destination,
        reason: args.reason.trim(),
      }),
      createdAt: now,
    });

    return { success: true, destination: args.destination };
  },
});

/** Open manual-recovery items for the admin panel. */
export const listRecoveryItemsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const items = await ctx.db
      .query("ledgerRecoveryItems")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return await Promise.all(
      items
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (item) => {
          const [order, boutique] = await Promise.all([
            ctx.db.get(item.orderId),
            ctx.db.get(item.boutiqueId),
          ]);
          return {
            ...item,
            orderNumber: (order as any)?.orderNumber ?? null,
            boutiqueName: boutique?.boutiqueName || boutique?.name || "Boutique",
          };
        })
    );
  },
});

/** Close a recovery item once the money has been chased down or written off. */
export const resolveRecoveryItemAdmin = mutation({
  args: {
    itemId: v.id("ledgerRecoveryItems"),
    status: v.union(v.literal("recovered"), v.literal("written_off")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Recovery item not found");
    if (item.status !== "open") {
      throw new ConvexError(`This item is already ${item.status}.`);
    }

    await ctx.db.patch(args.itemId, {
      status: args.status,
      resolvedBy: admin._id,
      resolvedAt: now,
      resolutionNotes: args.notes,
      updatedAt: now,
    });

    return { success: true };
  },
});
