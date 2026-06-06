// convex/cart.ts
// Per-user persistent cart backed by the `cartItems` table.
// All operations are auth-gated — users can only read/write their own cart.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { validateProductSizeAndStock } from "./lib/mockInventory";

/**
 * Fetch all cart items for the current user.
 */
export const getCart = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("asc")
      .take(100);
  },
});

/**
 * Add an item to the cart.
 * If an identical (productId + size) item already exists, increments quantity.
 */
export const addItem = mutation({
  args: {
    productId:   v.string(),
    productSlug: v.optional(v.string()),
    name:        v.string(),
    price:       v.number(),
    imageUrl:    v.string(),
    boutiqueName:v.string(),
    size:        v.string(),
    quantity:    v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Validate size and stock
    await validateProductSizeAndStock(ctx.db, args.productId, args.size, args.quantity);

    // Check for existing matching item
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_userId_product_size", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId).eq("size", args.size)
      )
      .unique();

    if (existing) {
      // Increment quantity
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
      });
      return existing._id;
    }

    return await ctx.db.insert("cartItems", {
      userId:      user._id,
      productId:   args.productId,
      productSlug: args.productSlug,
      name:        args.name,
      price:       args.price,
      imageUrl:    args.imageUrl,
      boutiqueName:args.boutiqueName,
      size:        args.size,
      quantity:    args.quantity,
      addedAt:     Date.now(),
    });
  },
});

/**
 * Remove a single cart item by its document ID.
 */
export const removeItem = mutation({
  args: { cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.cartItemId);
    if (!item || item.userId !== user._id) throw new Error("Cart item not found");
    await ctx.db.delete(args.cartItemId);
  },
});

/**
 * Update the quantity of a cart item.
 * If quantity <= 0, the item is removed entirely.
 */
export const updateQuantity = mutation({
  args: {
    cartItemId: v.id("cartItems"),
    quantity:   v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const item = await ctx.db.get(args.cartItemId);
    if (!item || item.userId !== user._id) throw new Error("Cart item not found");

    if (args.quantity <= 0) {
      await ctx.db.delete(args.cartItemId);
    } else {
      await ctx.db.patch(args.cartItemId, { quantity: args.quantity });
    }
  },
});

/**
 * Delete all cart items for the current user.
 * Used after successful order placement.
 */
export const clearCart = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(200);
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});
