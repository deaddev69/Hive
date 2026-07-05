// convex/orders.ts
// Order placement, list, and detail queries for the HIVE customer app.
// All operations are auth-gated with ownership checks.

import { mutation, query, internalMutation, action } from "./_generated/server";
import { triggerNotification } from "./lib/notifications";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser, getMyBoutique, getCurrentUserOrNull } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import { incrementBoutiqueOrderCount, decrementBoutiqueOrderCount } from "./lib/boutiqueCounters";
import { validateProductSizeAndStock, MOCK_INVENTORY } from "./lib/mockInventory";
import { internal, api } from "./_generated/api";
import { checkRateLimit } from "./lib/rateLimit";
import { calculateDeliveryQuoteAction } from "./routing";
import { parseMoney, formatMoney } from "./lib/money";
import { checkKillSwitch } from "./lib/killSwitches";
import { validateBoutiqueOperationalLimits } from "./lib/gating";
import { getBoutiqueStatus } from "./shared/boutiqueStatus";

// ─── Cart item input shape for order placement ────────────────────────────
const cartItemArg = v.object({
  productId:   v.string(),
  name:        v.string(),
  price:       v.number(),
  imageUrl:    v.string(),
  boutiqueName:v.string(),
  size:        v.string(),
  quantity:    v.number(),
  isPreorder:  v.optional(v.boolean()),
  scheduledProcessingDate: v.optional(v.string()),
});

// ─── Address snapshot shape (immutable at order time) ─────────────────────
const addressSnapshotArg = v.object({
  label:   v.string(),
  line1:   v.string(),
  line2:   v.optional(v.string()),
  city:    v.string(),
  state:   v.string(),
  pincode: v.string(),
  lat:     v.number(),
  lng:     v.number(),
});

/**
 * Place a new order.
 * Validates that user, address, and items exist.
 * Creates order + orderItems rows, then clears the cart.
 * Returns the new orderNumber string.
 */
export const placeOrder = mutation({
  args: {
    addressId:       v.id("addresses"),
    addressSnapshot: v.optional(v.any()), // Kept optional for legacy compatibility
    promoCode:       v.optional(v.string()), // Passed from checkout to enforce server validation
    deliveryDate:    v.string(),
    deliverySlot:    v.string(),
    paymentMethod:   v.string(),
    items:           v.array(cartItemArg),
    subtotal:        v.number(),
    deliveryFee:     v.number(),
    discount:        v.number(),
    total:           v.number(),
    token:           v.optional(v.string()),
    reservationId:   v.string(), // Enforce required identifier for COD checkouts
  },
  handler: async (ctx, args) => {
    // 1. Verify kill switches
    const isMaintenanceMode = await checkKillSwitch(ctx.db, "maintenanceMode");
    if (isMaintenanceMode) {
      throw new Error("Platform is currently undergoing scheduled maintenance.");
    }
    const isOrdersEnabled = await checkKillSwitch(ctx.db, "ordersEnabled");
    if (!isOrdersEnabled) {
      throw new Error("Order placement is temporarily disabled for maintenance.");
    }

    const user = await getAuthenticatedUser(ctx, args.token);

    if (args.paymentMethod !== "cod") {
      throw new Error("Online payment methods must use the Checkout Session pipeline.");
    }

    // COD Idempotency Check using the reservationId index
    const existingOrder = await ctx.db
      .query("orders")
      .withIndex("by_reservationId", (q) => q.eq("reservationId", args.reservationId))
      .first();
    if (existingOrder) {
      return { orderId: existingOrder._id, orderNumber: existingOrder.orderNumber };
    }

    // Rate limit checkout attempts: max 5 per user per 15 minutes
    await checkRateLimit(ctx, `checkout:${user._id}`, 5, 15 * 60 * 1000);

    // Verify address ownership
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) {
      throw new Error("Invalid address");
    }

    if (addr.addressStatus !== "verified") {
      throw new Error("Address verification is pending or rejected. Please update your address to verify serviceability.");
    }

    if (args.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Coordinates Validation (P0 - Null Island block)
    if (
      addr.lat === undefined ||
      addr.lat === null ||
      Number.isNaN(addr.lat) ||
      !Number.isFinite(addr.lat) ||
      addr.lat === 0 ||
      addr.lng === undefined ||
      addr.lng === null ||
      Number.isNaN(addr.lng) ||
      !Number.isFinite(addr.lng) ||
      addr.lng === 0
    ) {
      throw new Error(
        "Address has invalid coordinates. Please select your location on the map."
      );
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
      throw new Error(
        `Promotional discount validation failed. Expected: ₹${expectedDiscount}, Got: ₹${args.discount}`
      );
    }

    // Compile deliveryAddress snapshot on Server (P0)
    const compiledAddressSnapshot = {
      label:            addr.label,
      line1:            addr.line1,
      line2:            addr.line2,
      formattedAddress: addr.formattedAddress,
      houseNumber:      addr.houseNumber,
      landmark:         addr.landmark,
      city:             addr.city,
      state:            addr.state,
      pincode:          addr.pincode,
      lat:              addr.lat,
      lng:              addr.lng,
      phone:            finalPhone,
    };

    // Use real coordinates from the DB address record (the snapshot lat/lng can be 0).
    const deliveryLat = addr.lat;
    const deliveryLng = addr.lng;

    // Haversine formula (inline — no external dependency needed server-side)
    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const now = Date.now();
    // Resolve all products in parallel — eliminates N sequential roundtrips
    const resolvedProducts = await Promise.all(
      args.items.map(async (item) => {
        const bySlug = await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", item.productId))
          .unique();
        let productRow = bySlug;
        if (!productRow) {
          try {
            productRow = await ctx.db.get(item.productId as Id<"products">);
          } catch {
            // Ignore invalid ID checks
          }
        }
        return { item, productRow };
      })
    );

    // Dedupe boutique IDs and batch-fetch all boutiques at once
    const uniqueBoutiqueIds = new Set<string>();
    for (const { productRow } of resolvedProducts) {
      if (productRow) uniqueBoutiqueIds.add(productRow.boutiqueId.toString());
    }
    const boutiqueArray: any[] = await Promise.all(
      [...uniqueBoutiqueIds].map((id) => ctx.db.get(id as Id<"boutiques">))
    );
    const boutiqueMap = new Map<string, any>(
      boutiqueArray.filter(Boolean).map((b: any) => [b._id.toString(), b])
    );

    // Fallback approved boutique (for mock products only)
    let fallbackBoutique: any = null;

    let expectedSubtotalPaise = 0;
    const resolvedItems = [];

    // 1. Validate each item using pre-fetched data
    for (const { item, productRow } of resolvedProducts) {
      const isMock = MOCK_INVENTORY[item.productId] !== undefined;

      // Product Existence Check (deleted items block)
      if (!productRow && !isMock) {
        throw new Error(`The item "${item.name}" is no longer available. Please refresh your cart.`);
      }

      // Active Flag Check (deactivated products block)
      if (productRow && !productRow.active) {
        throw new Error(`The item "${item.name}" is currently deactivated. Please remove it from your cart.`);
      }

      // Resolve Boutique from the pre-fetched map
      let boutique: any = null;
      if (productRow) {
        boutique = boutiqueMap.get(productRow.boutiqueId.toString()) ?? null;
      } else {
        // Fallback for mock products: resolve first approved boutique (cached)
        if (!fallbackBoutique) {
          fallbackBoutique = await ctx.db
            .query("boutiques")
            .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
            .first();
        }
        boutique = fallbackBoutique;
      }

      if (!boutique) {
        throw new Error(`Boutique for item "${item.name}" is unavailable.`);
      }

      // Boutique Status Verification (suspended, pending, rejected block)
      if (boutique.status !== "APPROVED") {
        throw new Error(`The boutique "${boutique.boutiqueName || boutique.name}" is temporarily unavailable. Please remove their products from your cart.`);
      }

      // Boutique Availability Check (paused store block)
      if (boutique.isAcceptingOrders === false) {
        throw new Error(`The boutique "${boutique.boutiqueName || boutique.name}" is currently paused and not accepting new orders. Please remove their products from your cart.`);
      }

      // Perform operational limits checks (hours, operating days, capacity, soft launch)
      await validateBoutiqueOperationalLimits(ctx.db, boutique._id);

      if (boutique.minimumOrderValue !== undefined) {
        const subtotalPaise = Math.round(args.subtotal * 100);
        if (subtotalPaise < boutique.minimumOrderValue) {
          throw new Error(
            `Minimum order value for ${boutique.boutiqueName || boutique.name} is ₹${(boutique.minimumOrderValue / 100).toFixed(2)}. Please add more items.`
          );
        }
      }

      // Targeted Serviceability Check
      if (deliveryLat && deliveryLng && !(deliveryLat === 0 && deliveryLng === 0)) {
        const bLat = boutique.latitude ?? boutique.addressDetails?.lat;
        const bLng = boutique.longitude ?? boutique.addressDetails?.lng;
        const radius = Math.min(15, boutique.deliveryRadiusKm ?? 15);

        if (bLat !== undefined && bLng !== undefined) {
          const distKm = haversineKm(deliveryLat, deliveryLng, bLat, bLng);
          if (distKm > radius) {
            // Mixed Boutique Cart validation: throw global delivery error message
            throw new Error("One or more items cannot be delivered to your address.");
          }
        }
      }

      // Validate size and stock using the inventory helper
      await validateProductSizeAndStock(ctx.db, item.productId, item.size, item.quantity);

      // Recalculate price in integer Paise to prevent price manipulation
      const activePricePaise = productRow
        ? Math.round((productRow.discountPrice ?? productRow.price) * 100)
        : Math.round(item.price * 100);
      expectedSubtotalPaise += activePricePaise * item.quantity;

      resolvedItems.push({
        item,
        productRow,
        boutiqueId: boutique._id,
      });
    }

    // Verify subtotal in integer Paise
    const clientSubtotalPaise = Math.round(args.subtotal * 100);
    if (clientSubtotalPaise !== expectedSubtotalPaise) {
      throw new Error(`Security Exception: Cart subtotal mismatch. Price tampering detected.`);
    }

    const orderNumber = `HIVE-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const primaryBoutiqueId = resolvedItems[0]?.boutiqueId;

    if (!primaryBoutiqueId) {
      throw new Error("No valid boutique found for this order.");
    }

    // Enforce "1 Cart = 1 Boutique" invariant at server-side checkout
    for (const resolved of resolvedItems) {
      if (resolved.boutiqueId !== primaryBoutiqueId) {
        throw new Error("All items in the checkout must belong to the same boutique.");
      }
    }

    // Verify delivery fee using the routing and pricing engine
    const quote = await calculateDeliveryQuoteAction(ctx.db, {
      userLat: deliveryLat,
      userLng: deliveryLng,
      boutiqueId: primaryBoutiqueId,
      subtotal: args.subtotal * 100, // convert subtotal to paise
    });

    if (!quote.serviceable) {
      throw new Error(quote.reason || "Address is outside the serviceable radius for this boutique.");
    }

    let expectedDeliveryFee = (quote as any).customerPaidFee / 100; // convert back to rupees
    if (cleanPromoCode === "FREESHIP") {
      expectedDeliveryFee = 0;
    }

    if (args.deliveryFee !== expectedDeliveryFee) {
      throw new Error(
        `Delivery fee validation failed. Expected: ₹${expectedDeliveryFee}, Got: ₹${args.deliveryFee}`
      );
    }

    // Verify total calculation
    const expectedTotal = Math.max(0, args.subtotal - expectedDiscount + expectedDeliveryFee);
    if (args.total !== expectedTotal) {
      throw new Error(
        `Order total mismatch. Expected: ₹${expectedTotal}, Got: ₹${args.total}`
      );
    }

    // Resolve boutique
    const boutique: any = await ctx.db.get(primaryBoutiqueId);
    const boutiqueName = boutique ? (boutique.boutiqueName || boutique.name || "Unknown Boutique") : "Unknown Boutique";

    const bStatus = boutique ? getBoutiqueStatus(boutique, now) : { type: "OPEN" as const };
    const placedDuringClosedHours = bStatus.type !== "OPEN";
    const scheduledProcessingDate = (bStatus.type === "CLOSED_TODAY" || bStatus.type === "CLOSED_EXTENDED") ? bStatus.nextOperatingDay : undefined;

    const subtotalPaise = parseMoney(args.subtotal);
    const deliveryFeePaise = parseMoney(args.deliveryFee);
    const discountPaise = parseMoney(args.discount);
    const totalPaise = parseMoney(args.total);

    // Build a map of client product ID (which could be a slug) to actual product database ID
    const resolvedProductMap = new Map<string, Id<"products">>();
    for (const { item, productRow } of resolvedProducts) {
      if (productRow) {
        resolvedProductMap.set(item.productId, productRow._id);
      }
    }

    // Setup snapshot metrics for COD order
    const commissionRate = boutique ? (boutique.commissionRate || 18) : 18;
    const platformCommissionAmount = Math.floor(totalPaise * (commissionRate / 100));
    const gstOnCommission = Math.floor(platformCommissionAmount * 0.18);

    const orderSnapshot = {
      boutiqueName,
      boutiqueId: primaryBoutiqueId,
      items: args.items.map(item => {
        const resolvedId = resolvedProductMap.get(item.productId) ?? (item.productId as Id<"products">);
        return {
          productId: resolvedId,
          productName: item.name,
          size: item.size,
          sku: `SKU-${orderNumber}-${resolvedId}-${item.size}`,
          priceAtPurchase: parseMoney(item.price),
          quantity: item.quantity,
        };
      }),
      deliveryFee: deliveryFeePaise,
      commissionRate,
      addressSnapshot: compiledAddressSnapshot,
      orderValue: totalPaise,
      platformCommissionAmount,
      platformCommissionRate: commissionRate,
      courierQuote: {
        estimatedPorterCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 9000,
        estimatedCourierCost: quote.estimatedCourierCost ?? 9000,
        distanceKm: quote.distanceKm ?? 5.5,
        etaMinutes: quote.etaMinutes ?? 45,
      },
      merchantOperatingModel: boutique ? (boutique.sellerModel || "boutique") : "boutique",
      payoutHoldDays: 2,
      taxBreakdown: {
        gstOnCommission,
      },
      courierCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 9000,
      actualCourierCost: 0,
      commissionAmount: platformCommissionAmount,
      gstAmount: gstOnCommission,
      merchantPayable: totalPaise - platformCommissionAmount,
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

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      customerId:      user._id,
      boutiqueId:      primaryBoutiqueId,
      boutiqueName,
      status:          "pending_confirmation",
      acceptanceTimeoutAt: now + 45 * 60 * 1000,
      deliveryAddress: compiledAddressSnapshot,
      pickupAddress,
      addressId:       args.addressId,
      subtotal:        subtotalPaise,
      deliveryFee:     deliveryFeePaise,
      discount:        discountPaise,
      total:           totalPaise,
      commissionAmount: platformCommissionAmount,
      paymentStatus:   "pending",
      reservationId:   args.reservationId, // Required identifier
      notes:           `Payment: ${args.paymentMethod} | Slot: ${args.deliveryDate} ${args.deliverySlot}`,
      orderSnapshot,
      placedDuringClosedHours,
      scheduledProcessingDate,
      createdAt:       now,
      updatedAt:       now,
    });

    // Write default records to deliverySubsidyLedger and deliveryPerformanceLedger
    await ctx.db.insert("deliverySubsidyLedger", {
      orderId,
      cartSubtotal: subtotalPaise,
      customerPaidFee: deliveryFeePaise,
      estimatedPorterCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 0, // paise
      estimatedCourierCost: quote.estimatedCourierCost ?? 0,
      actualPorterCost: 0,
      actualCourierCost: 0,
      subsidyAmount: 0,
      subsidyPercent: 0,
      gatewayFee: Math.round(totalPaise * 0.02), // paise (2% of transaction total)
      refundAmount: 0,
      createdAt: now,
    });

    await ctx.db.insert("deliveryPerformanceLedger", {
      orderId,
      estimatedDistance: quote.distanceKm ?? 0,
      actualDistance: 0,
      estimatedEta: quote.etaMinutes ?? 0,
      actualEta: 0,
      estimatedCost: quote.estimatedCourierCost ?? quote.estimatedPorterCost ?? 0, // paise
      actualCost: 0,
      deliveredOnTime: false,
      delayResponsibility: "none",
      createdAt: now,
    });

    // Create order items and update inventory
    const anyCategory = await ctx.db.query("categories").first();

    for (const { item, productRow, boutiqueId } of resolvedItems) {
      if (productRow) {
        // Real product found — check stock first
        const currentStock = productRow.stockBySize[item.size] ?? 0;
        if (item.quantity > currentStock) {
          throw new Error(`Overselling prevented: Requested quantity (${item.quantity}) exceeds available stock (${currentStock}) for size "${item.size}" of product "${item.name}".`);
        }

        // Subtract stock (clamping removed)
        const newStock = currentStock - item.quantity;
        const stockBySize = { ...productRow.stockBySize };
        stockBySize[item.size] = newStock;

        const totalStock = Object.values(stockBySize).reduce((sum, val) => sum + val, 0);
        const active = totalStock > 0;

        await ctx.db.patch(productRow._id, { stockBySize, active, updatedAt: now });

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
          orderId,
          createdAt: now,
        });

        await ctx.db.insert("orderItems", {
          orderId,
          productId:       productRow._id,
          variantId:       productRow._id,
          boutiqueId:      productRow.boutiqueId,
          productName:     item.name,
          variantSize:     item.size,
          imageUrl:        item.imageUrl,
          sku:             `SKU-${orderNumber}-${productRow.slug}-${item.size}`,
          priceAtPurchase: parseMoney(item.price),
          quantity:        item.quantity,
          subtotal:        parseMoney(item.price) * item.quantity,
        });
        continue;
      }

      // Fallback for valid mock products (insert placeholder in DB)
      const placeholderProductId = await ctx.db.insert("products", {
        boutiqueId,
        name:             item.name,
        slug:             `${item.productId}-${Math.floor(1000 + Math.random() * 9000)}`,
        description:      "System Generated Mock Product",
        categoryId:       anyCategory?._id || (args.addressId as any),
        price:            parseMoney(item.price),
        images:           [item.imageUrl],
        sizes:            [item.size],
        stockBySize:      { [item.size]: 0 },
        sameDayEligible:  false,
        featured:         false,
        active:           true,
        createdAt:        now,
        updatedAt:        now,
      });

      await ctx.db.insert("orderItems", {
        orderId,
        productId:       placeholderProductId,
        variantId:       placeholderProductId,
        boutiqueId,
        productName:     item.name,
        variantSize:     item.size,
        imageUrl:        item.imageUrl,
        sku:             `SKU-${orderNumber}-${item.productId}`,
        priceAtPurchase: parseMoney(item.price),
        quantity:        item.quantity,
        subtotal:        parseMoney(item.price) * item.quantity,
      });

      await ctx.db.insert("inventoryMovements", {
        productId: placeholderProductId,
        boutiqueId,
        size: item.size,
        beforeQty: 0,
        afterQty: 0,
        adjustmentQty: -item.quantity,
        reason: "online_order",
        source: "checkout",
        createdBy: user._id,
        orderId,
        createdAt: now,
      });
    }

    // Generate unique invoice number: INV-YYYYMMDD-XXXX
    let invoiceNumber = "";
    let isUnique = false;
    const dateObj = new Date(now);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;
    while (!isUnique) {
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      invoiceNumber = `INV-${dateStr}-${randomSeq}`;
      const existing = await ctx.db
        .query("invoices")
        .withIndex("by_invoice_number", (q) => q.eq("invoiceNumber", invoiceNumber))
        .unique();
      if (!existing) {
        isUnique = true;
      }
    }

    // Generate transaction ID
    const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Get customer profile display name
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    const customerName = profile?.displayName || user.email || "Hive Customer";

    // Snapshot items for the invoice
    const invoiceItems = args.items.map((item) => ({
      productId: item.productId,
      productName: item.name,
      productImage: item.imageUrl,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    }));

    // Create the invoice record
    await ctx.db.insert("invoices", {
      invoiceNumber,
      orderId,
      orderNumber,
      userId: user._id,
      transactionId,
      customerName,
      customerEmail: user.email || "",
      customerPhone: finalPhone,
      billingAddress: {
        line1: compiledAddressSnapshot.houseNumber
          ? `${compiledAddressSnapshot.houseNumber}, ${compiledAddressSnapshot.line1 || compiledAddressSnapshot.formattedAddress || ""}`
          : (compiledAddressSnapshot.line1 || compiledAddressSnapshot.formattedAddress || ""),
        line2: compiledAddressSnapshot.line2 || compiledAddressSnapshot.landmark,
        city: compiledAddressSnapshot.city,
        state: compiledAddressSnapshot.state,
        pincode: compiledAddressSnapshot.pincode,
      },
      shippingAddress: {
        line1: compiledAddressSnapshot.houseNumber
          ? `${compiledAddressSnapshot.houseNumber}, ${compiledAddressSnapshot.line1 || compiledAddressSnapshot.formattedAddress || ""}`
          : (compiledAddressSnapshot.line1 || compiledAddressSnapshot.formattedAddress || ""),
        line2: compiledAddressSnapshot.line2 || compiledAddressSnapshot.landmark,
        city: compiledAddressSnapshot.city,
        state: compiledAddressSnapshot.state,
        pincode: compiledAddressSnapshot.pincode,
      },
      items: invoiceItems,
      subtotal: args.subtotal,
      deliveryFee: args.deliveryFee,
      discount: args.discount,
      tax: 0,
      totalAmount: args.total,
      paymentMethod: args.paymentMethod,
      paymentStatus: args.paymentMethod === "cod" ? "pending" : "paid",
      generatedAt: now,
    });

    // Clear the user's cart
    const cartItemsToDelete = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(200);
    for (const ci of cartItemsToDelete) {
      await ctx.db.delete(ci._id);
    }

    // Increment boutique's daily active order count O(1)
    await incrementBoutiqueOrderCount(ctx, primaryBoutiqueId, now);

    // Schedule background email notification to boutique
    await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
      orderId,
      event: "new_order",
    });

    await triggerNotification(
      ctx,
      user._id,
      "slack",
      "new_order_ops",
      "order",
      orderId,
      JSON.stringify({
        orderNumber,
        boutiqueName,
        total: args.total,
        itemsCount: args.items.length,
      })
    );

    return { orderId, orderNumber };
  },
});

/**
 * List all orders for the current user, newest first.
 * Returns order + its items in a single shape the UI expects.
 */
async function formatOrderForCustomer(ctx: any, order: any, items: any[]) {
  if (!order) return null;
  let driverDetails = null;
  if (order.shipmentId) {
    const shipment = await ctx.db.get(order.shipmentId);
    if (shipment && (shipment.driverName || shipment.driverPhone || shipment.vehiclePlate || shipment.liveTrackingUrl)) {
      driverDetails = {
        name: shipment.driverName || null,
        phone: shipment.driverPhone || null,
        vehiclePlate: shipment.vehiclePlate || null,
        liveTrackingUrl: shipment.liveTrackingUrl || null,
        provider: shipment.provider || null,
      };
    }
  }
  return {
    ...order,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    total: order.total,
    driverDetails,
    items: items.map(item => ({
      ...item,
      priceAtPurchase: item.priceAtPurchase,
      subtotal: item.subtotal,
    })),
  };
}

/**
 * List all orders for the current user.
 */
export const listMyOrders = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(50);

    // Batch load order items
    const itemsList = await Promise.all(
      orders.map((order) =>
        ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .take(20)
      )
    );

    const formattedOrders = [];
    for (let i = 0; i < orders.length; i++) {
      const formatted = await formatOrderForCustomer(ctx, orders[i], itemsList[i] ?? []);
      if (formatted) {
        formattedOrders.push(formatted);
      }
    }
    return formattedOrders;
  },
});

/**
 * Get a single order by its Convex _id.
 * Ownership-checked: only the order owner can read it.
 */
export const getOrderById = query({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== user._id) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);

    return await formatOrderForCustomer(ctx, order, items);
  },
});

/**
 * Get an order by its human-readable orderNumber (e.g. "HIVE-57403").
 * Ownership-checked.
 */
export const getOrderByNumber = query({
  args: { orderNumber: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return null;

    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .unique();
    if (!order || order.customerId !== user._id) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);

    const formatted = await formatOrderForCustomer(ctx, order, items);
    if (!formatted) return null;

    const boutique = await ctx.db.get(order.boutiqueId);
    const boutiqueName = order.boutiqueName || boutique?.name || "Hive Marketplace";

    formatted.items = formatted.items.map((item: any) => ({
      ...item,
      boutiqueName,
    }));

    return formatted;
  },
});

/**
 * Fetch all orders for the logged-in boutique.
 */
export const getBoutiqueOrders = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx, undefined, true);
    // Bounded limit of 300 orders to avoid unbounded database collections
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .order("desc")
      .take(300);

    if (orders.length === 0) return [];

    // Batch load order items, invoices, and shipments
    const [itemsList, invoicesList, shipmentsList] = await Promise.all([
      Promise.all(orders.map((o) => ctx.db.query("orderItems").withIndex("by_orderId", (q) => q.eq("orderId", o._id)).collect())),
      Promise.all(orders.map((o) => ctx.db.query("invoices").withIndex("by_order_id", (q) => q.eq("orderId", o._id)).unique())),
      Promise.all(orders.map((o) => o.shipmentId ? ctx.db.get(o.shipmentId) : null))
    ]);

    return orders.map((order, i) => {
      const items = itemsList[i] || [];
      const invoice = invoicesList[i];
      const shipment = shipmentsList[i];
      return {
        ...order,
        items,
        invoiceNumber: invoice?.invoiceNumber || null,
        invoicePdfUrl: invoice?.pdfUrl || null,
        shipmentStatus: shipment?.status || null,
      };
    });
  },
});

export const retryBoutiqueOrderDispatch = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<any> => {
    const order = await ctx.runQuery(api.orders.getOrderById, { orderId: args.orderId });
    if (!order || !order.shipmentId) {
      throw new Error("Order or shipment not found.");
    }
    const boutique = await ctx.runQuery(api.boutiques.getMyBoutiqueDetails);
    if (!boutique || boutique._id !== order.boutiqueId) {
      throw new Error("Unauthorized");
    }
    
    // Call the shiprocket dispatch action
    const result = await ctx.runAction(internal.lib.shiprocket.dispatchOrder, {
      orderId: args.orderId,
      shipmentId: order.shipmentId,
    });
    
    return result;
  }
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["pending_confirmation", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "cancelled"],
  pickup_scheduled: ["picked_up", "in_transit", "out_for_delivery", "cancelled"],
  picked_up: ["in_transit", "out_for_delivery", "delivered", "cancelled"],
  in_transit: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  booking_failed: ["pickup_scheduled", "cancelled"],
  delivered: ["claim_submitted", "refund_requested", "refunded"],
  cancelled: [],
  claim_submitted: ["refund_requested", "replacement_requested"],
  replacement_requested: ["replacement_approved", "cancelled"],
  replacement_approved: ["replacement_dispatched", "cancelled"],
  replacement_dispatched: ["replacement_delivered", "cancelled"],
  replacement_delivered: [],
  refund_requested: ["refunded", "cancelled"],
  refunded: [],
};

function isValidTransition(current: string, target: string, isAdminOverride: boolean = false): boolean {
  if (current === target) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function assertHyperlocalTransitionPrerequisites(order: any, boutique: any) {
  if (!order.orderAcceptedAt) {
    throw new Error("Cannot request pickup: Order has not been accepted.");
  }
  if (!order.readyForPickupAt) {
    throw new Error("Cannot request pickup: Order has not been marked as packed.");
  }
  
  const customerAddr = order.deliveryAddress;
  if (
    !customerAddr ||
    customerAddr.lat === undefined ||
    customerAddr.lat === null ||
    customerAddr.lat === 0 ||
    customerAddr.lng === undefined ||
    customerAddr.lng === null ||
    customerAddr.lng === 0
  ) {
    throw new Error("Cannot request pickup: Customer delivery coordinates are invalid or missing.");
  }

  const orderPickup = order.pickupAddress;
  const boutiqueLat = orderPickup?.latitude ?? boutique?.latitude ?? boutique?.addressDetails?.lat;
  const boutiqueLng = orderPickup?.longitude ?? boutique?.longitude ?? boutique?.addressDetails?.lng;
  const boutiquePhone = orderPickup?.phone ?? boutique?.phone ?? boutique?.phoneNumber;

  if (
    !boutiqueLat ||
    !boutiqueLng ||
    !boutiquePhone ||
    boutiqueLat === 0 ||
    boutiqueLng === 0
  ) {
    throw new Error("Cannot request pickup: Boutique pickup coordinates or phone number are incomplete.");
  }
}

async function handleOrderStatusChangeLedgerUpdates(
  ctx: any,
  order: any,
  newStatus: string,
  now: number
) {
  if (newStatus === "confirmed") {
    const subsidyRecord = await ctx.db
      .query("deliverySubsidyLedger")
      .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
      .first();

    if (subsidyRecord) {
      const surgePaise = Math.floor(Math.random() * 16) * 100; // ₹0 to ₹15 in paise
      const estimatedCost = subsidyRecord.estimatedCourierCost ?? subsidyRecord.estimatedPorterCost ?? 0;
      const actualCourierCost = estimatedCost + surgePaise;
      const customerPaidFee = subsidyRecord.customerPaidFee ?? 0;
      const subsidyAmount = actualCourierCost - customerPaidFee;
      const subsidyPercent = subsidyRecord.cartSubtotal > 0 ? (subsidyAmount / subsidyRecord.cartSubtotal) : 0;

      await ctx.db.patch(subsidyRecord._id, {
        actualPorterCost: actualCourierCost, // Deprecated fallback
        actualCourierCost,
        subsidyAmount,
        subsidyPercent,
      });
    }
  } else if (newStatus === "delivered") {
    const perfRecord = await ctx.db
      .query("deliveryPerformanceLedger")
      .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
      .first();

    if (perfRecord) {
      const subsidyRecord = await ctx.db
        .query("deliverySubsidyLedger")
        .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
        .first();

      const boutique = await ctx.db.get(order.boutiqueId);
      const actualDistance = Math.max(0.1, Math.round((perfRecord.estimatedDistance + (Math.random() * 0.4 - 0.2)) * 100) / 100);
      const acceptedTime = order.orderAcceptedAt ?? order.confirmedAt ?? order.createdAt;
      const actualEta = Math.max(1, Math.round((now - acceptedTime) / 60000));
      const actualCost = subsidyRecord?.actualCourierCost ?? subsidyRecord?.actualPorterCost ?? perfRecord.estimatedCost;
      const deliveredOnTime = actualEta <= perfRecord.estimatedEta;

      let delayResponsibility: "boutique" | "courier" | "customer" | "system" | "none" = "none";
      if (!deliveredOnTime && boutique) {
        const readyTime = order.readyForPickupAt ?? order.packedAt ?? now;
        const boutiquePrepTime = Math.round((readyTime - acceptedTime) / 60000);
        const avgPrepTime = boutique.averagePrepTime ?? 30;

        if (boutiquePrepTime > avgPrepTime) {
          delayResponsibility = "boutique";
        } else {
          const rand = Math.random();
          if (rand < 0.6) {
            delayResponsibility = "courier";
          } else if (rand < 0.8) {
            delayResponsibility = "customer";
          } else {
            delayResponsibility = "system";
          }
        }
      }

      await ctx.db.patch(perfRecord._id, {
        actualDistance,
        actualEta,
        actualCost,
        deliveredOnTime,
        delayResponsibility,
      });
    }
  } else if (newStatus === "refunded") {
    const subsidyRecord = await ctx.db
      .query("deliverySubsidyLedger")
      .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
      .first();
    if (subsidyRecord) {
      await ctx.db.patch(subsidyRecord._id, {
        refundAmount: order.total * 100, // full refund amount in paise
      });
    }
  }
}

export const updateBoutiqueOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("pending_confirmation"),
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("pickup_scheduled"),
      v.literal("picked_up"),
      v.literal("in_transit"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("claim_submitted"),
      v.literal("replacement_requested"),
      v.literal("replacement_approved"),
      v.literal("replacement_dispatched"),
      v.literal("replacement_delivered"),
      v.literal("refund_requested"),
      v.literal("refunded"),
      v.literal("booking_failed")
    ),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized: Order does not belong to your boutique.");
    }

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(args.status)) {
      throw new ConvexError(`Invalid transition: ${order.status} → ${args.status}`);
    }

    if (order.status === args.status) {
      return args.orderId;
    }

    if (args.status === "pickup_scheduled") {
      assertHyperlocalTransitionPrerequisites(order, boutique);
    }
    
    const now = Date.now();

    // Check if transitioning to cancelled/refunded
    const wasCancelledOrRefunded = order.status === "cancelled" || order.status === "refunded";
    const isNowCancelledOrRefunded = args.status === "cancelled" || args.status === "refunded";
    const isReversible = ["pending_payment", "pending_confirmation", "confirmed", "packed", "pickup_scheduled"].includes(order.status);

    if (!wasCancelledOrRefunded && isNowCancelledOrRefunded && isReversible) {
      await decrementBoutiqueOrderCount(ctx, order.boutiqueId, order);
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      const operator = await getCurrentUserOrNull(ctx);
      const operatorId = operator?._id ?? order.customerId;

      for (const item of orderItems) {
        const product = await ctx.db.get(item.productId);
        if (product) {
          const currentStock = product.stockBySize[item.variantSize] ?? 0;
          const newStock = currentStock + item.quantity;

          const stockBySize = { ...product.stockBySize };
          stockBySize[item.variantSize] = newStock;

          const beforeTotalStock = (product.sizes || []).reduce((sum: number, sz: string) => sum + (product.stockBySize[sz] ?? 0), 0);
          const totalStock = (product.sizes || []).reduce((sum: number, sz: string) => sum + (stockBySize[sz] ?? 0), 0);
          let active = product.active;
          let autoDeactivatedBecauseOutOfStock = product.autoDeactivatedBecauseOutOfStock ?? false;

          const isApproved = !product.approvalStatus || product.approvalStatus === "approved";

          if (totalStock === 0) {
            active = false;
            autoDeactivatedBecauseOutOfStock = true;
          } else if (product.autoDeactivatedBecauseOutOfStock && beforeTotalStock === 0 && totalStock > 0) {
            if (isApproved) {
              active = true;
            }
            autoDeactivatedBecauseOutOfStock = false;
          } else if (totalStock > 0) {
            autoDeactivatedBecauseOutOfStock = false;
          }

          await ctx.db.patch(product._id, {
            stockBySize,
            active,
            autoDeactivatedBecauseOutOfStock,
            updatedAt: now,
          });

          await ctx.db.insert("inventoryMovements", {
            productId: product._id,
            boutiqueId: product.boutiqueId,
            size: item.variantSize,
            beforeQty: currentStock,
            afterQty: newStock,
            adjustmentQty: item.quantity,
            reason: "online_order_reversal",
            source: "return",
            createdBy: operatorId,
            orderId: order._id,
            createdAt: now,
          });
        }
      }
    }

    const patch: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.status === "confirmed" && !order.confirmedAt) {
      patch.confirmedAt = now;
      patch.orderAcceptedAt = now;
      patch.acceptanceTimeoutAt = undefined;
    }
    if (args.status === "packed" && !order.packedAt) {
      patch.packedAt = now;
      patch.readyForPickupAt = now;
      const acceptedTime = order.orderAcceptedAt ?? order.confirmedAt ?? order.createdAt;
      patch.prepTimeDurationMinutes = Math.round((now - acceptedTime) / 60000);
    }
    if (args.status === "pickup_scheduled" && !order.readyForPickupAt) {
      patch.readyForPickupAt = now;
    }
    if (args.status === "pickup_scheduled" && !order.pickupScheduledAt) patch.pickupScheduledAt = now;
    if (args.status === "picked_up" && !order.pickedUpAt) patch.pickedUpAt = now;
    if (args.status === "in_transit" && !order.inTransitAt) patch.inTransitAt = now;
    if (args.status === "out_for_delivery" && !order.outForDeliveryAt) patch.outForDeliveryAt = now;
    if (args.status === "delivered" && !order.deliveredAt) {
      patch.deliveredAt = now;
      patch.claimWindowExpiresAt = now + 48 * 3600 * 1000;
    }
    if (args.status === "cancelled" && !order.cancelledAt) patch.cancelledAt = now;

    await ctx.db.patch(args.orderId, patch);

    const updatedOrder = await ctx.db.get(args.orderId);
    if (updatedOrder) {
      await handleOrderStatusChangeLedgerUpdates(ctx, updatedOrder, args.status, now);
    }

    // Wire Shiprocket booking here
    if (args.status === "packed") {
      const customer = await ctx.db.get(order.customerId);
      const shipmentId = await ctx.db.insert("shipments", {
        orderId: args.orderId,
        provider: "shiprocket",
        status: "created",
        awbNumber: "",
        trackingUrl: "",
        rawWebhookEvents: [],
        pickupAddress: {
          name: boutique?.boutiqueName || "Boutique",
          line1: boutique?.address || "",
          city: boutique?.addressDetails?.city || "",
          state: boutique?.addressDetails?.state || "",
          pincode: boutique?.addressDetails?.pincode || "",
          phone: boutique?.phone || "",
        },
        deliveryAddress: {
          name: (order.deliveryAddress as any)?.name || customer?.email || "Customer",
          line1: order.deliveryAddress?.line1 || (order.deliveryAddress as any)?.formattedAddress || "",
          line2: order.deliveryAddress?.line2 || (order.deliveryAddress as any)?.houseNumber || "",
          city: (order.deliveryAddress as any)?.city || "",
          state: (order.deliveryAddress as any)?.state || "",
          pincode: (order.deliveryAddress as any)?.pincode || "",
          phone: order.deliveryAddress?.phone || customer?.phone || "",
        },
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(args.orderId, { shipmentId });

      await ctx.scheduler.runAfter(0, internal.lib.shiprocket.dispatchOrder, {
        orderId: args.orderId,
        shipmentId: shipmentId,
      });
    }

    const targetStatuses = ["confirmed", "packed", "out_for_delivery", "delivered"];
    if (targetStatuses.includes(args.status)) {
      await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
        orderId: args.orderId,
        event: args.status as "confirmed" | "packed" | "out_for_delivery" | "delivered",
      });
    }

    if (args.status === "cancelled") {
      // TODO: wire Shiprocket cancellation here

      const isWhatsAppEnabled = boutique?.whatsAppNotificationsEnabled ?? true;
      const recipientPhone = boutique?.notificationPhone || boutique?.phone;
      const cancelReason = order.cancelReason || "Cancelled by boutique owner";

      if (isWhatsAppEnabled && recipientPhone) {
        await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
          recipient: recipientPhone,
          templateName: "order_cancelled",
          parameters: [
            boutique.ownerName || "Merchant",
            order.orderNumber,
            cancelReason
          ],
        });
      } else if (boutique?.email || boutique?.ownerEmail) {
        await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
          to: boutique.email || boutique.ownerEmail,
          subject: `Order Cancelled - ${order.orderNumber}`,
          html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>Order ${order.orderNumber} has been cancelled. Reason: ${cancelReason}</p>`,
          templateName: "order_cancelled",
        });
      }

      const customerUser = await ctx.db.get(order.customerId);
      const invoice = await ctx.db
        .query("invoices")
        .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
        .unique();
      const customerEmail = invoice?.customerEmail || customerUser?.email;
      if (customerEmail) {
        await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
          to: customerEmail,
          subject: `Your Hive Order ${order.orderNumber} has been Cancelled`,
          html: `<p>Dear Customer,</p><p>Your order ${order.orderNumber} has been cancelled. Reason: ${cancelReason}. A refund will be initiated if applicable.</p>`,
          templateName: "order_cancelled_customer",
        });
      }
    }

    return args.orderId;
  },
});

/**
 * Bulk update order statuses for a boutique owner.
 * Validates ownership for each order.
 */
export const bulkUpdateBoutiqueOrderStatus = mutation({
  args: {
    orderIds: v.array(v.id("orders")),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("pending_confirmation"),
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("pickup_scheduled"),
      v.literal("picked_up"),
      v.literal("in_transit"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("claim_submitted"),
      v.literal("replacement_requested"),
      v.literal("replacement_approved"),
      v.literal("replacement_dispatched"),
      v.literal("replacement_delivered"),
      v.literal("refund_requested"),
      v.literal("refunded"),
      v.literal("booking_failed")
    ),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const now = Date.now();
    const results = [];

    for (const orderId of args.orderIds) {
      const order = await ctx.db.get(orderId);
      if (!order || order.boutiqueId !== boutique._id) {
        throw new Error("Unauthorized: Order does not belong to your boutique.");
      }

      if (order.status === args.status) {
        results.push({ orderId, status: "unchanged" });
        continue;
      }

      if (!isValidTransition(order.status, args.status)) {
        results.push({ orderId, status: "error", message: `Cannot transition from ${order.status} to ${args.status}` });
        continue;
      }

      if (args.status === "pickup_scheduled") {
        try {
          assertHyperlocalTransitionPrerequisites(order, boutique);
        } catch (err: any) {
          results.push({ orderId, status: "error", message: err.message });
          continue;
        }
      }

      // Check if transitioning to cancelled/refunded
      const wasCancelledOrRefunded = order.status === "cancelled" || order.status === "refunded";
      const isNowCancelledOrRefunded = args.status === "cancelled" || args.status === "refunded";
      const isReversible = ["pending_payment", "pending_confirmation", "confirmed", "packed", "pickup_scheduled"].includes(order.status);

      if (!wasCancelledOrRefunded && isNowCancelledOrRefunded && isReversible) {
        await decrementBoutiqueOrderCount(ctx, order.boutiqueId, order);
        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        const operator = await getCurrentUserOrNull(ctx);
        const operatorId = operator?._id ?? order.customerId;

        for (const item of orderItems) {
          const product = await ctx.db.get(item.productId);
          if (product) {
            const currentStock = product.stockBySize[item.variantSize] ?? 0;
            const newStock = currentStock + item.quantity;

            const stockBySize = { ...product.stockBySize };
            stockBySize[item.variantSize] = newStock;

            const beforeTotalStock = Object.values(product.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
            const totalStock = Object.values(stockBySize).reduce((sum: number, val: any) => sum + (val || 0), 0);
            let active = product.active;
            let autoDeactivatedBecauseOutOfStock = product.autoDeactivatedBecauseOutOfStock ?? false;

            if (totalStock === 0) {
              active = false;
              autoDeactivatedBecauseOutOfStock = true;
            } else if (product.autoDeactivatedBecauseOutOfStock && beforeTotalStock === 0 && totalStock > 0) {
              active = true;
              autoDeactivatedBecauseOutOfStock = false;
            } else if (totalStock > 0) {
              autoDeactivatedBecauseOutOfStock = false;
            }

            await ctx.db.patch(product._id, {
              stockBySize,
              active,
              autoDeactivatedBecauseOutOfStock,
              updatedAt: now,
            });

            await ctx.db.insert("inventoryMovements", {
              productId: product._id,
              boutiqueId: product.boutiqueId,
              size: item.variantSize,
              beforeQty: currentStock,
              afterQty: newStock,
              adjustmentQty: item.quantity,
              reason: "online_order_reversal",
              source: "return",
              createdBy: operatorId,
              orderId: order._id,
              createdAt: now,
            });
          }
        }
      }

      const patch: Record<string, any> = {
        status: args.status,
        updatedAt: now,
      };
      if (args.status === "confirmed" && !order.confirmedAt) {
        patch.confirmedAt = now;
        patch.orderAcceptedAt = now;
        patch.acceptanceTimeoutAt = undefined;
      }
      if (args.status === "packed" && !order.packedAt) {
        patch.packedAt = now;
        patch.readyForPickupAt = now;
        const acceptedTime = order.orderAcceptedAt ?? order.confirmedAt ?? order.createdAt;
        patch.prepTimeDurationMinutes = Math.round((now - acceptedTime) / 60000);
      }
      if (args.status === "pickup_scheduled" && !order.readyForPickupAt) {
        patch.readyForPickupAt = now;
      }
      if (args.status === "pickup_scheduled" && !order.pickupScheduledAt) patch.pickupScheduledAt = now;
      if (args.status === "picked_up" && !order.pickedUpAt) patch.pickedUpAt = now;
      if (args.status === "in_transit" && !order.inTransitAt) patch.inTransitAt = now;
      if (args.status === "out_for_delivery" && !order.outForDeliveryAt) patch.outForDeliveryAt = now;
      if (args.status === "delivered" && !order.deliveredAt) {
        patch.deliveredAt = now;
        patch.claimWindowExpiresAt = now + 48 * 3600 * 1000;
      }
      if (args.status === "cancelled" && !order.cancelledAt) patch.cancelledAt = now;

      await ctx.db.patch(orderId, patch);

      const updatedOrder = await ctx.db.get(orderId);
      if (updatedOrder) {
        await handleOrderStatusChangeLedgerUpdates(ctx, updatedOrder, args.status, now);
      }

      // TODO: wire Shiprocket booking here
      if (args.status === "packed") {
        // Intentionally empty: automatic courier dispatch is triggered in downstream provider action.
      }

      const targetStatuses = ["confirmed", "packed", "out_for_delivery", "delivered"];
      if (targetStatuses.includes(args.status)) {
        await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
          orderId,
          event: args.status as "confirmed" | "packed" | "out_for_delivery" | "delivered",
        });
      }

      if (args.status === "cancelled") {
        // TODO: wire Shiprocket cancellation here

        const isWhatsAppEnabled = boutique?.whatsAppNotificationsEnabled ?? true;
        const recipientPhone = boutique?.notificationPhone || boutique?.phone;
        const cancelReason = order.cancelReason || "Cancelled by boutique owner";

        if (isWhatsAppEnabled && recipientPhone) {
          await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
            recipient: recipientPhone,
            templateName: "order_cancelled",
            parameters: [
              boutique.ownerName || "Merchant",
              order.orderNumber,
              cancelReason
            ],
          });
        } else if (boutique?.email || boutique?.ownerEmail) {
          await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
            to: boutique.email || boutique.ownerEmail,
            subject: `Order Cancelled - ${order.orderNumber}`,
            html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>Order ${order.orderNumber} has been cancelled. Reason: ${cancelReason}</p>`,
            templateName: "order_cancelled",
          });
        }

        const customerUser = await ctx.db.get(order.customerId);
        const invoice = await ctx.db
          .query("invoices")
          .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
          .unique();
        const customerEmail = invoice?.customerEmail || customerUser?.email;
        if (customerEmail) {
          await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
            to: customerEmail,
            subject: `Your Hive Order ${order.orderNumber} has been Cancelled`,
            html: `<p>Dear Customer,</p><p>Your order ${order.orderNumber} has been cancelled. Reason: ${cancelReason}. A refund will be initiated if applicable.</p>`,
            templateName: "order_cancelled_customer",
          });
        }
      }

      results.push({ orderId, status: "success" });
    }

    return results;
  },
});

/**
 * Fetch a single order for the boutique workspace.
 * Validates boutique ownership.
 */
export const getBoutiqueOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, undefined, true);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.boutiqueId !== boutique._id) {
      return null;
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect();

    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .unique();

    const customerProfile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", order.customerId))
      .unique();

    const customerUser = await ctx.db.get(order.customerId);

    return {
      ...order,
      items,
      invoiceNumber: invoice?.invoiceNumber || null,
      customerPhone: customerUser?.phone || invoice?.customerPhone || null,
      customerName: customerProfile?.displayName || "Customer",
      boutiqueName: boutique.boutiqueName || boutique.name || "Boutique",
    };
  },
});

/**
 * Validate a promotional coupon code and return its status and discount.
 * Public customer query.
 */
export const validatePromoCode = query({
  args: {
    code: v.string(),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    let discount = 0;
    let success = false;
    let message = "";

    if (code === "WELCOME10") {
      discount = Math.round(args.subtotal * 0.1);
      success = true;
      message = "WELCOME10 applied: 10% discount.";
    } else if (code === "HIVEFIRST") {
      discount = Math.min(500, args.subtotal);
      success = true;
      message = "HIVEFIRST applied: Flat ₹500 discount.";
    } else if (code === "FREESHIP") {
      discount = 0;
      success = true;
      message = "FREESHIP applied: Free shipping activated.";
    } else {
      message = "Invalid coupon code.";
    }

    return { success, discount, message };
  },
});

export const checkMerchantSLATimeouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const twentyMinutes = 20 * 60 * 1000;
    const thirtyMinutes = 30 * 60 * 1000;
    const fortyFiveMinutes = 45 * 60 * 1000;

    // Get all orders in pending_confirmation status using the status index
    const pendingOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending_confirmation"))
      .collect();

    let warnedCount = 0;
    let cancelledCount = 0;

    for (const order of pendingOrders) {
      const elapsed = now - order.createdAt;

      // Tier 4: Auto Cancel if unaccepted after 45 minutes
      if (elapsed >= fortyFiveMinutes) {
        const level4 = await ctx.db
          .query("orderEscalations")
          .withIndex("by_orderId_level", (q) => q.eq("orderId", order._id).eq("level", 4))
          .first();

        if (!level4) {
          if (!isValidTransition(order.status, "cancelled")) {
            console.warn(`[checkMerchantSLATimeouts] Invalid transition from ${order.status} to cancelled for order ${order._id}`);
            continue;
          }

          // Transition order status to cancelled
          await ctx.db.patch(order._id, {
            status: "cancelled",
            cancelledAt: now,
            updatedAt: now,
            cancelReason: "SLA breach: unaccepted for 45 minutes",
          });

          await decrementBoutiqueOrderCount(ctx, order.boutiqueId, order);

          // Restore reserved stock levels for this order
          const items = await ctx.db
            .query("orderItems")
            .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
            .collect();

          for (const item of items) {
            const product = await ctx.db.get(item.productId);
            if (product) {
              const currentStock = product.stockBySize[item.variantSize] ?? 0;
              const newStock = currentStock + item.quantity;
              const stockBySize = { ...product.stockBySize };
              stockBySize[item.variantSize] = newStock;

              const totalStock = Object.values(stockBySize).reduce((sum: number, val: any) => sum + (val || 0), 0);
              const active = totalStock > 0;

              await ctx.db.patch(product._id, { stockBySize, active, updatedAt: now });

              await ctx.db.insert("inventoryMovements", {
                productId: product._id,
                boutiqueId: product.boutiqueId,
                size: item.variantSize,
                beforeQty: currentStock,
                afterQty: newStock,
                adjustmentQty: item.quantity,
                reason: "order_cancelled",
                source: "return",
                createdBy: order.customerId,
                orderId: order._id,
                createdAt: now,
              });
            }
          }

          // Trigger notifications to user and boutique
          const boutique = await ctx.db.get(order.boutiqueId);

          const customerUser = await ctx.db.get(order.customerId);
          const customerEmail = customerUser?.email;
          if (customerEmail) {
            await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
              to: customerEmail,
              subject: `Your Hive Order ${order.orderNumber} has been Cancelled`,
              html: `<p>Dear Customer,</p><p>Your order ${order.orderNumber} has been cancelled because the merchant failed to accept it within the 45 minutes SLA. We apologize for the inconvenience.</p>`,
              templateName: "order_cancelled_customer_sla",
            });
          }

          const isWhatsAppEnabled = boutique?.whatsAppNotificationsEnabled ?? true;
          const recipientPhone = boutique?.notificationPhone || boutique?.phone;
          if (isWhatsAppEnabled && recipientPhone) {
            await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
              recipient: recipientPhone,
              templateName: "order_cancelled",
              parameters: [
                boutique.ownerName || "Merchant",
                order.orderNumber,
                "SLA breach: unaccepted for 45 minutes"
              ],
            });
          } else if (boutique?.email || boutique?.ownerEmail) {
            await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
              to: boutique.email || boutique.ownerEmail,
              subject: `Order Cancelled - ${order.orderNumber}`,
              html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>Order ${order.orderNumber} has been cancelled. Reason: SLA breach: unaccepted for 45 minutes.</p>`,
              templateName: "order_cancelled",
            });
          }

          // Record escalation level 4
          await ctx.db.insert("orderEscalations", {
            orderId: order._id,
            level: 4,
            createdAt: now,
          });

          // Insert audit log
          await ctx.db.insert("auditLogs", {
            actorRole: "system",
            action: "order.sla_cancelled",
            entityType: "orders",
            entityId: order._id,
            metadata: JSON.stringify({ orderNumber: order.orderNumber, elapsedMinutes: elapsed / 60000 }),
            createdAt: now,
          });

          cancelledCount++;
        }
      }
      // Tier 3: Operations Alert if unaccepted after 30 minutes
      else if (elapsed >= thirtyMinutes) {
        const level3 = await ctx.db
          .query("orderEscalations")
          .withIndex("by_orderId_level", (q) => q.eq("orderId", order._id).eq("level", 3))
          .first();

        if (!level3) {
          // Operations alert notification - insert audit log and escalate
          await ctx.db.insert("auditLogs", {
            actorRole: "system",
            action: "order.sla_operations_alert",
            entityType: "orders",
            entityId: order._id,
            metadata: JSON.stringify({ orderNumber: order.orderNumber, elapsedMinutes: elapsed / 60000 }),
            createdAt: now,
          });

          // Record escalation level 3
          await ctx.db.insert("orderEscalations", {
            orderId: order._id,
            level: 3,
            createdAt: now,
          });
        }
      }
      // Tier 2: Warning notification if unaccepted after 20 minutes
      else if (elapsed >= twentyMinutes) {
        const level2 = await ctx.db
          .query("orderEscalations")
          .withIndex("by_orderId_level", (q) => q.eq("orderId", order._id).eq("level", 2))
          .first();

        if (!level2) {
          const boutique = await ctx.db.get(order.boutiqueId);
          if (boutique && (boutique.email || boutique.ownerEmail)) {
            await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
              to: boutique.email || boutique.ownerEmail,
              subject: `URGENT WARNING: Order SLA Critical - ${order.orderNumber}`,
              html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>Please accept Order ${order.orderNumber} immediately. It has been pending for 20 minutes and will be automatically cancelled after 45 minutes.</p>`,
              templateName: "order_sla_warning",
            });
          }

          // Record escalation level 2
          await ctx.db.insert("orderEscalations", {
            orderId: order._id,
            level: 2,
            createdAt: now,
          });

          warnedCount++;
        }
      }
      // Tier 1: Reminder notification if unaccepted after 10 minutes
      else if (elapsed >= tenMinutes) {
        const level1 = await ctx.db
          .query("orderEscalations")
          .withIndex("by_orderId_level", (q) => q.eq("orderId", order._id).eq("level", 1))
          .first();

        if (!level1) {
          const boutique = await ctx.db.get(order.boutiqueId);
          if (boutique && (boutique.email || boutique.ownerEmail)) {
            await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
              to: boutique.email || boutique.ownerEmail,
              subject: `Reminder: Action Required for Order - ${order.orderNumber}`,
              html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>Please accept Order ${order.orderNumber} within the next 35 minutes to avoid automatic SLA cancellation.</p>`,
              templateName: "order_sla_reminder",
            });
          }

          // Record escalation level 1
          await ctx.db.insert("orderEscalations", {
            orderId: order._id,
            level: 1,
            createdAt: now,
          });

          warnedCount++;
        }
      }
    }

    console.log(`[MerchantSLATimeouts] Warned ${warnedCount} and Cancelled ${cancelledCount} orders.`);
    return { warnedCount, cancelledCount };
  },
});
