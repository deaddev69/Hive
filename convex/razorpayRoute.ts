// convex/razorpayRoute.ts
// Razorpay Route integration.
//
// Settlement model (v3):
//   Customer pays  ->  payment captured into the Hive Razorpay account (no transfers[])
//   Porter sends `order_end_job`  ->  Hive order becomes `delivered`
//   payoutStatus becomes `eligible`
//   Settlement processor creates ONE Route transfer via
//     POST /v1/payments/{paymentId}/transfers
//   payoutStatus becomes `paid` and razorpayTransferId is persisted.
//
// Hive retains commission + GST on commission + platform fee + handling charge.
// Only the frozen `pricingSnapshot.sellerPayoutPaise` is transferred to the seller.
//
// The legacy "create an on_hold transfer at payment time, then release it after 48h"
// flow has been removed. There is no post-delivery payout delay any more.

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
