// convex/razorpayRoute.ts
// Razorpay Route integration.
//
// Settlement model (v4 — held transfers):
//   Customer pays  ->  payment captured, then ONE Route transfer is created
//                      immediately via POST /v1/payments/{paymentId}/transfers
//                      with on_hold=true and NO on_hold_until (indefinite hold).
//                      payoutStatus becomes `withheld`.
//   Porter sends `order_end_job`  ->  Hive order becomes `delivered`, and the
//                      hold is resolved from the order's snapshotted policy:
//                        returnsAccepted === false (Final Sale)
//                            -> on_hold=false, settles next working day
//                        otherwise (24h returns)
//                            -> on_hold_until = deliveredAt + 24h, Razorpay
//                               auto-releases (reconciled by an hourly cron,
//                               since no webhook announces that release)
//   A return or an unredeemed exchange coupon re-holds the transfer
//   indefinitely, so the money stays frozen in the seller's linked account and
//   a later reversal cannot fail for insufficient balance.
//
// Hive retains commission + GST on commission + platform fee + handling charge.
// Only the frozen `pricingSnapshot.sellerPayoutPaise` is transferred to the seller.
//
// `createSellerTransfer` below remains the post-delivery fallback for orders
// with no held transfer: COD, a seller whose KYC was incomplete at capture, a
// Razorpay error at capture, or an order placed before held transfers existed.

import { action, internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function resolveRazorpayAuthHeader(): string | null {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keySecret === "mock_secret") return null;
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

export const createLinkedAccount: any = action({
  args: {
    boutiqueId: v.id("boutiques"),
    legalName: v.string(),
    businessType: v.union(
      v.literal("individual"),
      v.literal("proprietorship"),
      v.literal("partnership"),
      v.literal("private_limited"),
      v.literal("llp")
    ),
    pan: v.string(),
    accountNumber: v.string(),
    ifsc: v.string(),
    holderName: v.string(),
  },
  handler: async (ctx, args) => {
    const authHeader = resolveRazorpayAuthHeader();
    if (!authHeader) {
      throw new ConvexError("Razorpay credentials not configured");
    }

    const boutique = await ctx.runQuery((internal.boutiques as any).getById, {
      id: args.boutiqueId,
    });

    if (!boutique) throw new ConvexError("Boutique not found");

    // 1. Create Linked Account on Razorpay Route
    const accountResponse = await fetch(`${RAZORPAY_API}/accounts`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: boutique.email,
        phone: boutique.phone || "9999999999",
        type: "route",
        legal_business_name: args.legalName,
        business_type: args.businessType,
        profile: {
          category: "ecommerce",
          subcategory: "women_apparel",
          addresses: {
            registered: {
              street1: boutique.address || "Street Address",
              city: boutique.city || "Thrissur",
              state: "Kerala",
              postal_code: boutique.pincode || "680001",
              country: "IN",
            },
          },
        },
        receivers: {
          types: ["vpa"],
        },
        bank_account: {
          ifsc_code: args.ifsc,
          account_number: args.accountNumber,
          beneficiary_name: args.holderName,
        },
      }),
    });

    if (!accountResponse.ok) {
      const err = await accountResponse.json();
      throw new ConvexError(err.error?.description || "Failed to create Razorpay account");
    }

    const accountData = await accountResponse.json();

    // 2. Generate Hosted KYC Onboarding Link
    const linkResponse = await fetch(
      `${RAZORPAY_API}/accounts/${accountData.id}/onboarding_links`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    if (!linkResponse.ok) {
      const err = await linkResponse.json();
      throw new ConvexError(err.error?.description || "Failed to generate onboarding link");
    }

    const linkData = await linkResponse.json();

    // 3. Save Linked Account Info in Convex
    await ctx.runMutation((internal.boutiques as any).updateRazorpayDetails, {
      boutiqueId: args.boutiqueId,
      razorpayAccountId: accountData.id,
      razorpayAccountStatus: "created",
      businessType: args.businessType,
      pan: args.pan,
      bankAccount: {
        holderName: args.holderName,
        accountNo: args.accountNumber,
        ifsc: args.ifsc,
      },
    });

    return {
      accountId: accountData.id,
      onboardingUrl: linkData.url,
    };
  },
});

export const getKYCOnboardingLink: any = action({
  args: { razorpayAccountId: v.string() },
  handler: async (ctx, args) => {
    const authHeader = resolveRazorpayAuthHeader();
    if (!authHeader) {
      throw new ConvexError("Razorpay credentials not configured");
    }

    const response = await fetch(
      `${RAZORPAY_API}/accounts/${args.razorpayAccountId}/onboarding_links`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new ConvexError(`Failed to generate onboarding link: ${errText}`);
    }

    const data = await response.json();
    return { onboardingUrl: data.url };
  },
});

// ─── Payout amount resolution ────────────────────────────────────────────────

/**
 * Legacy fallback payout for pre-v3 orders that have no immutable `pricingSnapshot`.
 *
 * Mirrors the legacy accrual math in `adminFinance.markOrderFinanciallyDelivered`:
 * legacy `commissionAmount` is already GST-inclusive, so GST is NOT deducted twice.
 *
 * This is intentionally isolated — it must never be blended with the v3 pricing engine.
 */
export function calculateLegacyFallbackPayout(order: {
  subtotal?: number;
  discount?: number;
  commissionAmount?: number;
}): number {
  const subtotal = order.subtotal ?? 0;
  const discount = order.discount ?? 0;
  const commission = order.commissionAmount ?? 0;
  // SECURITY FIX: Deduct 18% GST on commission (was missing, causing overpayment to sellers)
  const commissionGst = Math.round(commission * 0.18);
  return Math.max(0, Math.round(subtotal - discount - commission - commissionGst));
}

/**
 * Resolve the seller payout in paise.
 * Priority: immutable pricing snapshot, then the isolated legacy fallback.
 */
function resolveSellerPayoutPaise(order: any): { payoutPaise: number; source: "snapshot" | "legacy" } {
  const snapshotPayout = order?.pricingSnapshot?.sellerPayoutPaise;
  if (typeof snapshotPayout === "number") {
    return { payoutPaise: Math.round(snapshotPayout), source: "snapshot" };
  }
  return { payoutPaise: calculateLegacyFallbackPayout(order), source: "legacy" };
}

// ─── Transfer lookup (idempotency verification) ───────────────────────────────

/**
 * Ask Razorpay whether a transfer already exists for this payment.
 * Used before creating a transfer and after any ambiguous failure, so a retry
 * can never double-pay a seller.
 */
async function findExistingTransfer(
  authHeader: string,
  razorpayPaymentId: string,
  orderId: string
): Promise<{ ok: boolean; transfer?: any; error?: string }> {
  try {
    const res = await fetch(`${RAZORPAY_API}/payments/${razorpayPaymentId}/transfers`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    const data = await res.json();
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    // Prefer an exact match on our own note, otherwise any transfer on this payment
    // (Hive is single-seller-per-order, so one payment maps to one seller transfer).
    const match = items.find((t) => t?.notes?.orderId === orderId) ?? items[0];
    return { ok: true, transfer: match };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

// ─── Direct transfer (coupon-funded orders) ──────────────────────────────────

/**
 * Pay a seller straight from Hive's balance, held.
 *
 * Used only when an order carries no Razorpay payment — an exchange coupon
 * covered it outright. `POST /v1/transfers` sources from the account balance
 * instead of a specific payment, which is where the reversed transfer's money
 * already sits.
 *
 * The caller has already established that `order.razorpayTransferId` is unset,
 * which is the idempotency guard here: unlike payment-sourced transfers, these
 * cannot be re-queried from Razorpay by payment id.
 */
async function createDirectHeldTransfer(
  ctx: any,
  params: {
    orderId: any;
    accountId: string;
    payoutPaise: number;
    order: any;
    source: string;
    log: (reason: string, detail?: Record<string, unknown>) => void;
    authHeader: string;
  }
): Promise<any> {
  const { accountId, payoutPaise, order, source, log, authHeader } = params;

  try {
    const res = await fetch(`${RAZORPAY_API}/transfers`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account: accountId,
        amount: payoutPaise,
        currency: "INR",
        on_hold: true,
        notes: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          boutiqueId: order.boutiqueId,
          payoutSource: source,
          fundedBy: "exchange_coupon",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      log("direct_transfer_failed", { status: res.status, error: errText.substring(0, 300) });
      return { success: false, reason: "direct_transfer_failed", error: errText };
    }

    const data = await res.json();
    const transferId = data.id;
    if (!transferId) {
      log("direct_transfer_missing_id");
      return { success: false, reason: "direct_transfer_missing_id" };
    }

    await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
      orderId: params.orderId,
      payoutStatus: "withheld",
      razorpayTransferId: transferId,
      payoutHoldReason: "awaiting_delivery",
    });

    log("direct_transfer_held", { transferId, payoutPaise });
    return { success: true, transferId, amount: payoutPaise, direct: true };
  } catch (err: any) {
    log("direct_transfer_exception", { error: err?.message || String(err) });
    return { success: false, reason: "direct_transfer_exception", error: err?.message };
  }
}

// ─── Held Transfer (created at payment capture) ──────────────────────────────

/**
 * Create the seller's Route transfer at payment capture, held.
 *
 * `on_hold: true` with no `on_hold_until` holds the settlement indefinitely —
 * the money sits frozen in the seller's linked account and cannot be withdrawn,
 * which is what makes a later reversal reliable. Delivery then either releases
 * it (Final Sale) or sets an `on_hold_until` 24h out (returns-accepted sellers).
 *
 * Idempotent: adopts an existing transfer rather than creating a second one.
 */
export const createHeldSellerTransfer = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<any> => {
    const log = (reason: string, detail?: Record<string, unknown>) =>
      console.log(
        `[createHeldSellerTransfer] order=${args.orderId} reason=${reason}` +
          (detail ? ` detail=${JSON.stringify(detail)}` : "")
      );

    const authHeader = resolveRazorpayAuthHeader();
    if (!authHeader) {
      log("razorpay_not_configured");
      return { success: false, reason: "razorpay_not_configured" };
    }

    const order = await ctx.runQuery((internal.orders as any).getById, { id: args.orderId });
    if (!order) {
      log("order_not_found");
      return { success: false, reason: "order_not_found" };
    }

    // ── Idempotency: a transfer already exists for this order ────────────────
    if (order.razorpayTransferId) {
      log("already_transferred", { transferId: order.razorpayTransferId });
      return { success: true, reason: "already_transferred", transferId: order.razorpayTransferId };
    }

    const boutique = await ctx.runQuery((internal.boutiques as any).getById, {
      id: order.boutiqueId,
    });
    if (!boutique?.razorpayAccountId) {
      // Not fatal at capture time — the order is still valid and the seller can
      // finish KYC before delivery. The post-delivery path retries the transfer.
      log("no_razorpay_account", { boutiqueId: order.boutiqueId });
      return { success: false, reason: "no_razorpay_account" };
    }

    const payment = order.paymentId
      ? await ctx.runQuery((internal.payments as any).getPaymentById, {
          paymentId: order.paymentId,
        })
      : null;

    const { payoutPaise, source } = resolveSellerPayoutPaise(order);
    if (payoutPaise <= 0) {
      log("zero_payout", { payoutPaise, source });
      return { success: true, reason: "zero_payout" };
    }

    // A coupon-funded order was never charged, so there is no payment to hang a
    // Route transfer on. The money is already in Hive's balance from the
    // reversal that funded the coupon, so pay the seller by direct transfer.
    const isCouponFunded = !!order.couponId && !payment?.razorpayPaymentId;
    if (isCouponFunded) {
      return await createDirectHeldTransfer(ctx, {
        orderId: args.orderId,
        accountId: boutique.razorpayAccountId,
        payoutPaise,
        order,
        source,
        log,
        authHeader,
      });
    }

    if (!payment?.razorpayPaymentId) {
      log("no_razorpay_payment_id");
      return { success: false, reason: "no_razorpay_payment_id" };
    }
    if (payment.status !== "captured") {
      log("payment_not_captured", { paymentStatus: payment.status });
      return { success: false, reason: "payment_not_captured" };
    }
    if (payoutPaise > payment.amount) {
      log("payout_exceeds_payment", { payoutPaise, paymentAmount: payment.amount, source });
      return { success: false, reason: "payout_exceeds_payment" };
    }

    // ── Remote idempotency: never create a second transfer ───────────────────
    const preCheck = await findExistingTransfer(authHeader, payment.razorpayPaymentId, order._id);
    if (!preCheck.ok) {
      log("transfer_lookup_failed", { error: preCheck.error?.substring(0, 300) });
      return { success: false, reason: "transfer_lookup_failed" };
    }
    if (preCheck.transfer?.id) {
      log("adopted_existing_transfer", { transferId: preCheck.transfer.id });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "withheld",
        razorpayTransferId: preCheck.transfer.id,
        payoutHoldReason: "awaiting_delivery",
      });
      return { success: true, reason: "adopted_existing_transfer", transferId: preCheck.transfer.id };
    }

    try {
      const transferResponse = await fetch(
        `${RAZORPAY_API}/payments/${payment.razorpayPaymentId}/transfers`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transfers: [
              {
                account: boutique.razorpayAccountId,
                amount: payoutPaise,
                currency: "INR",
                // Indefinite hold: no on_hold_until. Delivery decides when it lifts.
                on_hold: true,
                notes: {
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  boutiqueId: order.boutiqueId,
                  sellerTier: order.pricingSnapshot?.sellerTierKey ?? "legacy",
                  payoutSource: source,
                  heldAtCapture: "true",
                },
              },
            ],
          }),
        }
      );

      if (!transferResponse.ok) {
        const errText = await transferResponse.text();
        log("razorpay_error", { status: transferResponse.status, error: errText.substring(0, 300) });

        // The request may have partially succeeded — verify before giving up.
        const postCheck = await findExistingTransfer(authHeader, payment.razorpayPaymentId, order._id);
        if (postCheck.ok && postCheck.transfer?.id) {
          await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
            orderId: args.orderId,
            payoutStatus: "withheld",
            razorpayTransferId: postCheck.transfer.id,
            payoutHoldReason: "awaiting_delivery",
          });
          return { success: true, reason: "recovered_after_error", transferId: postCheck.transfer.id };
        }
        return { success: false, reason: "razorpay_error", error: errText };
      }

      const transferData = await transferResponse.json();
      const transferId = transferData.items?.[0]?.id || transferData.id;
      if (!transferId) {
        log("missing_transfer_id");
        return { success: false, reason: "missing_transfer_id" };
      }

      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "withheld",
        razorpayTransferId: transferId,
        payoutHoldReason: "awaiting_delivery",
      });

      log("held", { transferId, payoutPaise, source });
      return { success: true, transferId, amount: payoutPaise, payoutSource: source };
    } catch (err: any) {
      const postCheck = await findExistingTransfer(authHeader, payment.razorpayPaymentId, order._id);
      if (postCheck.ok && postCheck.transfer?.id) {
        log("recovered_after_exception", { transferId: postCheck.transfer.id });
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "withheld",
          razorpayTransferId: postCheck.transfer.id,
          payoutHoldReason: "awaiting_delivery",
        });
        return { success: true, reason: "recovered_after_exception", transferId: postCheck.transfer.id };
      }
      log("exception", { error: err?.message || String(err) });
      return { success: false, reason: "exception", error: err?.message };
    }
  },
});

/**
 * Change the settlement hold on an existing transfer.
 *
 *   release          -> on_hold: false            (settles next working day)
 *   hold until T     -> on_hold: true, on_hold_until: T
 *   hold indefinite  -> on_hold: true             (no on_hold_until)
 *
 * Razorpay auto-releases when an `on_hold_until` passes, so an indefinite hold
 * is what keeps a return or an unredeemed exchange coupon from settling early.
 */
export const updateTransferHold = internalAction({
  args: {
    orderId: v.id("orders"),
    onHold: v.boolean(),
    // Omit while onHold is true for an indefinite hold.
    onHoldUntil: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const log = (reason: string, detail?: Record<string, unknown>) =>
      console.log(
        `[updateTransferHold] order=${args.orderId} reason=${reason}` +
          (detail ? ` detail=${JSON.stringify(detail)}` : "")
      );

    const authHeader = resolveRazorpayAuthHeader();
    if (!authHeader) {
      log("razorpay_not_configured");
      return { success: false, reason: "razorpay_not_configured" };
    }

    const order = await ctx.runQuery((internal.orders as any).getById, { id: args.orderId });
    if (!order) {
      log("order_not_found");
      return { success: false, reason: "order_not_found" };
    }
    if (!order.razorpayTransferId) {
      // No held transfer to adjust — the capture-time creation was skipped or
      // failed. The caller decides whether to fall back to creating one.
      log("no_transfer");
      return { success: false, reason: "no_transfer" };
    }
    if (order.payoutStatus === "paid" || order.payoutStatus === "settled") {
      log("already_released", { payoutStatus: order.payoutStatus });
      return { success: true, reason: "already_released" };
    }

    const body: Record<string, unknown> = { on_hold: args.onHold };
    if (args.onHold && args.onHoldUntil !== undefined) {
      // Razorpay expects seconds, and only accepts a future timestamp.
      body.on_hold_until = Math.floor(args.onHoldUntil / 1000);
    }

    try {
      const res = await fetch(`${RAZORPAY_API}/transfers/${order.razorpayTransferId}`, {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        log("razorpay_error", { status: res.status, error: errText.substring(0, 300) });
        return { success: false, reason: "razorpay_error", error: errText };
      }

      // Releasing settles by the next working day, so the money is committed to
      // the seller from here — record it as paid.
      if (!args.onHold) {
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "paid",
          payoutProcessedAt: Date.now(),
          payoutHoldUntil: null,
          payoutHoldReason: null,
        });
      } else {
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "withheld",
          payoutHoldUntil: args.onHoldUntil ?? null,
          payoutHoldReason: args.reason,
          ...(args.onHoldUntil !== undefined ? { payoutEligibleAt: args.onHoldUntil } : {}),
        });
      }

      log("updated", { onHold: args.onHold, onHoldUntil: args.onHoldUntil, holdReason: args.reason });
      return { success: true, onHold: args.onHold, onHoldUntil: args.onHoldUntil };
    } catch (err: any) {
      log("exception", { error: err?.message || String(err) });
      return { success: false, reason: "exception", error: err?.message };
    }
  },
});

/**
 * Reverse a seller's held transfer, returning the money to Hive's balance.
 *
 * Called when a return or exchange completes: the seller has the goods back, so
 * the original sale is unwound. Because the transfer was held from capture
 * (frozen in the linked account, not withdrawable), a full reversal here is
 * expected to succeed — a failure means the hold was released early, which is
 * the one case that needs manual recovery.
 *
 * Idempotent: a transfer already fully reversed at Razorpay is adopted rather
 * than reversed twice.
 */
export const reverseSellerTransfer = internalAction({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
    /** Omit to reverse the full transfer. */
    amountPaise: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const log = (reason: string, detail?: Record<string, unknown>) =>
      console.log(
        `[reverseSellerTransfer] order=${args.orderId} reason=${reason}` +
          (detail ? ` detail=${JSON.stringify(detail)}` : "")
      );

    const authHeader = resolveRazorpayAuthHeader();
    if (!authHeader) {
      log("razorpay_not_configured");
      return { success: false, reason: "razorpay_not_configured" };
    }

    const order = await ctx.runQuery((internal.orders as any).getById, { id: args.orderId });
    if (!order) {
      log("order_not_found");
      return { success: false, reason: "order_not_found" };
    }
    if (!order.razorpayTransferId) {
      // Nothing was ever transferred (COD, or capture-time creation was skipped).
      // The money is already in Hive's balance, so there is nothing to unwind.
      log("no_transfer_nothing_to_reverse");
      return { success: true, reason: "no_transfer_nothing_to_reverse", reversedPaise: 0 };
    }

    try {
      // Check what Razorpay already reversed, so a retry cannot double-reverse.
      const fetchRes = await fetch(`${RAZORPAY_API}/transfers/${order.razorpayTransferId}`, {
        headers: { Authorization: authHeader },
      });
      if (!fetchRes.ok) {
        const errText = await fetchRes.text();
        log("transfer_fetch_failed", { error: errText.substring(0, 300) });
        return { success: false, reason: "transfer_fetch_failed", error: errText };
      }
      const transfer = await fetchRes.json();

      const transferAmount: number = transfer.amount ?? 0;
      const alreadyReversed: number = transfer.amount_reversed ?? 0;
      const target = args.amountPaise ?? transferAmount;
      const outstanding = Math.max(0, Math.min(target, transferAmount - alreadyReversed));

      if (outstanding === 0) {
        log("already_reversed", { transferAmount, alreadyReversed });
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "withheld",
          payoutHoldReason: args.reason,
          payoutHoldUntil: null,
        });
        return { success: true, reason: "already_reversed", reversedPaise: alreadyReversed };
      }

      const reverseRes = await fetch(
        `${RAZORPAY_API}/transfers/${order.razorpayTransferId}/reversals`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: outstanding,
            notes: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              reason: args.reason,
            },
          }),
        }
      );

      if (!reverseRes.ok) {
        const errText = await reverseRes.text();
        log("reversal_failed", { status: reverseRes.status, error: errText.substring(0, 300) });

        // Money already left the linked account — this is the one case that
        // cannot be automated. Queue it for a human instead of failing silently.
        await ctx.runMutation((internal.coupons as any).createLedgerRecoveryItem, {
          orderId: order._id,
          boutiqueId: order.boutiqueId,
          amountOwedPaise: outstanding,
          reason: `Transfer reversal failed (${args.reason}): ${errText.substring(0, 300)}`,
        });

        return { success: false, reason: "reversal_failed", error: errText, queuedForRecovery: true };
      }

      const reversal = await reverseRes.json();
      log("reversed", { reversalId: reversal.id, reversedPaise: outstanding });

      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "withheld",
        payoutHoldReason: args.reason,
        payoutHoldUntil: null,
      });

      return {
        success: true,
        reason: "reversed",
        reversalId: reversal.id,
        reversedPaise: outstanding,
      };
    } catch (err: any) {
      log("exception", { error: err?.message || String(err) });
      return { success: false, reason: "exception", error: err?.message };
    }
  },
});

// ─── Post-Delivery Seller Transfer ───────────────────────────────────────────

/**
 * Creates the Razorpay Route transfer for a seller payout AFTER verified delivery.
 *
 * Preconditions (all must hold, otherwise a structured reason is logged and no
 * transfer is attempted):
 *   - order exists
 *   - order.status === "delivered"
 *   - payoutStatus === "eligible"  (or "failed" when allowRetry is set)
 *   - Razorpay payment exists and is captured
 *   - boutique has a Razorpay Route linked account
 *   - seller payout > 0
 *   - no successful transfer already recorded, locally or at Razorpay
 *
 * State machine: not_eligible -> eligible -> processing -> paid
 *                                            processing -> failed -> (safe retry)
 */
export const createSellerTransfer = internalAction({
  args: {
    orderId: v.id("orders"),
    // Set by the admin retry path: permits re-entry from payoutStatus "failed".
    allowRetry: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    const log = (reason: string, detail?: Record<string, unknown>) =>
      console.log(
        `[createSellerTransfer] order=${args.orderId} reason=${reason}` +
          (detail ? ` detail=${JSON.stringify(detail)}` : "")
      );

    const authHeader = resolveRazorpayAuthHeader();
    if (!authHeader) {
      log("razorpay_not_configured");
      return { success: false, reason: "razorpay_not_configured" };
    }

    const order = await ctx.runQuery((internal.orders as any).getById, { id: args.orderId });
    if (!order) {
      log("order_not_found");
      return { success: false, reason: "order_not_found" };
    }

    // ── Idempotency: never create a second transfer ──────────────────────────
    if (order.razorpayTransferId) {
      log("already_transferred", { transferId: order.razorpayTransferId });
      return { success: true, reason: "already_transferred", transferId: order.razorpayTransferId };
    }
    if (order.payoutStatus === "paid" || order.payoutStatus === "settled") {
      log("already_paid", { payoutStatus: order.payoutStatus });
      return { success: true, reason: "already_paid" };
    }
    if (order.payoutStatus === "processing" && !args.allowRetry) {
      log("already_processing");
      return { success: true, reason: "already_processing" };
    }

    const allowedEntryStates = args.allowRetry
      ? ["eligible", "failed", "processing"]
      : ["eligible"];
    if (!allowedEntryStates.includes(order.payoutStatus)) {
      log("not_eligible", { payoutStatus: order.payoutStatus });
      return { success: false, reason: "not_eligible" };
    }

    // ── Delivery must be verified ────────────────────────────────────────────
    if (order.status !== "delivered") {
      log("not_delivered", { status: order.status });
      return { success: false, reason: "not_delivered" };
    }

    // ── Pre-existing dispute protection (unchanged business rule) ────────────
    const hasActiveClaims = await ctx.runQuery((internal.claims as any).getOpenClaimByOrderId, {
      orderId: args.orderId,
    });
    if (hasActiveClaims) {
      log("active_claim");
      return { success: false, reason: "active_claim" };
    }

    // ── Seller Route account ────────────────────────────────────────────────
    const boutique = await ctx.runQuery((internal.boutiques as any).getById, {
      id: order.boutiqueId,
    });
    if (!boutique?.razorpayAccountId) {
      log("no_razorpay_account", { boutiqueId: order.boutiqueId });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "failed",
        payoutFailureReason: "Boutique has no Razorpay Route linked account",
      });
      return { success: false, reason: "no_razorpay_account" };
    }

    // ── Payment must be captured ─────────────────────────────────────────────
    if (!order.paymentId) {
      log("no_payment");
      return { success: false, reason: "no_payment" };
    }
    const payment = await ctx.runQuery((internal.payments as any).getPaymentById, {
      paymentId: order.paymentId,
    });
    if (!payment?.razorpayPaymentId) {
      log("no_razorpay_payment_id");
      return { success: false, reason: "no_razorpay_payment_id" };
    }
    if (payment.status !== "captured") {
      log("payment_not_captured", { paymentStatus: payment.status });
      return { success: false, reason: "payment_not_captured" };
    }

    // ── Payout amount: immutable snapshot is authoritative ───────────────────
    const { payoutPaise, source } = resolveSellerPayoutPaise(order);

    if (payoutPaise <= 0) {
      log("zero_payout", { payoutPaise, source });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "paid",
        payoutProcessedAt: Date.now(),
      });
      return { success: true, reason: "zero_payout" };
    }
    if (payoutPaise > payment.amount) {
      log("payout_exceeds_payment", { payoutPaise, paymentAmount: payment.amount, source });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "failed",
        payoutFailureReason: `Payout ${payoutPaise} paise exceeds captured payment ${payment.amount} paise`,
      });
      return { success: false, reason: "payout_exceeds_payment" };
    }

    // ── Remote idempotency check: never blindly (re)create a transfer ────────
    const preCheck = await findExistingTransfer(authHeader, payment.razorpayPaymentId, order._id);
    if (!preCheck.ok) {
      log("transfer_lookup_failed", { error: preCheck.error?.substring(0, 300) });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "failed",
        payoutFailureReason: `Transfer pre-check failed: ${String(preCheck.error).substring(0, 400)}`,
      });
      return { success: false, reason: "transfer_lookup_failed" };
    }
    if (preCheck.transfer?.id) {
      log("transfer_already_exists_at_razorpay", { transferId: preCheck.transfer.id });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "paid",
        payoutProcessedAt: Date.now(),
        razorpayTransferId: preCheck.transfer.id,
      });
      return { success: true, reason: "adopted_existing_transfer", transferId: preCheck.transfer.id };
    }

    // ── Claim the payout: eligible/failed -> processing ──────────────────────
    await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
      orderId: args.orderId,
      payoutStatus: "processing",
    });

    try {
      const transferResponse = await fetch(
        `${RAZORPAY_API}/payments/${payment.razorpayPaymentId}/transfers`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transfers: [
              {
                account: boutique.razorpayAccountId,
                amount: payoutPaise,
                currency: "INR",
                notes: {
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  boutiqueId: order.boutiqueId,
                  sellerTier: order.pricingSnapshot?.sellerTierKey ?? "legacy",
                  payoutSource: source,
                  settledPostDelivery: "true",
                },
              },
            ],
          }),
        }
      );

      if (!transferResponse.ok) {
        const errText = await transferResponse.text();
        log("razorpay_error", { status: transferResponse.status, error: errText.substring(0, 300) });

        // The request may have partially succeeded — verify before declaring failure.
        const postCheck = await findExistingTransfer(authHeader, payment.razorpayPaymentId, order._id);
        if (postCheck.ok && postCheck.transfer?.id) {
          await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
            orderId: args.orderId,
            payoutStatus: "paid",
            payoutProcessedAt: Date.now(),
            razorpayTransferId: postCheck.transfer.id,
          });
          return { success: true, reason: "recovered_after_error", transferId: postCheck.transfer.id };
        }

        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "failed",
          payoutFailureReason: `Razorpay API error: ${errText.substring(0, 400)}`,
        });
        return { success: false, reason: "razorpay_error", error: errText };
      }

      const transferData = await transferResponse.json();
      const transferId = transferData.items?.[0]?.id || transferData.id;

      if (!transferId) {
        log("missing_transfer_id");
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "failed",
          payoutFailureReason: "Razorpay returned no transfer id",
        });
        return { success: false, reason: "missing_transfer_id" };
      }

      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "paid",
        payoutProcessedAt: Date.now(),
        razorpayTransferId: transferId,
      });

      log("paid", { transferId, payoutPaise, source });
      return { success: true, transferId, amount: payoutPaise, payoutSource: source };
    } catch (err: any) {
      // Network/timeout: the transfer may still have been created at Razorpay.
      const postCheck = await findExistingTransfer(authHeader, payment.razorpayPaymentId, order._id);
      if (postCheck.ok && postCheck.transfer?.id) {
        log("recovered_after_exception", { transferId: postCheck.transfer.id });
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "paid",
          payoutProcessedAt: Date.now(),
          razorpayTransferId: postCheck.transfer.id,
        });
        return { success: true, reason: "recovered_after_exception", transferId: postCheck.transfer.id };
      }

      log("exception", { error: err?.message || String(err) });
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "failed",
        payoutFailureReason: `Exception: ${(err?.message || String(err)).substring(0, 400)}`,
      });
      return { success: false, reason: "exception", error: err?.message };
    }
  },
});

/**
 * Admin-triggered safe retry for a failed or stuck payout.
 * The underlying action re-verifies with Razorpay before creating anything,
 * so this can never double-pay.
 */
export const retrySellerTransfer: any = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<any> => {
    await ctx.runMutation((internal.orders as any).requirePayoutRetryPermission, {
      orderId: args.orderId,
    });
    return await ctx.runAction(internal.razorpayRoute.createSellerTransfer, {
      orderId: args.orderId,
      allowRetry: true,
    });
  },
});
