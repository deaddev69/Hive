// convex/exchanges.ts
// Exchange flow: a customer swaps a delivered item for something else from the
// same boutique.
//
// Distinct from a return. A completed return refunds cash; a completed exchange
// issues a seller-scoped coupon (convex/coupons.ts). Both unwind the seller's
// held Route transfer first — the seller has the goods back either way.
//
// Every 24h window here is enforced against stored server timestamps. The client
// hides expired buttons for looks; the server is what actually refuses.

import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthenticatedUser, getMyBoutique, requireRole } from "./lib/auth";
import { triggerNotification } from "./lib/notifications";
import { RETURN_WINDOW_MS } from "./lib/payoutHold";

/** Seller has 24h from the request to accept. */
export const EXCHANGE_RESPONSE_WINDOW_MS = RETURN_WINDOW_MS;

/** Lazily flip a stale pending request to expired, matching the read. */
function isExpired(request: { status: string; expiresAt: number }, now: number): boolean {
  return request.status === "pending" && request.expiresAt <= now;
}

// ─── Customer ────────────────────────────────────────────────────────────────

/**
 * Customer requests an exchange on a delivered order.
 *
 * Only allowed inside the post-delivery window, and never on a Final Sale
 * order — that policy is read from the snapshot taken at order creation, so a
 * seller switching their store setting later cannot retroactively block it.
 */
export const requestExchange = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
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
      throw new ConvexError("An exchange can only be requested after the order is delivered.");
    }
    if (order.returnsAccepted === false) {
      throw new ConvexError(
        "This was a Final Sale order, so it isn't eligible for an exchange. Contact Hive support if the item arrived damaged."
      );
    }
    if (order.returnStatus) {
      throw new ConvexError("A return is already in progress for this order.");
    }

    const windowClosesAt = (order.claimWindowExpiresAt ?? 0) || (order.deliveredAt ?? now) + RETURN_WINDOW_MS;
    if (now > windowClosesAt) {
      throw new ConvexError("The 24-hour exchange window for this order has closed.");
    }

    const existing = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();
    if (existing && ["pending", "accepted", "completed"].includes(existing.status)) {
      return { success: true, reason: "already_requested", exchangeId: existing._id };
    }

    const exchangeId = await ctx.db.insert("exchangeRequests", {
      orderId: args.orderId,
      customerId: user._id,
      boutiqueId: order.boutiqueId,
      status: "pending",
      reason: args.reason,
      requestedAt: now,
      expiresAt: now + EXCHANGE_RESPONSE_WINDOW_MS,
      createdAt: now,
      updatedAt: now,
    });

    // Freeze the seller's payout while this is open, so the money cannot settle
    // out from under an exchange that is about to be accepted.
    await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
      orderId: args.orderId,
      onHold: true,
      reason: "exchange_requested",
    });

    await ctx.scheduler.runAfter(0, internal.pushActions.sendOrderPushToBoutique, {
      boutiqueId: order.boutiqueId,
      title: "Exchange requested",
      body: `A customer wants to exchange order ${order.orderNumber}. You have 24 hours to respond.`,
      url: "/boutique/orders",
    });

    return { success: true, exchangeId };
  },
});

/** The customer's view of an exchange on one order. */
export const getExchangeForOrder = query({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const now = Date.now();

    const request = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();
    if (!request) return null;
    if (request.customerId !== user._id) return null;

    const effectiveStatus = isExpired(request, now) ? "expired" : request.status;

    // The WhatsApp handoff is only offered for 24h after the seller accepts,
    // mirroring the existing return button's window.
    const whatsappVisibleUntil = request.respondedAt
      ? request.respondedAt + EXCHANGE_RESPONSE_WINDOW_MS
      : null;

    return {
      _id: request._id,
      status: effectiveStatus,
      reason: request.reason,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      expiresAt: request.expiresAt,
      rejectionReason: request.rejectionReason,
      couponId: request.couponId,
      whatsappVisible:
        effectiveStatus === "accepted" &&
        whatsappVisibleUntil !== null &&
        now < whatsappVisibleUntil,
      whatsappVisibleUntil,
    };
  },
});

// ─── Seller ──────────────────────────────────────────────────────────────────

/** Exchange requests awaiting this boutique, newest first. */
export const listMyBoutiqueExchanges = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    if (!boutique) return [];
    const now = Date.now();

    const requests = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_boutiqueId_status", (q) => q.eq("boutiqueId", boutique._id))
      .collect();

    return await Promise.all(
      requests
        .sort((a, b) => b.requestedAt - a.requestedAt)
        .map(async (r) => {
          const order = await ctx.db.get(r.orderId);
          return {
            _id: r._id,
            orderId: r.orderId,
            orderNumber: (order as any)?.orderNumber ?? null,
            status: isExpired(r, now) ? "expired" : r.status,
            reason: r.reason,
            requestedAt: r.requestedAt,
            expiresAt: r.expiresAt,
            // Server-authoritative: the client must not compute this itself.
            canAccept: r.status === "pending" && r.expiresAt > now,
            msRemaining: Math.max(0, r.expiresAt - now),
          };
        })
    );
  },
});

/**
 * Seller accepts an exchange. Refused after the 24h window, checked against the
 * stored `expiresAt` rather than anything the client sends.
 */
export const acceptExchange = mutation({
  args: { exchangeId: v.id("exchangeRequests"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    if (!boutique) throw new ConvexError("No boutique associated with this account.");
    const now = Date.now();

    const request = await ctx.db.get(args.exchangeId);
    if (!request) throw new ConvexError("Exchange request not found");
    if (request.boutiqueId !== boutique._id) {
      throw new ConvexError("This exchange belongs to a different boutique.");
    }
    if (request.status !== "pending") {
      throw new ConvexError(`This exchange is already ${request.status}.`);
    }
    if (request.expiresAt <= now) {
      // Reflect the lapse rather than leaving it looking actionable.
      await ctx.db.patch(args.exchangeId, { status: "expired", updatedAt: now });
      throw new ConvexError("The 24-hour window to accept this exchange has passed.");
    }

    await ctx.db.patch(args.exchangeId, {
      status: "accepted",
      respondedAt: now,
      updatedAt: now,
    });

    await triggerNotification(
      ctx,
      request.customerId,
      "whatsapp",
      "exchange_accepted",
      "exchangeRequests",
      args.exchangeId,
      JSON.stringify({ orderId: request.orderId, respondedAt: now })
    );

    return { success: true, respondedAt: now };
  },
});

/** Seller declines an exchange, releasing the payout hold. */
export const rejectExchange = mutation({
  args: {
    exchangeId: v.id("exchangeRequests"),
    reason: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    if (!boutique) throw new ConvexError("No boutique associated with this account.");
    const now = Date.now();

    const request = await ctx.db.get(args.exchangeId);
    if (!request) throw new ConvexError("Exchange request not found");
    if (request.boutiqueId !== boutique._id) {
      throw new ConvexError("This exchange belongs to a different boutique.");
    }
    if (request.status !== "pending") {
      throw new ConvexError(`This exchange is already ${request.status}.`);
    }

    await ctx.db.patch(args.exchangeId, {
      status: "rejected",
      respondedAt: now,
      rejectionReason: args.reason,
      updatedAt: now,
    });

    // Nothing is coming back, so the sale stands — let the payout settle.
    await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
      orderId: request.orderId,
      onHold: false,
      reason: "exchange_rejected",
    });

    await triggerNotification(
      ctx,
      request.customerId,
      "whatsapp",
      "exchange_rejected",
      "exchangeRequests",
      args.exchangeId,
      JSON.stringify({ orderId: request.orderId, reason: args.reason })
    );

    return { success: true };
  },
});

// ─── Lifecycle ───────────────────────────────────────────────────────────────

/**
 * Expire pending exchange requests the seller never answered, and release the
 * payout hold their request had placed.
 */
export const expirePendingExchanges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const pending = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);

    let expired = 0;
    for (const request of pending) {
      if (request.expiresAt > now) continue;

      await ctx.db.patch(request._id, { status: "expired", updatedAt: now });

      await ctx.scheduler.runAfter(0, internal.razorpayRoute.updateTransferHold, {
        orderId: request.orderId,
        onHold: false,
        reason: "exchange_expired",
      });

      await triggerNotification(
        ctx,
        request.customerId,
        "whatsapp",
        "exchange_expired",
        "exchangeRequests",
        request._id,
        JSON.stringify({ orderId: request.orderId })
      );

      expired += 1;
    }

    if (expired > 0) {
      console.log(`[expirePendingExchanges] Expired ${expired} unanswered exchange request(s).`);
    }
    return { scanned: pending.length, expired };
  },
});

/**
 * Complete an exchange once the item is back with the seller.
 *
 * Order of operations matters: the seller's held transfer is reversed FIRST so
 * the customer's money is back in Hive's balance, and only then is the coupon
 * issued against it. Issuing credit before the money is recovered would create
 * an unfunded liability.
 */
export const completeExchange = internalMutation({
  args: { exchangeId: v.id("exchangeRequests") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const request = await ctx.db.get(args.exchangeId);
    if (!request) throw new ConvexError("Exchange request not found");

    if (request.status === "completed") {
      return { success: true, reason: "already_completed", couponId: request.couponId };
    }
    if (request.status !== "accepted") {
      return { success: false, reason: `exchange_${request.status}` };
    }

    // 1. Unwind the seller's payout — they have the goods back.
    await ctx.scheduler.runAfter(0, internal.razorpayRoute.reverseSellerTransfer, {
      orderId: request.orderId,
      reason: "exchange_completed",
    });

    // 2. Issue the credit. Marks the exchange completed and links the coupon.
    await ctx.scheduler.runAfter(0, internal.coupons.issueExchangeCoupon, {
      orderId: request.orderId,
      exchangeRequestId: args.exchangeId,
    });

    await ctx.db.patch(args.exchangeId, { updatedAt: now });

    return { success: true, reason: "completing" };
  },
});

/**
 * Seller reports the returned item never actually arrived.
 *
 * Porter occasionally marks a drop-off complete that did not happen. This
 * freezes the exchange and escalates rather than letting a coupon go out for
 * goods the seller never received.
 */
export const disputeExchangeReceipt = mutation({
  args: {
    exchangeId: v.id("exchangeRequests"),
    details: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    if (!boutique) throw new ConvexError("No boutique associated with this account.");
    const now = Date.now();

    const request = await ctx.db.get(args.exchangeId);
    if (!request) throw new ConvexError("Exchange request not found");
    if (request.boutiqueId !== boutique._id) {
      throw new ConvexError("This exchange belongs to a different boutique.");
    }
    if (request.couponId) {
      throw new ConvexError(
        "A coupon has already been issued for this exchange. Contact Hive support to dispute it."
      );
    }

    await ctx.db.patch(args.exchangeId, {
      status: "cancelled",
      rejectionReason: `Seller reports item not received: ${args.details}`,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorRole: "system",
      action: "exchange.receipt_disputed",
      entityType: "exchangeRequests",
      entityId: args.exchangeId,
      metadata: JSON.stringify({
        boutiqueId: boutique._id,
        orderId: request.orderId,
        details: args.details,
      }),
      createdAt: now,
    });

    return { success: true };
  },
});

// ─── Admin ───────────────────────────────────────────────────────────────────

/** All exchange requests, for the combined admin returns/exchanges screen. */
export const listExchangesAdmin = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("expired"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const now = Date.now();

    let requests = args.status
      ? await ctx.db
          .query("exchangeRequests")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("exchangeRequests").collect();

    requests.sort((a, b) => b.requestedAt - a.requestedAt);

    return await Promise.all(
      requests.slice(0, 200).map(async (r) => {
        const [order, boutique, customer] = await Promise.all([
          ctx.db.get(r.orderId),
          ctx.db.get(r.boutiqueId),
          ctx.db.get(r.customerId),
        ]);
        return {
          _id: r._id,
          orderId: r.orderId,
          orderNumber: (order as any)?.orderNumber ?? null,
          orderTotalPaise: (order as any)?.total ?? null,
          status: isExpired(r, now) ? "expired" : r.status,
          reason: r.reason,
          rejectionReason: r.rejectionReason,
          requestedAt: r.requestedAt,
          respondedAt: r.respondedAt,
          expiresAt: r.expiresAt,
          couponId: r.couponId,
          boutiqueName: boutique?.boutiqueName || boutique?.name || "Boutique",
          customerName: (customer as any)?.name || customer?.email || "Customer",
        };
      })
    );
  },
});

/**
 * Which order an accepted exchange needs Porter dispatched for.
 *
 * Dispatch itself is `adminOrders.initiateReturnAdmin` — one Porter leg serves
 * both flows (customer -> boutique), and that mutation now accepts either an
 * approved return or a seller-accepted exchange. Keeping a single dispatch path
 * means the return webhook, address swap, and idempotency guard are shared
 * rather than duplicated.
 */
export const getExchangeDispatchTarget = query({
  args: { exchangeId: v.id("exchangeRequests") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const request = await ctx.db.get(args.exchangeId);
    if (!request) return null;

    return {
      orderId: request.orderId,
      status: request.status,
      canDispatch: request.status === "accepted" && !request.returnShipmentId,
      alreadyDispatched: !!request.returnShipmentId,
    };
  },
});
