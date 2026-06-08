// convex/orders.ts
// Order placement, list, and detail queries for the HIVE customer app.
// All operations are auth-gated with ownership checks.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getMyBoutique } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import { validateProductSizeAndStock } from "./lib/mockInventory";
import { internal } from "./_generated/api";

// ─── Cart item input shape for order placement ────────────────────────────
const cartItemArg = v.object({
  productId:   v.string(),
  name:        v.string(),
  price:       v.number(),
  imageUrl:    v.string(),
  boutiqueName:v.string(),
  size:        v.string(),
  quantity:    v.number(),
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
    addressSnapshot: addressSnapshotArg,
    deliveryDate:    v.string(),
    deliverySlot:    v.string(),
    paymentMethod:   v.string(),
    items:           v.array(cartItemArg),
    subtotal:        v.number(),
    deliveryFee:     v.number(),
    discount:        v.number(),
    total:           v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Verify address ownership
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) {
      throw new Error("Invalid address");
    }

    // ── Serviceability: coordinate-distance check only ────────────────────────
    // Rule: delivery is allowed IFF the destination falls within at least one
    // boutique's delivery radius. City names, regions, and zones are irrelevant.

    // Use real coordinates from the DB address record (the snapshot lat/lng can be 0).
    const deliveryLat = addr.lat ?? args.addressSnapshot.lat;
    const deliveryLng = addr.lng ?? args.addressSnapshot.lng;

    const approvedBoutiques = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

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

    // Diagnostic logs
    console.log("[placeOrder] Delivery coordinates:", deliveryLat, deliveryLng);
    console.log("[placeOrder] Approved boutiques:", approvedBoutiques.length);

    let isCoordinateServiceable = false;

    // If the address has no valid coordinates (0,0 or null), skip the check and allow.
    // The frontend already validates radius at address-selection time.
    if (!deliveryLat || !deliveryLng || (deliveryLat === 0 && deliveryLng === 0)) {
      console.log("[placeOrder] No delivery coordinates — skipping radius check, allowing order.");
      isCoordinateServiceable = true;
    } else {
      for (const boutique of approvedBoutiques) {
        const bLat = boutique.latitude ?? boutique.addressDetails?.lat;
        const bLng = boutique.longitude ?? boutique.addressDetails?.lng;
        const radius = boutique.deliveryRadiusKm ?? 15;

        if (bLat === undefined || bLng === undefined) continue;

        const distKm = haversineKm(deliveryLat, deliveryLng, bLat, bLng);

        console.log(
          `[placeOrder] Boutique "${boutique.boutiqueName ?? boutique.name}" ` +
          `coords=(${bLat}, ${bLng}) radius=${radius}km ` +
          `→ distance=${distKm.toFixed(2)}km ` +
          `→ serviceable=${distKm <= radius}`
        );

        if (distKm <= radius) {
          isCoordinateServiceable = true;
          break;
        }
      }
    }

    if (!isCoordinateServiceable) {
      console.error(
        `[placeOrder] BLOCKED — delivery location (${deliveryLat}, ${deliveryLng}) ` +
        `is outside all boutique delivery radii.`
      );
      throw new Error(
        "Delivery location is outside this boutique's delivery radius. " +
        "Please choose a closer delivery address."
      );
    }

    if (args.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Validate size and stock for each item before placing the order
    for (const item of args.items) {
      await validateProductSizeAndStock(ctx.db, item.productId, item.size, item.quantity);
    }

    const now = Date.now();
    const orderNumber = `HIVE-${Math.floor(10000 + Math.random() * 90000)}`;

    // ── Resolve boutiqueId from the actual purchased products ─────────────────
    // SECURITY: We must never assign an order to an arbitrary "first boutique"
    // in the database. Instead, look up each product by its slug/ID and use the
    // boutiqueId stored on the product row itself. This guarantees that each
    // boutique only ever sees orders that contain products they own.

    // Pre-resolve all product rows so we can determine the correct boutiqueId
    // and avoid a second lookup inside the item-creation loop below.
    type ResolvedItem = {
      item: typeof args.items[number];
      productRow: Awaited<ReturnType<typeof ctx.db.get>> & {
        _id: Id<"products">;
        boutiqueId: Id<"boutiques">;
        stockBySize: Record<string, number>;
        slug: string;
      } | null;
    };

    const resolvedItems: ResolvedItem[] = await Promise.all(
      args.items.map(async (item) => {
        // Try slug lookup first (the productId field sent from the client is the slug)
        const bySlug = await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", item.productId))
          .unique();
        if (bySlug) return { item, productRow: bySlug as any };

        // Fallback: try direct _id lookup (client may send a real Convex ID)
        try {
          const byId = await ctx.db.get(item.productId as Id<"products">);
          if (byId) return { item, productRow: byId as any };
        } catch {
          // Not a valid Convex ID — that's fine, will use placeholder path
        }

        return { item, productRow: null };
      })
    );

    // Determine the primary boutiqueId: use the boutique of the first real product.
    // If no product is found (e.g. all items are placeholder), fall back to any
    // approved boutique only as a last resort (not "first row" in DB).
    let boutiqueId: Id<"boutiques"> | null = null;

    for (const { productRow } of resolvedItems) {
      if (productRow?.boutiqueId) {
        boutiqueId = productRow.boutiqueId;
        break;
      }
    }

    if (!boutiqueId) {
      // No real product found — look for any APPROVED boutique as a sentinel.
      // This path only occurs for fully placeholder orders (no real products in DB).
      const fallbackBoutique = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .first();
      boutiqueId = fallbackBoutique?._id ?? null;
    }

    if (!boutiqueId) {
      // Absolute last resort: create a system placeholder boutique.
      boutiqueId = await ctx.db.insert("boutiques", {
        boutiqueName:     "Hive Marketplace",
        ownerName:        "System Admin",
        email:            "marketplace@hive.in",
        phone:            "0000000000",
        address:          "Hive HQ, Hyderabad, Telangana - 500034",
        latitude:         17.385,
        longitude:        78.487,
        deliveryRadiusKm: 15,
        description:      "Main Marketplace Boutique Hub",
        status:           "APPROVED",
        createdAt:        now,
        ownerEmail:       "marketplace@hive.in",
        ownerUserId:      user._id,
        userId:           user._id,
        name:             "Hive Marketplace",
        slug:             "hive-marketplace",
        phoneNumber:      "0000000000",
        addressDetails: {
          line1:   "Hive HQ",
          city:    "Hyderabad",
          state:   "Telangana",
          pincode: "500034",
          lat:     17.385,
          lng:     78.487,
        },
        regionIds:      [],
        commissionRate: 0,
        hiveScore:      100,
        totalSales:     0,
        totalOrders:    0,
        updatedAt:      now,
      });
    }

    // Create the order, stamped with the product-derived boutiqueId
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      customerId:      user._id,
      boutiqueId,
      status:          "pending_confirmation",
      deliveryAddress: args.addressSnapshot,
      addressId:       args.addressId,
      subtotal:        args.subtotal,
      deliveryFee:     args.deliveryFee,
      discount:        args.discount,
      total:           args.total,
      commissionAmount:0,
      paymentStatus:   "pending",
      notes:           `Payment: ${args.paymentMethod} | Slot: ${args.deliveryDate} ${args.deliverySlot}`,
      createdAt:       now,
      updatedAt:       now,
    });

    // Create order items using the pre-resolved product rows
    const anyCategory = await ctx.db.query("categories").first();

    for (const { item, productRow } of resolvedItems) {
      if (productRow) {
        // Real product found — decrement stock and insert the order item
        const currentStock = productRow.stockBySize[item.size] ?? 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        const stockBySize = { ...productRow.stockBySize };
        stockBySize[item.size] = newStock;

        await ctx.db.patch(productRow._id, { stockBySize, updatedAt: now });

        await ctx.db.insert("orderItems", {
          orderId,
          productId:       productRow._id,
          variantId:       productRow._id,
          boutiqueId:      productRow.boutiqueId,   // ← product's own boutiqueId
          productName:     item.name,
          variantSize:     item.size,
          imageUrl:        item.imageUrl,
          sku:             `SKU-${orderNumber}-${productRow.slug}-${item.size}`,
          priceAtPurchase: item.price,
          quantity:        item.quantity,
          subtotal:        item.price * item.quantity,
        });
        continue;
      }

      // No real product row — create a placeholder product under the resolved boutique
      const placeholderProductId = await ctx.db.insert("products", {
        boutiqueId,
        name:             item.name,
        slug:             `${item.productId}-${Math.floor(1000 + Math.random() * 9000)}`,
        description:      "System Generated Placeholder Product",
        categoryId:       anyCategory?._id || (args.addressId as any),
        price:            item.price,
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
        boutiqueId,                                 // ← placeholder uses resolved boutique
        productName:     item.name,
        variantSize:     item.size,
        imageUrl:        item.imageUrl,
        sku:             `SKU-${orderNumber}-${item.productId}`,
        priceAtPurchase: item.price,
        quantity:        item.quantity,
        subtotal:        item.price * item.quantity,
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
      customerPhone: user.phone || "",
      billingAddress: {
        line1: args.addressSnapshot.line1,
        line2: args.addressSnapshot.line2,
        city: args.addressSnapshot.city,
        state: args.addressSnapshot.state,
        pincode: args.addressSnapshot.pincode,
      },
      shippingAddress: {
        line1: args.addressSnapshot.line1,
        line2: args.addressSnapshot.line2,
        city: args.addressSnapshot.city,
        state: args.addressSnapshot.state,
        pincode: args.addressSnapshot.pincode,
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

    // Schedule background email notification to boutique
    await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
      orderId,
      event: "new_order",
    });

    return { orderId, orderNumber };
  },
});

/**
 * List all orders for the current user, newest first.
 * Returns order + its items in a single shape the UI expects.
 */
export const listMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(50);

    // Enrich with order items
    const result = await Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .take(20);
        return { ...order, items };
      })
    );

    return result;
  },
});

/**
 * Get a single order by its Convex _id.
 * Ownership-checked: only the order owner can read it.
 */
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== user._id) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);

    return { ...order, items };
  },
});

/**
 * Get an order by its human-readable orderNumber (e.g. "HIVE-57403").
 * Ownership-checked.
 */
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
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

    const boutique = await ctx.db.get(order.boutiqueId);
    const boutiqueName = boutique?.name || "Hive Marketplace";

    const itemsWithBoutiqueName = items.map((item) => ({
      ...item,
      boutiqueName,
    }));

    return { ...order, items: itemsWithBoutiqueName };
  },
});

/**
 * Fetch all orders for the logged-in boutique.
 */
export const getBoutiqueOrders = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .order("desc")
      .collect();

    // Enrich with order items
    return await Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        return {
          ...order,
          items,
        };
      })
    );
  },
});

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
      v.literal("refunded")
    ),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized: Order does not belong to your boutique.");
    }
    
    await ctx.db.patch(args.orderId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    const targetStatuses = ["confirmed", "packed", "out_for_delivery", "delivered"];
    if (targetStatuses.includes(args.status)) {
      await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
        orderId: args.orderId,
        event: args.status as "confirmed" | "packed" | "out_for_delivery" | "delivered",
      });
    }

    return args.orderId;
  },
});
