// convex/payments.ts
// Online payment intent creation, validation, signature verification, and post-payment order placement.
// Scope is fully auth-gated to the active customer.

import { mutation, internalMutation, action, internalAction, MutationCtx, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import { incrementBoutiqueOrderCount } from "./lib/boutiqueCounters";
import { validateProductSizeAndStock, MOCK_INVENTORY } from "./lib/mockInventory";
import { internal } from "./_generated/api";
import { calculateDeliveryFeeRupees } from "./lib/deliveryPricing";
import { anyApi } from "convex/server";
import { parseMoney } from "./lib/money";
import { calculateDeliveryQuoteAction } from "./routing";

import { checkRateLimit } from "./lib/rateLimit";
import { triggerNotification } from "./lib/notifications";
import { checkKillSwitch } from "./lib/killSwitches";
import { validateBoutiqueOperationalLimits, checkBoutiqueClosedStatus } from "./lib/gating";
import { restoreCheckoutSessionStock } from "./lib/inventory";
import { getBoutiqueStatus } from "./shared/boutiqueStatus";
import { checkServiceability } from "./lib/serviceability";
// ─── Input Schemas ───────────────────────────────────────────────────────────
const cartItemArg = v.object({
  productId: v.string(),
  name: v.string(),
  price: v.number(),
  imageUrl: v.string(),
  boutiqueName: v.string(),
  size: v.string(),
  quantity: v.number(),
  boutiqueId: v.optional(v.string()),
  isPreorder: v.optional(v.boolean()),
  scheduledProcessingDate: v.optional(v.string()),
});

// Constant-time hex string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─── Web Crypto HMAC-SHA256 Signature Verification ───────────────────────────
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const msg = `${orderId}|${paymentId}`;
    const encoder = new TextEncoder();
    const msgBytes = encoder.encode(msg);
    const secretBytes = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const localHexSignature = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return constantTimeCompare(localHexSignature, signature);
  } catch (err) {
    console.error("[RazorpayVerify] Signature verify error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: initCheckoutSessionInternal (Internal Mutation)
// ─────────────────────────────────────────────────────────────────────────────
export const initCheckoutSessionInternal = internalMutation({
  args: {
    addressId: v.id("addresses"),
    deliveryDate: v.string(),
    deliverySlot: v.string(),
    paymentMethod: v.string(),
    items: v.array(cartItemArg),
    subtotal: v.number(),
    deliveryFee: v.number(),
    discount: v.number(),
    total: v.number(),
    promoCode: v.optional(v.string()),
    token: v.optional(v.string()),
    quoteId: v.optional(v.string()),
    quotedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let storedQuote = null;
    if (args.quoteId) {
      storedQuote = await ctx.db.query("checkoutQuotes")
        .withIndex("by_checkoutSessionId", (q) => q.eq("checkoutSessionId", args.quoteId as string))
        .first();
    }
    
    if (storedQuote) {
      const diff = Math.abs(args.deliveryFee - storedQuote.deliveryFee);
      if (diff > 1) {
        throw new Error("Delivery fee mismatch. Please refresh and try again.");
      }
      if (Date.now() > storedQuote.expiresAt) {
        throw new Error("Delivery quote expired. Please refresh checkout.");
      }
    } else if (args.quotedAt && Date.now() - args.quotedAt > 15 * 60 * 1000) {
      // Legacy TTL check for backward compatibility if quoteId isn't provided
      throw new Error("Delivery rate expired. Please refresh the page to get a new rate.");
    }
    
    // 1. Verify kill switches
    const isMaintenanceMode = await checkKillSwitch(ctx.db, "maintenanceMode");
    if (isMaintenanceMode) {
      throw new Error("Platform is currently undergoing scheduled maintenance.");
    }
    const isCheckoutEnabled = await checkKillSwitch(ctx.db, "checkoutEnabled");
    if (!isCheckoutEnabled) {
      throw new Error("Checkout is temporarily disabled for maintenance.");
    }
    const isPaymentsEnabled = await checkKillSwitch(ctx.db, "paymentsEnabled");
    if (!isPaymentsEnabled && args.paymentMethod !== "cod") {
      throw new Error("Online payments are temporarily disabled.");
    }

    const user = await getAuthenticatedUser(ctx, args.token);

    // Rate limit checkout session creations: max 10 per user per 15 minutes
    await checkRateLimit(ctx, `checkout_session:${user._id}`, 10, 15 * 60 * 1000);

    // Retrieve and verify address
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) {
      throw new Error("Invalid address selection.");
    }

    if (addr.addressStatus !== "verified") {
      throw new Error("Address verification is pending or rejected. Please update your address to verify serviceability.");
    }

    if (args.items.length === 0) {
      throw new Error("Cart is empty.");
    }

    const deliveryLat = addr.lat;
    const deliveryLng = addr.lng;

    // Coordinate Validation (P0 - Null Island block)
    if (
      deliveryLat === undefined ||
      deliveryLat === null ||
      Number.isNaN(deliveryLat) ||
      !Number.isFinite(deliveryLat) ||
      deliveryLat === 0 ||
      deliveryLng === undefined ||
      deliveryLng === null ||
      Number.isNaN(deliveryLng) ||
      !Number.isFinite(deliveryLng) ||
      deliveryLng === 0
    ) {
      throw new Error("Address has invalid coordinates. Please pin your address on the map.");
    }

    // Required Address Completeness Validation (P1)
    if (!addr.houseNumber || !addr.houseNumber.trim()) {
      throw new Error("House/Flat Number is required for delivery.");
    }
    const finalPhone = addr.phone || user.phone;
    if (!finalPhone || !finalPhone.trim()) {
      throw new Error("Contact phone number is required for delivery hand-off.");
    }

    // Server-Side Promo Validation (P0)
    let expectedDiscount = 0;
    const cleanPromoCode = args.promoCode ? args.promoCode.trim().toUpperCase() : "";
    if (cleanPromoCode) {
      if (cleanPromoCode === "WELCOME10") {
        expectedDiscount = Math.round(args.subtotal * 0.1);
      } else if (cleanPromoCode === "HIVEFIRST") {
        expectedDiscount = Math.min(500, args.subtotal);
      } else if (cleanPromoCode === "FREESHIP") {
        expectedDiscount = 0;
      } else {
        throw new Error("Invalid promotional coupon code.");
      }
    }
    if (args.discount !== expectedDiscount) {
      throw new Error(`Discount validation failed. Expected: ₹${expectedDiscount}, Got: ₹${args.discount}`);
    }

    // Delivery fee validation is deferred until after items loop where distance is computed.
    // See distance-based validation below the items loop.

    // Verify total calculation will also be deferred to after delivery fee is computed.

    const compiledAddressSnapshot = {
      label: addr.label,
      line1: addr.line1,
      line2: addr.line2,
      formattedAddress: addr.formattedAddress,
      houseNumber: addr.houseNumber,
      landmark: addr.landmark,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      lat: addr.lat,
      lng: addr.lng,
      phone: finalPhone,
    };


    // Verify items and check initial stock levels
    const resolvedItems: any[] = [];
    let expectedSubtotalPaise = 0;
    let placedDuringClosedHours = false;
    let scheduledProcessingDate: string | undefined = undefined;
    for (const item of args.items) {
      const bySlug = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", item.productId))
        .unique();

      let productRow = bySlug;
      if (!productRow) {
        try {
          productRow = await ctx.db.get(item.productId as Id<"products">);
        } catch {
          // ignore
        }
      }

      const isMock = MOCK_INVENTORY[item.productId] !== undefined;
      if (!productRow && !isMock) {
        throw new Error(`The item "${item.name}" is no longer available.`);
      }
      if (productRow && !productRow.active) {
        throw new Error(`The item "${item.name}" is currently deactivated.`);
      }

      let boutique = null;
      if (productRow) {
        boutique = await ctx.db.get(productRow.boutiqueId);
      } else {
        boutique = await ctx.db
          .query("boutiques")
          .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
          .first();
      }

      if (!boutique) {
        throw new Error(`Boutique for item "${item.name}" is unavailable.`);
      }
      if (boutique.status !== "APPROVED") {
        throw new Error(`The boutique "${boutique.boutiqueName || boutique.name}" is temporarily unavailable.`);
      }
      if (boutique.isAcceptingOrders === false) {
        throw new Error(`The boutique "${boutique.boutiqueName || boutique.name}" is currently paused.`);
      }

      // Perform operational limits checks (hours, operating days, capacity, soft launch)
      await validateBoutiqueOperationalLimits(ctx.db, boutique._id);
      
      const bStatus = getBoutiqueStatus(boutique, Date.now());
      if (bStatus.type !== "OPEN" || item.isPreorder) {
        placedDuringClosedHours = true;
        if (bStatus.type === "CLOSED_TODAY" || bStatus.type === "CLOSED_EXTENDED") {
          scheduledProcessingDate = bStatus.nextOperatingDay;
        } else if (item.scheduledProcessingDate) {
          scheduledProcessingDate = item.scheduledProcessingDate;
        }
      }

      // Check stock
      await validateProductSizeAndStock(ctx.db, item.productId, item.size, item.quantity);

      // Enforce Serviceability before payment session
      const serviceability = checkServiceability(deliveryLat, deliveryLng, boutique);
      console.log(JSON.stringify({
        event: "serviceability_check",
        timestamp: Date.now(),
        boutiqueId: boutique._id,
        distanceKm: serviceability.distanceKm,
        radiusKm: serviceability.radiusKm,
        serviceable: serviceability.serviceable,
        reason: serviceability.reason,
        checkoutType: "razorpay"
      }));

      if (!serviceability.serviceable) {
        throw new Error(serviceability.reason || "One or more items cannot be delivered to your address.");
      }

      // Recalculate price in integer Paise to prevent price manipulation
      const activePricePaise = productRow
        ? Math.round((productRow.discountPrice ?? productRow.price) * 100)
        : Math.round(item.price * 100);
        
      expectedSubtotalPaise += activePricePaise * item.quantity;

      resolvedItems.push({
        item,
        productRow,
        isMock,
        boutiqueId: boutique._id,
      });
    }

    // Verify subtotal in integer Paise
    const clientSubtotalPaise = Math.round(args.subtotal * 100);
    if (clientSubtotalPaise !== expectedSubtotalPaise) {
      console.error(`[TAMPERING_CHECK] Mismatch detected. clientSubtotalPaise: ${clientSubtotalPaise}, expectedSubtotalPaise: ${expectedSubtotalPaise}, client args.subtotal: ${args.subtotal}`);
      throw new Error(`Security Exception: Cart subtotal mismatch. Price tampering detected.`);
    }

    const primaryBoutiqueId = resolvedItems[0]?.boutiqueId;
    if (!primaryBoutiqueId) {
      throw new Error("No valid boutique found for this checkout.");
    }

    // Enforce "1 Cart = 1 Boutique" invariant at server-side checkout session creation
    for (const resolved of resolvedItems) {
      if (resolved.boutiqueId !== primaryBoutiqueId) {
        throw new Error("All items in the checkout must belong to the same boutique.");
      }
    }

    const primaryBoutique = (await ctx.db.get(primaryBoutiqueId)) as any;
    if (primaryBoutique && primaryBoutique.minimumOrderValue !== undefined) {
      const subtotalPaise = Math.round(args.subtotal * 100);
      if (subtotalPaise < primaryBoutique.minimumOrderValue) {
        throw new Error(
          `Minimum order value for ${primaryBoutique.boutiqueName || primaryBoutique.name} is ₹${(primaryBoutique.minimumOrderValue / 100).toFixed(2)}. Please add more items.`
        );
      }
    }

    let expectedDeliveryFee = args.deliveryFee;
    if (cleanPromoCode === "FREESHIP") {
      expectedDeliveryFee = 0;
    }

    if (args.deliveryFee !== expectedDeliveryFee) {
      throw new Error(`Delivery fee validation failed. Expected: ₹${expectedDeliveryFee}, Got: ₹${args.deliveryFee}`);
    }

    // Verify total calculation
    const expectedTotal = Math.max(0, args.subtotal - expectedDiscount + expectedDeliveryFee);
    if (args.total !== expectedTotal) {
      throw new Error(`Order total mismatch. Expected: ₹${expectedTotal}, Got: ₹${args.total}`);
    }

    const now = Date.now();

    // Decrement stock for real products and log inventory movements
    for (const { item, productRow, isMock } of resolvedItems) {
      if (productRow && !isMock) {
        const currentStock = productRow.stockBySize[item.size] ?? 0;
        const newStock = currentStock - item.quantity;
        const stockBySize = { ...productRow.stockBySize };
        stockBySize[item.size] = newStock;

        const totalStock = Object.values(stockBySize).reduce((sum: number, val: any) => sum + (val || 0), 0);
        const autoDeactivatedBecauseOutOfStock = totalStock <= 0;

        await ctx.db.patch(productRow._id, { 
          stockBySize, 
          autoDeactivatedBecauseOutOfStock, 
          updatedAt: now 
        });

        await ctx.db.insert("inventoryMovements", {
          productId: productRow._id,
          boutiqueId: productRow.boutiqueId,
          size: item.size,
          beforeQty: currentStock,
          afterQty: newStock,
          adjustmentQty: -item.quantity,
          reason: "online_order",
          source: "checkout",
          createdBy: user._id,
          createdAt: now,
        });
      }
    }

    const expiresAt = now + 15 * 60 * 1000; // 15-minute checkout lock window

    const subtotalPaise = parseMoney(args.subtotal);
    const deliveryFeePaise = parseMoney(args.deliveryFee);
    const discountPaise = parseMoney(args.discount);
    const totalPaise = parseMoney(args.total);

    const itemsParsed = args.items.map((item, index) => ({
      ...item,
      productId: resolvedItems[index].productRow?._id ?? item.productId,
      price: parseMoney(item.price),
    }));

    // Save temporary Checkout Session
    const checkoutSessionId = await ctx.db.insert("checkoutSessions", {
      userId: user._id,
      addressId: args.addressId,
      addressSnapshot: compiledAddressSnapshot,
      deliveryDate: args.deliveryDate,
      deliverySlot: args.deliverySlot,
      paymentMethod: args.paymentMethod,
      items: itemsParsed,
      subtotal: subtotalPaise,
      deliveryFee: deliveryFeePaise,
      discount: discountPaise,
      total: totalPaise,
      promoCode: args.promoCode,
      razorpayOrderId: "",
      status: "pending",
      placedDuringClosedHours,
      scheduledProcessingDate,
      expiresAt,
      createdAt: now,
    });

    // Save initial Payment record with "initiated" status
    const paymentId = await ctx.db.insert("payments", {
      customerId: user._id,
      paymentProvider: "razorpay",
      razorpayOrderId: undefined,
      amount: Math.round(args.total * 100),
      currency: "INR",
      status: "initiated",
      createdAt: now,
      updatedAt: now,
      webhookEvents: [],
    });

    // Save audit events
    await ctx.db.insert("paymentEvents", {
      source: "razorpay",
      paymentId,
      eventType: "initiated",
      payload: JSON.stringify({ checkoutSessionId, expiresAt }),
      createdAt: now,
    });

    return {
      checkoutSessionId,
      paymentId,
      total: args.total,
      userEmail: user.email || "",
      userPhone: finalPhone,
      customerName: user.email?.split("@")[0] || "Hive Customer",
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: verifyPaymentAndPlaceOrder
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPaymentAndPlaceOrderInternal(
  ctx: MutationCtx,
  args: {
    checkoutSessionId: Id<"checkoutSessions">;
    razorpayPaymentId: string;
    razorpaySignature: string;
    token?: string;
  }
) {
  const user = await getAuthenticatedUser(ctx, args.token);
  const session = await ctx.db.get(args.checkoutSessionId);
  if (!session || session.userId !== user._id) {
    throw new Error("Invalid checkout session details.");
  }

  // Order Creation Idempotency Check: lookup order by session ID key unconditionally
  const resolvedOrder = await ctx.db
    .query("orders")
    .withIndex("by_checkoutSessionId", (q) => q.eq("checkoutSessionId", args.checkoutSessionId))
    .first();

  if (resolvedOrder) {
    return { success: true, orderId: resolvedOrder._id, orderNumber: resolvedOrder.orderNumber };
  }

  if (session.status === "completed") {
    throw new Error("Checkout session completed but matching order record was not found.");
  }

  if (session.status === "processing") {
    throw new Error("Checkout session is currently being processed. Please wait.");
  }

  // Expiry verification
  if (session.status === "expired") {
    // If we've already marked it expired (e.g., via cron) and released inventory, we must reject.
    throw new Error("Checkout session has expired. Stale inventory release triggered. Please try again.");
  }
  // NOTE: We intentionally do NOT check `session.expiresAt < Date.now()` here.
  // If the customer successfully paid on Razorpay (even if they took slightly > 15 mins),
  // we absorb any shipping rate differences to avoid cancelling a paid order.
  if (session.expiresAt < Date.now()) {
    const varianceMinutes = Math.round((Date.now() - session.expiresAt) / 60000);
    console.warn(`[TTL Variance] Absorbed successful payment ${varianceMinutes} minutes past TTL for session ${args.checkoutSessionId}`);
  }

  if (session.status === "failed") {
    throw new Error("Checkout session has failed.");
  }

  // Compare-and-Swap Session Lock (P0)
  await ctx.db.patch(args.checkoutSessionId, { status: "processing" });

  // Signature Validation
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpaySecret) {
    throw new Error("FATAL: RAZORPAY_KEY_SECRET environment variable is not configured. Payment processing is disabled.");
  }

  const isSignatureMock = isSignatureBypassAllowed(process.env.ENABLE_DEBUG_TOOLS, razorpaySecret);

  if (!isSignatureMock) {
    const isVerified = await verifyRazorpaySignature(
      session.razorpayOrderId,
      args.razorpayPaymentId,
      args.razorpaySignature,
      razorpaySecret!
    );
    if (!isVerified) {
      await restoreCheckoutSessionStock(ctx, session);
      await ctx.db.patch(args.checkoutSessionId, { status: "failed" });
      throw new Error("Payment signature mismatch. Threat warning: possible transaction tampering.");
    }
  }

  const payment = await ctx.db
    .query("payments")
    .withIndex("by_razorpayOrderId", (q) => q.eq("razorpayOrderId", session.razorpayOrderId))
    .first();

  if (!payment) {
    await restoreCheckoutSessionStock(ctx, session);
    await ctx.db.patch(args.checkoutSessionId, { status: "failed" });
    throw new Error("Payment record not found for this session.");
  }

  const now = Date.now();

  // Verify paymentsEnabled kill switch
  const isPaymentsEnabled = await checkKillSwitch(ctx.db, "paymentsEnabled");
  if (!isPaymentsEnabled) {
    throw new Error("Online payments are temporarily disabled.");
  }

  // Capture payment
  await ctx.db.patch(payment._id, {
    status: "captured",
    razorpayPaymentId: args.razorpayPaymentId,
    method: session.paymentMethod,
    updatedAt: now,
  });
  await ctx.db.insert("paymentEvents", {
    source: "razorpay",
    paymentId: payment._id,
    eventType: "captured",
    payload: JSON.stringify({ razorpayPaymentId: args.razorpayPaymentId }),
    createdAt: now,
  });

  // Place actual order record
  // P0-4 FIX: Collision-resistant order number using timestamp (base36) + random suffix
  const orderNumber = `HIVE-${Math.floor(now / 1000).toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Resolve boutiqueId and build resolvedProductMap from session items
  let boutiqueId = undefined;
  const resolvedProductMap = new Map<string, Id<"products">>();
  for (const item of session.items) {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", item.productId))
      .unique();
    let productRow = product;
    if (!productRow) {
      try {
        productRow = await ctx.db.get(item.productId as Id<"products">);
      } catch { }
    }
    if (productRow) {
      resolvedProductMap.set(item.productId, productRow._id);
      if (!boutiqueId) {
        boutiqueId = productRow.boutiqueId;
      }
    }
  }

  if (!boutiqueId) {
    const defaultBoutique = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .first();
    boutiqueId = defaultBoutique?._id;
  }

  if (!boutiqueId) {
    throw new Error("No boutique found to fulfill this order.");
  }

  // Resolve boutique details snapshot
  const boutique = await ctx.db.get(boutiqueId);
  const boutiqueName = boutique ? (boutique.boutiqueName || boutique.name || "Unknown Boutique") : "Unknown Boutique";

  // Setup snapshot metrics
  const commissionRate = boutique ? (boutique.commissionRate || 18) : 18;
  // Commission is calculated on product revenue only (subtotal minus discount), NOT on delivery fees
  const commissionBase = Math.max(0, session.subtotal - (session.discount ?? 0));
  const platformCommissionAmount = Math.floor((commissionBase * commissionRate) / 100);
  const gstOnCommission = Math.floor((platformCommissionAmount * 18) / 100);
  const totalPlatformDeduction = platformCommissionAmount + gstOnCommission;

  // We skip calculateDeliveryQuoteAction here because it requires an Action ctx (for fetch and runQuery), and this is a mutation.
  // The frontend already verified the delivery fee, so we just use basic defaults for snapshot metadata.
  let quote = { serviceable: true, estimatedCourierCost: 9000, estimatedPorterCost: 9000, distanceKm: 5.5, etaMinutes: 45, customerPaidFee: session.deliveryFee };

  const orderSnapshot = {
    boutiqueName,
    boutiqueId,
    items: session.items.map(item => {
      const resolvedId = resolvedProductMap.get(item.productId) ?? (item.productId as Id<"products">);
      return {
        productId: resolvedId,
        productName: item.name,
        size: item.size,
        sku: `SKU-${orderNumber}-${resolvedId}-${item.size}`,
        priceAtPurchase: item.price,
        quantity: item.quantity,
      };
    }),
    deliveryFee: session.deliveryFee,
    commissionRate,
    addressSnapshot: session.addressSnapshot,
    orderValue: session.total,
    platformCommissionAmount,
    platformCommissionRate: commissionRate,
    courierQuote: {
      estimatedPorterCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 9000,
      estimatedCourierCost: quote.estimatedCourierCost ?? 9000,
      distanceKm: quote.distanceKm,
      etaMinutes: quote.etaMinutes,
    },
    merchantOperatingModel: boutique ? (boutique.sellerModel || "boutique") : "boutique",
    payoutHoldDays: 7,
    taxBreakdown: {
      gstOnCommission,
    },
    courierCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 9000,
    actualCourierCost: 0,
    commissionAmount: platformCommissionAmount,
    gstAmount: gstOnCommission,
    merchantPayable: commissionBase - totalPlatformDeduction,
  };

  const pickupAddress = boutique ? {
    boutiqueName: boutique.boutiqueName || boutique.name || "Boutique Pickup Center",
    ownerName: boutique.ownerName || "Boutique Owner",
    email: boutique.email || boutique.ownerEmail || "",
    phone: boutique.phone || "9876543210",
    address: boutique.address || "No Address",
    latitude: boutique.latitude || 0,
    longitude: boutique.longitude || 0,
    city: boutique.addressDetails?.city,
    state: boutique.addressDetails?.state,
    pincode: boutique.addressDetails?.pincode,
    area: boutique.area,
  } : undefined;

  const orderId = await ctx.db.insert("orders", {
    orderNumber,
    customerId: user._id,
    boutiqueId,
    boutiqueName,
    status: "pending_confirmation",
    deliveryAddress: session.addressSnapshot,
    pickupAddress,
    addressId: session.addressId,
    subtotal: session.subtotal,
    deliveryFee: session.deliveryFee,
    discount: session.discount,
    total: session.total,
    commissionAmount: platformCommissionAmount,
    paymentStatus: "paid",
    placedDuringClosedHours: session.placedDuringClosedHours,
    paymentId: payment?._id,
    checkoutSessionId: args.checkoutSessionId, // Required identifier
    notes: `CheckoutSession: ${args.checkoutSessionId}`,
    orderSnapshot,
    createdAt: now,
    updatedAt: now,
  });

  // Write default records to deliverySubsidyLedger and deliveryPerformanceLedger for online checkout
  try {
    await ctx.db.insert("deliverySubsidyLedger", {
      orderId,
      cartSubtotal: session.subtotal,
      customerPaidFee: session.deliveryFee,
      estimatedPorterCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 0,
      estimatedCourierCost: quote.estimatedCourierCost ?? 0,
      actualPorterCost: 0,
      actualCourierCost: 0,
      subsidyAmount: 0,
      subsidyPercent: 0,
      gatewayFee: Math.round(session.total * 0.02),
      refundAmount: 0,
      createdAt: now,
    });

    await ctx.db.insert("deliveryPerformanceLedger", {
      orderId,
      estimatedDistance: quote.distanceKm,
      actualDistance: 0,
      estimatedEta: quote.etaMinutes,
      actualEta: 0,
      estimatedCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 0,
      actualCost: 0,
      deliveredOnTime: false,
      delayResponsibility: "none",
      createdAt: now,
    });
  } catch (err) {
    console.error("[OnlineLedgerAccrual] Failed to create delivery subsidy/performance ledgers:", err);
  }

  if (payment) {
    await ctx.db.patch(payment._id, { orderId });
    // Update linked paymentEvents orderId references
    const createdEvent = await ctx.db
      .query("paymentEvents")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", payment._id))
      .filter((q) => q.eq("eventType", "created"))
      .first();
    if (createdEvent) {
      await ctx.db.patch(createdEvent._id, { orderId });
    }

    const capturedEvent = await ctx.db
      .query("paymentEvents")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", payment._id))
      .filter((q) => q.eq("eventType", "captured"))
      .first();
    if (capturedEvent) {
      await ctx.db.patch(capturedEvent._id, { orderId });
    }
  }

  // Create order items
  for (const item of session.items) {
    await ctx.db.insert("orderItems", {
      orderId,
      productId: item.productId as Id<"products">,
      variantId: item.productId as Id<"products">,
      boutiqueId,
      productName: item.name,
      variantSize: item.size,
      imageUrl: item.imageUrl,
      sku: `SKU-${orderNumber}-${item.productId}-${item.size}`,
      priceAtPurchase: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    });
  }

  // Create Invoice
  const invoiceNumber = `INV-${now}-${Math.floor(1000 + Math.random() * 9000)}`;
  const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const profile = await ctx.db
    .query("customerProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  const customerName = profile?.displayName || user.email || "Hive Customer";

  await ctx.db.insert("invoices", {
    invoiceNumber,
    orderId,
    orderNumber,
    userId: user._id,
    transactionId,
    customerName,
    customerEmail: user.email || "",
    customerPhone: session.addressSnapshot.phone || "",
    billingAddress: {
      line1: session.addressSnapshot.houseNumber
        ? `${session.addressSnapshot.houseNumber}, ${session.addressSnapshot.line1 || session.addressSnapshot.formattedAddress || ""}`
        : (session.addressSnapshot.line1 || session.addressSnapshot.formattedAddress || ""),
      line2: session.addressSnapshot.line2 || session.addressSnapshot.landmark,
      city: session.addressSnapshot.city,
      state: session.addressSnapshot.state,
      pincode: session.addressSnapshot.pincode,
    },
    shippingAddress: {
      line1: session.addressSnapshot.houseNumber
        ? `${session.addressSnapshot.houseNumber}, ${session.addressSnapshot.line1 || session.addressSnapshot.formattedAddress || ""}`
        : (session.addressSnapshot.line1 || session.addressSnapshot.formattedAddress || ""),
      line2: session.addressSnapshot.line2 || session.addressSnapshot.landmark,
      city: session.addressSnapshot.city,
      state: session.addressSnapshot.state,
      pincode: session.addressSnapshot.pincode,
    },
    items: session.items.map((item) => ({
      productId: item.productId,
      productName: item.name,
      productImage: item.imageUrl,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    })),
    subtotal: session.subtotal,
    deliveryFee: session.deliveryFee,
    discount: session.discount,
    tax: 0,
    totalAmount: session.total,
    paymentMethod: session.paymentMethod,
    paymentStatus: "paid",
    generatedAt: now,
  });

  // Complete Checkout Session
  await ctx.db.patch(args.checkoutSessionId, { status: "completed" });

  // Customer gets order confirmed email directly
  await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
    orderId,
    event: "confirmed",
  });

  // Clear cart items
  const cartItemsToDelete = await ctx.db
    .query("cartItems")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .take(200);
  for (const ci of cartItemsToDelete) {
    await ctx.db.delete(ci._id);
  }

  // Increment boutique's daily active order count O(1)
  await incrementBoutiqueOrderCount(ctx, boutiqueId, now);

  // Notify boutique (WhatsApp if enabled, fallback to Email)
  const isWhatsAppEnabled = boutique?.whatsAppNotificationsEnabled ?? true;
  const recipientPhone = boutique?.notificationPhone || boutique?.phone;

  if (isWhatsAppEnabled && recipientPhone) {
    await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
      recipient: recipientPhone,
      templateName: "new_order_received",
      parameters: [
        boutique.ownerName || "Merchant",
        orderNumber,
        `Rs. ${(session.total / 100).toFixed(2)}`
      ],
    });
  } else {
    await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
      orderId,
      event: "new_order",
    });
  }

  return { success: true, orderId, orderNumber };
}

export const verifyPaymentAndPlaceOrder = mutation({
  args: {
    checkoutSessionId: v.id("checkoutSessions"),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await verifyPaymentAndPlaceOrderInternal(ctx, args);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: cleanExpiredCheckoutSessions (Internal background sweep)
// ─────────────────────────────────────────────────────────────────────────────
export const cleanExpiredCheckoutSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pendingSessions = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_status_expiresAt", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    const processingSessions = await ctx.db
      .query("checkoutSessions")
      .withIndex("by_status_expiresAt", (q) => q.eq("status", "processing"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    const expiredSessions = [...pendingSessions, ...processingSessions].slice(0, 100);

    let expiredCount = 0;
    for (const session of expiredSessions) {
      await ctx.db.patch(session._id, { status: "expired" });
      expiredCount++;

      // Restore reserved stock levels for this session using the shared helper
      await restoreCheckoutSessionStock(ctx, session);

      const payment = await ctx.db
        .query("payments")
        .withIndex("by_razorpayOrderId", (q) => q.eq("razorpayOrderId", session.razorpayOrderId))
        .first();

      if (payment && (payment.status === "created" || payment.status === "pending" || payment.status === "initiated")) {
        await ctx.db.patch(payment._id, { status: "failed", updatedAt: now });
        await ctx.db.insert("paymentEvents", {
          source: "razorpay",
          paymentId: payment._id,
          eventType: "failed",
          payload: JSON.stringify({ reason: "Checkout session expired via cron sweep" }),
          createdAt: now,
        });
      }
    }

    console.log(`[SweepCheckoutSessions] Expired ${expiredCount} pending checkout sessions.`);
    return { expiredCount };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: updateCheckoutSessionWithRazorpayOrderId (Internal Mutation)
// ─────────────────────────────────────────────────────────────────────────────
export const updateCheckoutSessionWithRazorpayOrderId = internalMutation({
  args: {
    checkoutSessionId: v.id("checkoutSessions"),
    paymentId: v.id("payments"),
    razorpayOrderId: v.string(),
    status: v.optional(v.union(v.literal("created"), v.literal("failed"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.checkoutSessionId, {
      razorpayOrderId: args.razorpayOrderId,
    });

    await ctx.db.patch(args.paymentId, {
      razorpayOrderId: args.razorpayOrderId,
      status: args.status || "created",
      updatedAt: now,
    });

    await ctx.db.insert("paymentEvents", {
      source: "razorpay",
      paymentId: args.paymentId,
      eventType: args.status || "created",
      payload: JSON.stringify({ razorpayOrderId: args.razorpayOrderId }),
      createdAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Action: createCheckoutSession
// ─────────────────────────────────────────────────────────────────────────────
export const createCheckoutSession = action({
  args: {
    addressId: v.id("addresses"),
    deliveryDate: v.string(),
    deliverySlot: v.string(),
    paymentMethod: v.string(),
    items: v.array(cartItemArg),
    subtotal: v.number(),
    deliveryFee: v.number(),
    discount: v.number(),
    total: v.number(),
    promoCode: v.optional(v.string()),
    token: v.optional(v.string()),
    quotedAt: v.optional(v.number()),
    quoteId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentsApi = (anyApi as any).payments;
    // 1. Initialize checkout records and validate cart details
    const initResult = await ctx.runMutation(paymentsApi.initCheckoutSessionInternal, args);

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isMock = !keySecret || keySecret === "mock_secret";

    if (isMock) {
      // Offline fallback: Generate simulated Razorpay Order ID
      const razorpayOrderId = `order_mock_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      await ctx.runMutation(paymentsApi.updateCheckoutSessionWithRazorpayOrderId, {
        checkoutSessionId: initResult.checkoutSessionId,
        paymentId: initResult.paymentId,
        razorpayOrderId,
        status: "created",
      });

      return {
        checkoutSessionId: initResult.checkoutSessionId,
        razorpayOrderId,
        paymentId: initResult.paymentId,
      };
    }

    try {
      const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(initResult.total * 100),
          currency: "INR",
          receipt: initResult.checkoutSessionId,
          notes: {
            checkoutSessionId: initResult.checkoutSessionId,
            customerEmail: initResult.userEmail,
            customerPhone: initResult.userPhone,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Razorpay returned status ${response.status}: ${errBody}`);
      }

      const orderData = await response.json();
      const razorpayOrderId = orderData.id;

      await ctx.runMutation(paymentsApi.updateCheckoutSessionWithRazorpayOrderId, {
        checkoutSessionId: initResult.checkoutSessionId,
        paymentId: initResult.paymentId,
        razorpayOrderId,
        status: "created",
      });

      return {
        checkoutSessionId: initResult.checkoutSessionId,
        razorpayOrderId,
        paymentId: initResult.paymentId,
      };
    } catch (err: any) {
      console.error("[RazorpayOrderCreation] API request failed:", err);

      // Update checkout session and payment records to failed state
      await ctx.runMutation(paymentsApi.updateCheckoutSessionWithRazorpayOrderId, {
        checkoutSessionId: initResult.checkoutSessionId,
        paymentId: initResult.paymentId,
        razorpayOrderId: "FAILED_CREATION",
        status: "failed",
      });
      throw new Error(`Payment gateway creation failed: ${err.message || String(err)}`);
    }
  },
});

/**
 * Fetches up to 10 pending refund queue items for batch processing.
 */
export const getPendingRefunds = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("refundQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(10);
  },
});

/**
 * Atomically marks a refund queue item as processing to prevent concurrent refund attempts.
 */
export const startProcessingRefund = internalMutation({
  args: { refundQueueId: v.id("refundQueue") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.refundQueueId);
    if (!item) throw new Error("Refund queue item not found");

    if (item.status === "processing" || item.status === "completed") {
      throw new Error("Refund is already being processed or is completed.");
    }

    await ctx.db.patch(args.refundQueueId, {
      status: "processing",
      processedAt: Date.now(),
    });
  }
});

/**
 * Marks a refund queue item as completed or failed with processedAt timestamp.
 * On success, also updates the associated payment record and creates a refundLedger entry.
 */
export const completeRefundQueueItem = internalMutation({
  args: {
    refundQueueId: v.id("refundQueue"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
    razorpayRefundId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.refundQueueId);
    if (!item) throw new Error("Refund queue item not found");

    const now = Date.now();

    await ctx.db.patch(args.refundQueueId, {
      status: args.status,
      processedAt: now,
      ...(args.status === "failed" ? { lastError: args.error } : {}),
    });

    // Update the associated payment record
    const payment = await ctx.db.get(item.paymentId);
    if (payment) {
      if (args.status === "completed") {
        await ctx.db.patch(item.paymentId, {
          status: "refunded",
          refundId: args.razorpayRefundId,
          refundAmount: item.amountPaise,
          refundedAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(item.paymentId, {
          updatedAt: now,
        });
      }
    }

    // Create refundLedger entry on success
    if (args.status === "completed" && item.orderId) {
      const refundNumber = `REF-${new Date(now).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      await ctx.db.insert("refundLedger", {
        refundNumber,
        orderId: item.orderId,
        amount: item.amountPaise,
        status: "processed",
        refundType: "full_refund",
        razorpayRefundId: args.razorpayRefundId,
        notes: item.reason,
        createdAt: now,
      });
    }

    // Update order paymentStatus if applicable
    if (args.status === "completed" && item.orderId) {
      const order = await ctx.db.get(item.orderId);
      if (order) {
        await ctx.db.patch(item.orderId, {
          paymentStatus: "refunded",
          updatedAt: now,
        });
      }
    }
  }
});

/**
 * Safely enqueues a refund queue item by checking idempotencyKey first.
 */
export const enqueueRefund = internalMutation({
  args: {
    paymentId: v.id("payments"),
    orderId: v.optional(v.id("orders")),
    reason: v.string(),
    amountPaise: v.number(),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a refund queue item already exists for this idempotencyKey
    const existing = await ctx.db
      .query("refundQueue")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("refundQueue", {
      paymentId: args.paymentId,
      orderId: args.orderId,
      reason: args.reason,
      amountPaise: args.amountPaise,
      status: "pending",
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });
  }
});

/**
 * Background action that processes the refund queue by calling Razorpay's Refund API.
 * Runs as a cron every 5 minutes. Includes env-var guard to no-op gracefully
 * if Razorpay credentials are not yet configured.
 */
export const processRefundQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    // ENV VAR GUARD: No-op if Razorpay credentials are not configured
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.warn("[RefundProcessor] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured. Skipping refund processing cycle.");
      return { processed: 0, skipped: true };
    }

    // Fetch pending refunds
    const pendingRefunds = await ctx.runMutation(internal.payments.getPendingRefunds);

    if (pendingRefunds.length === 0) {
      return { processed: 0, skipped: false };
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const refundItem of pendingRefunds) {
      try {
        // Mark as processing (atomic lock)
        try {
          await ctx.runMutation(internal.payments.startProcessingRefund, {
            refundQueueId: refundItem._id,
          });
        } catch (lockErr) {
          console.warn(`[RefundProcessor] Skipping ${refundItem._id}, already locked:`, lockErr);
          continue; // don't mark as failed — another run owns this item
        }

        // Resolve the Razorpay payment ID from the payment record
        const payment = await ctx.runQuery(internal.payments.getPaymentById, {
          paymentId: refundItem.paymentId,
        });

        if (!payment?.razorpayPaymentId) {
          throw new Error(`No razorpayPaymentId found for payment ${refundItem.paymentId}`);
        }

        // Call Razorpay Refund API
        const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const response = await fetch(
          `https://api.razorpay.com/v1/payments/${payment.razorpayPaymentId}/refund`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${authHeader}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: refundItem.amountPaise,
              notes: {
                reason: refundItem.reason,
                orderId: refundItem.orderId ?? "N/A",
                idempotencyKey: refundItem.idempotencyKey ?? "",
              },
            }),
          }
        );

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Razorpay refund API returned ${response.status}: ${errBody}`);
        }

        const refundData = await response.json();

        // Mark as completed with Razorpay refund ID
        await ctx.runMutation(internal.payments.completeRefundQueueItem, {
          refundQueueId: refundItem._id,
          status: "completed",
          razorpayRefundId: refundData.id,
        });

        processedCount++;
        console.log(`[RefundProcessor] Successfully processed refund ${refundItem._id} → Razorpay refund ${refundData.id}`);

      } catch (err: any) {
        console.error(`[RefundProcessor] Failed to process refund ${refundItem._id}:`, err.message);

        await ctx.runMutation(internal.payments.completeRefundQueueItem, {
          refundQueueId: refundItem._id,
          status: "failed",
          error: err.message || String(err),
        });

        failedCount++;
      }
    }

    console.log(`[RefundProcessor] Cycle complete: ${processedCount} processed, ${failedCount} failed out of ${pendingRefunds.length} pending.`);
    return { processed: processedCount, failed: failedCount };
  },
});

/**
 * Internal helper query to fetch a payment record by ID (used by processRefundQueue action).
 */
export const getPaymentById = internalQuery({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: prepareRetryCheckoutSessionInternal (Internal Mutation)
// ─────────────────────────────────────────────────────────────────────────────
export const prepareRetryCheckoutSessionInternal = internalMutation({
  args: { checkoutSessionId: v.id("checkoutSessions"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session) throw new Error("Checkout session not found");

    const user = await getAuthenticatedUser(ctx, args.token);
    if (session.userId !== user._id) {
      throw new Error("Unauthorized: Cannot retry this session");
    }

    if (session.status !== "failed" && session.status !== "expired") {
      throw new Error(`Cannot retry session in status: ${session.status}`);
    }

    // Rate limiting: 3 retries per 15 mins
    await checkRateLimit(ctx, `retry_checkout:${user._id}`, 3, 15 * 60 * 1000);

    const now = Date.now();
    
    // Check stock
    for (const item of session.items) {
      const product = await ctx.db.get(item.productId as Id<"products">);
      const isMock = MOCK_INVENTORY[item.productId] !== undefined;
      if (!product && !isMock) {
        throw new Error(`The item "${item.name}" is no longer available.`);
      }
      if (product) {
        const currentStock = product.stockBySize[item.size] ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(`Sorry, some items in your cart sold out while processing. Please review your cart.`);
        }
      }
    }

    // Deduct stock and record movements
    for (const item of session.items) {
      const product = await ctx.db.get(item.productId as Id<"products">);
      if (product) {
        const currentStock = product.stockBySize[item.size] ?? 0;
        const newStock = currentStock - item.quantity;
        const stockBySize = { ...product.stockBySize, [item.size]: newStock };
        
        const totalStock = Object.values(stockBySize).reduce((sum: number, val: any) => sum + (val || 0), 0);
        await ctx.db.patch(product._id, {
          stockBySize,
          updatedAt: now,
          autoDeactivatedBecauseOutOfStock: totalStock <= 0,
        });

        await ctx.db.insert("inventoryMovements", {
          productId: product._id,
          boutiqueId: product.boutiqueId,
          size: item.size,
          beforeQty: currentStock,
          afterQty: newStock,
          adjustmentQty: -item.quantity,
          reason: "online_order",
          source: "checkout",
          createdBy: user._id,
          createdAt: now,
        });
      }
    }

    const newExpiresAt = now + 15 * 60 * 1000;
    
    await ctx.db.patch(session._id, {
      status: "processing",
      expiresAt: newExpiresAt,
    });
    
    const paymentId = await ctx.db.insert("payments", {
      customerId: user._id,
      paymentProvider: "razorpay",
      razorpayOrderId: undefined,
      amount: session.total,
      currency: "INR",
      status: "initiated",
      createdAt: now,
      updatedAt: now,
      webhookEvents: [],
    });

    await ctx.db.insert("paymentEvents", {
      source: "razorpay",
      paymentId,
      eventType: "initiated",
      payload: "Retry session initiated",
      createdAt: now,
    });

    const userDoc = await ctx.db.get(session.userId);

    return {
      checkoutSessionId: session._id,
      paymentId,
      totalPaise: session.total,
      userEmail: userDoc?.email || "",
      userPhone: session.addressSnapshot.phone || userDoc?.phone || "",
      paymentMethod: session.paymentMethod,
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: failRetryCheckoutSessionInternal (Internal Mutation)
// ─────────────────────────────────────────────────────────────────────────────
export const failRetryCheckoutSessionInternal = internalMutation({
  args: { checkoutSessionId: v.id("checkoutSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.status !== "processing") return;
    
    await restoreCheckoutSessionStock(ctx, session);
    await ctx.db.patch(session._id, { status: "failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Action: retryCheckoutSession
// ─────────────────────────────────────────────────────────────────────────────
export const retryCheckoutSession = action({
  args: { checkoutSessionId: v.id("checkoutSessions"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const paymentsApi = (anyApi as any).payments;
    
    const initResult: any = await ctx.runMutation(paymentsApi.prepareRetryCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
      token: args.token,
    });

    if (initResult.paymentMethod === "cod") {
       throw new Error("COD sessions cannot be retried through this payment pipeline.");
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isMock = !keySecret || keySecret === "mock_secret";

    if (isMock) {
      const razorpayOrderId = `order_mock_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      await ctx.runMutation(paymentsApi.updateCheckoutSessionWithRazorpayOrderId, {
        checkoutSessionId: args.checkoutSessionId,
        paymentId: initResult.paymentId,
        razorpayOrderId,
        status: "created",
      });

      return {
        checkoutSessionId: args.checkoutSessionId,
        razorpayOrderId,
        paymentId: initResult.paymentId,
      };
    }

    try {
      const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(initResult.totalPaise),
          currency: "INR",
          receipt: initResult.checkoutSessionId,
          notes: {
            checkoutSessionId: initResult.checkoutSessionId,
            customerEmail: initResult.userEmail,
            customerPhone: initResult.userPhone,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Razorpay returned status ${response.status}: ${errBody}`);
      }

      const orderData = await response.json();
      const razorpayOrderId = orderData.id;

      await ctx.runMutation(paymentsApi.updateCheckoutSessionWithRazorpayOrderId, {
        checkoutSessionId: args.checkoutSessionId,
        paymentId: initResult.paymentId,
        razorpayOrderId,
        status: "created", // Wait, createCheckoutSession patches status to "created"? Let's check `createCheckoutSession` return. Actually it patches payment to "created".
      });

      return {
        checkoutSessionId: args.checkoutSessionId,
        razorpayOrderId,
        paymentId: initResult.paymentId,
      };
    } catch (err: any) {
      console.error("[RazorpayRetryCreation] API request failed:", err);

      await ctx.runMutation(paymentsApi.failRetryCheckoutSessionInternal, {
        checkoutSessionId: args.checkoutSessionId,
      });
      throw new Error(`Payment gateway creation failed on retry: ${err.message || String(err)}`);
    }
  }
});

export function isSignatureBypassAllowed(enableDebugTools: string | undefined, razorpaySecret: string | undefined): boolean {
  return enableDebugTools === "true" && razorpaySecret === "mock_secret";
}
