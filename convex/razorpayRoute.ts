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
