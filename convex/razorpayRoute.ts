// convex/razorpayRoute.ts
import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";

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
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new ConvexError("Razorpay credentials not configured");
    }
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

    const boutique = await ctx.runQuery((internal.boutiques as any).getById, {
      id: args.boutiqueId,
    });

    if (!boutique) throw new ConvexError("Boutique not found");

    // 1. Create Linked Account on Razorpay Route
    const accountResponse = await fetch("https://api.razorpay.com/v1/accounts", {
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
      `https://api.razorpay.com/v1/accounts/${accountData.id}/onboarding_links`,
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

export const releasePayout: any = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new ConvexError("Razorpay credentials not configured");
    }
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

    const order = await ctx.runQuery((internal.orders as any).getById, { id: args.orderId });

    if (!order) {
      console.error(`Order ${args.orderId} not found.`);
      return;
    }

    if (order.status !== "delivered") {
      console.log(`Order ${args.orderId} cannot be released: order status is '${order.status}', expected 'delivered'.`);
      return;
    }

    const now = Date.now();
    const claimWindowMs = 48 * 3600 * 1000;
    const deliveredAt = order.deliveredAt || order.createdAt;
    if (now < deliveredAt + claimWindowMs) {
      console.log(`Order ${args.orderId} cannot be released: 48h claim window has not elapsed yet.`);
      return;
    }

    if (!order.razorpayTransferId) {
      console.log(`Order ${args.orderId} has no active transfer ID.`);
      return;
    }

    if (order.transferStatus === "processed") {
      console.log(`Order ${args.orderId} transfer is already processed.`);
      return;
    }

    // Precondition check: verify no active unresolved claims/disputes for this order
    const hasActiveClaims = await ctx.runQuery((internal.claims as any).getOpenClaimByOrderId, { orderId: args.orderId });
    if (hasActiveClaims) {
      console.log(`Order ${args.orderId} release blocked: order has an active unresolved claim/dispute.`);
      return;
    }

    // Call Razorpay REST API to release hold
    const res = await fetch(
      `https://api.razorpay.com/v1/transfers/${order.razorpayTransferId}`,
      {
        method: "POST", // Razorpay Route uses POST to update transfers
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          on_hold: false,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Failed to release hold for transfer ${order.razorpayTransferId}: ${errText}`);
      throw new ConvexError(`Razorpay transfer release failed: ${errText}`);
    }

    await ctx.runMutation((internal.orders as any).updateTransferStatus, {
      orderId: args.orderId,
      transferStatus: "processed",
    });
  },
});

export const getKYCOnboardingLink: any = action({
  args: { razorpayAccountId: v.string() },
  handler: async (ctx, args) => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new ConvexError("Razorpay credentials not configured");
    }
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

    const response = await fetch(
      `https://api.razorpay.com/v1/accounts/${args.razorpayAccountId}/onboarding_links`,
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

// ─── v2: Post-Delivery Seller Transfer ───────────────────────────────────────

/**
 * Creates a new Razorpay Route transfer for seller payout AFTER delivery.
 * This is called when:
 *   1. Order has payoutStatus === "eligible"
 *   2. 48h claim window has elapsed
 *   3. No active disputes/claims
 *
 * Flow: DELIVERED → payoutStatus:"eligible" → this action → payoutStatus:"paid"
 *
 * Idempotent: Will not create duplicate transfers.
 */
export const createSellerTransfer: any = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new ConvexError("Razorpay credentials not configured");
    }
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

    const order = await ctx.runQuery((internal.orders as any).getById, { id: args.orderId });
    if (!order) {
      console.error(`[createSellerTransfer] Order ${args.orderId} not found.`);
      return { success: false, reason: "order_not_found" };
    }

    // Idempotency: skip if already paid or processing
    if (order.payoutStatus === "paid" || order.payoutStatus === "processing") {
      console.log(`[createSellerTransfer] Order ${args.orderId} already ${order.payoutStatus}. Skipping.`);
      return { success: true, reason: "already_processed" };
    }

    // Must be eligible
    if (order.payoutStatus !== "eligible") {
      console.log(`[createSellerTransfer] Order ${args.orderId} payoutStatus is '${order.payoutStatus}', expected 'eligible'.`);
      return { success: false, reason: "not_eligible" };
    }

    // Must be delivered
    if (order.status !== "delivered") {
      console.log(`[createSellerTransfer] Order ${args.orderId} is not delivered.`);
      return { success: false, reason: "not_delivered" };
    }

    // 48h claim window check
    const now = Date.now();
    const claimWindowMs = 48 * 3600 * 1000;
    const deliveredAt = order.deliveredAt || order.payoutEligibleAt || order.createdAt;
    if (now < deliveredAt + claimWindowMs) {
      console.log(`[createSellerTransfer] Order ${args.orderId}: 48h claim window not elapsed.`);
      return { success: false, reason: "claim_window_active" };
    }

    // Check for active disputes
    const hasActiveClaims = await ctx.runQuery((internal.claims as any).getOpenClaimByOrderId, { orderId: args.orderId });
    if (hasActiveClaims) {
      console.log(`[createSellerTransfer] Order ${args.orderId}: has active claim/dispute.`);
      return { success: false, reason: "active_claim" };
    }

    // Get boutique razorpayAccountId
    const boutique = await ctx.runQuery((internal.boutiques as any).getById, { id: order.boutiqueId });
    if (!boutique?.razorpayAccountId) {
      console.error(`[createSellerTransfer] Boutique ${order.boutiqueId} has no razorpayAccountId.`);
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "failed",
        payoutFailureReason: "Boutique has no Razorpay linked account",
      });
      return { success: false, reason: "no_razorpay_account" };
    }

    // Get payment razorpayPaymentId
    if (!order.paymentId) {
      console.error(`[createSellerTransfer] Order ${args.orderId} has no payment record.`);
      return { success: false, reason: "no_payment" };
    }

    const payment = await ctx.runQuery((internal.payments as any).getPaymentById, { paymentId: order.paymentId });
    if (!payment?.razorpayPaymentId) {
      console.error(`[createSellerTransfer] No razorpayPaymentId found for payment ${order.paymentId}.`);
      return { success: false, reason: "no_razorpay_payment_id" };
    }

    // Calculate payout amount from pricing snapshot
    const payoutPaise = order.pricingSnapshot?.sellerPayoutPaise ?? order.commissionAmount
      ? (order.subtotal - order.discount - (order.commissionAmount || 0))
      : Math.floor((order.subtotal - order.discount) * 0.82);

    if (payoutPaise <= 0) {
      console.log(`[createSellerTransfer] Order ${args.orderId}: payout is ${payoutPaise} paise. Skipping.`);
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "paid",
        payoutProcessedAt: now,
      });
      return { success: true, reason: "zero_payout" };
    }

    // Mark as processing before API call
    await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
      orderId: args.orderId,
      payoutStatus: "processing",
    });

    try {
      // Create transfer via Razorpay Route API
      // POST /v1/payments/:paymentId/transfers
      const transferResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${payment.razorpayPaymentId}/transfers`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transfers: [{
              account: boutique.razorpayAccountId,
              amount: payoutPaise,
              currency: "INR",
              on_hold: false, // Immediate settlement — not on_hold since delivery is confirmed
              notes: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                settledPostDelivery: "true",
              },
            }],
          }),
        }
      );

      if (!transferResponse.ok) {
        const errText = await transferResponse.text();
        console.error(`[createSellerTransfer] Razorpay transfer failed for order ${args.orderId}:`, errText);
        await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
          orderId: args.orderId,
          payoutStatus: "failed",
          payoutFailureReason: `Razorpay API error: ${errText.substring(0, 500)}`,
        });
        return { success: false, reason: "razorpay_error", error: errText };
      }

      const transferData = await transferResponse.json();
      const transferId = transferData.items?.[0]?.id || transferData.id;

      // Mark as paid
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "paid",
        payoutProcessedAt: now,
        razorpayTransferId: transferId,
      });

      console.log(`[createSellerTransfer] Transfer ${transferId} created for order ${order.orderNumber}. Amount: ₹${payoutPaise / 100}`);
      return { success: true, transferId, amount: payoutPaise };

    } catch (err: any) {
      console.error(`[createSellerTransfer] Exception for order ${args.orderId}:`, err);
      await ctx.runMutation((internal.orders as any).patchOrderPayoutStatus, {
        orderId: args.orderId,
        payoutStatus: "failed",
        payoutFailureReason: `Exception: ${err.message || String(err)}`,
      });
      return { success: false, reason: "exception", error: err.message };
    }
  },
});
