// convex/orders.ts
// Order placement, list, and detail queries for the HIVE customer app.
// All operations are auth-gated with ownership checks.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import { validateProductSizeAndStock, normalizeSize } from "./lib/mockInventory";

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

    if (args.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Validate size and stock for each item before placing the order
    for (const item of args.items) {
      await validateProductSizeAndStock(ctx.db, item.productId, item.size, item.quantity);
    }

    const now = Date.now();
    const orderNumber = `HIVE-${Math.floor(10000 + Math.random() * 90000)}`;

    // Determine boutiqueId — use first item's boutique name to find/use a placeholder
    // For now we use a system sentinel: we'll look for any active boutique or use a fallback
    // Since real boutiques aren't seeded yet, we store orderNumber without boutiqueId constraint
    // WORKAROUND: find any boutique or use a system user's boutique
    let boutiqueId: Id<"boutiques"> | null = null;
    const anyBoutique = await ctx.db.query("boutiques").take(1);
    if (anyBoutique.length > 0 && anyBoutique[0]) {
      boutiqueId = anyBoutique[0]._id;
    }

    if (!boutiqueId) {
      // If no boutique exists at all, we can't create an order with the strict schema.
      // Create a placeholder boutique owned by this user.
      boutiqueId = await ctx.db.insert("boutiques", {
        userId:        user._id,
        name:          "Hive Marketplace",
        slug:          "hive-marketplace",
        phoneNumber:   "0000000000",
        email:         "marketplace@hive.in",
        address: {
          line1:   "Hive HQ",
          city:    "Hyderabad",
          state:   "Telangana",
          pincode: "500034",
          lat:     17.385,
          lng:     78.487,
        },
        regionIds:      [],
        status:         "approved",
        commissionRate: 0,
        hiveScore:      100,
        totalSales:     0,
        totalOrders:    0,
        createdAt:      now,
        updatedAt:      now,
      });
    }

    // Create the order
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

    // Create order items
    for (const item of args.items) {
      // Find a real productId from the products table if it exists
      // Otherwise use a placeholder variant approach
      const productRow = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", item.productId))
        .unique();

      const normalized = normalizeSize(item.size);

      if (productRow) {
        // Find a matching variant by product ID and matching size
        const variants = await ctx.db
          .query("productVariants")
          .withIndex("by_productId", (q) => q.eq("productId", productRow._id))
          .collect();

        const variantRow = variants.find(
          (v) => normalizeSize(v.size) === normalized
        );

        if (variantRow) {
          await ctx.db.insert("orderItems", {
            orderId,
            productId:       productRow._id,
            variantId:       variantRow._id,
            boutiqueId,
            productName:     item.name,
            variantSize:     item.size,
            imageUrl:        item.imageUrl,
            sku:             variantRow.sku,
            priceAtPurchase: item.price,
            quantity:        item.quantity,
            subtotal:        item.price * item.quantity,
          });
          continue;
        }
      }

      // Fallback: create a placeholder product entry for this order item
      const placeholderProductId = await ctx.db.insert("products", {
        boutiqueId,
        name:        item.name,
        slug:        item.productId,
        category:    "Fashion",
        occasionIds: [],
        priceMin:    item.price,
        priceMax:    item.price,
        tags:        [],
        status:      "approved",
        isActive:    true,
        viewCount:   0,
        orderCount:  1,
        createdAt:   now,
        updatedAt:   now,
      });

      const variantSizeLiteral = (normalized === "Free" || ["XS", "S", "M", "L", "XL", "XXL"].includes(normalized))
        ? normalized
        : "Free";

      const placeholderVariantId = await ctx.db.insert("productVariants", {
        productId:  placeholderProductId,
        boutiqueId,
        size:       variantSizeLiteral as "XS" | "S" | "M" | "L" | "XL" | "XXL" | "Free",
        sku:        `SKU-${orderNumber}-${item.productId}`,
        price:      item.price,
        isActive:   true,
        createdAt:  now,
        updatedAt:  now,
      });

      await ctx.db.insert("orderItems", {
        orderId,
        productId:       placeholderProductId,
        variantId:       placeholderVariantId,
        boutiqueId,
        productName:     item.name,
        variantSize:     item.size,
        imageUrl:        item.imageUrl,
        sku:             `SKU-${orderNumber}-${item.productId}`,
        priceAtPurchase: item.price,
        quantity:        item.quantity,
        subtotal:        item.price * item.quantity,
      });
    }

    // Clear the user's cart
    const cartItemsToDelete = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(200);
    for (const ci of cartItemsToDelete) {
      await ctx.db.delete(ci._id);
    }

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

    return { ...order, items };
  },
});
