// convex/cart.ts
// Per-user persistent cart backed by the `cartItems` table.
// All operations are auth-gated — users can only read/write their own cart.

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getCurrentUserOrNull } from "./lib/auth";
import { validateProductSizeAndStock, MOCK_INVENTORY } from "./lib/mockInventory";

/**
 * Resolves the boutiqueId of a product, handling database rows and mock fallback.
 */
async function resolveBoutiqueId(ctx: any, productId: string, boutiqueName: string): Promise<string> {
  const bySlug = await ctx.db
    .query("products")
    .withIndex("by_slug", (q: any) => q.eq("slug", productId))
    .unique();

  let productRow = bySlug;
  if (!productRow) {
    try {
      productRow = await ctx.db.get(productId);
    } catch {}
  }

  if (productRow) {
    return productRow.boutiqueId;
  }

  // Fallback to matching by boutiqueName string (for mock products)
  const boutique = await ctx.db
    .query("boutiques")
    .filter((q: any) => q.eq(q.field("boutiqueName"), boutiqueName))
    .first();

  if (!boutique) {
    throw new Error("Boutique not found");
  }
  return boutique._id;
}

/**
 * Evaluates a cart item's availability, active state, boutique status, and stock levels.
 * Accepts an optional pre-fetched boutique to avoid redundant db.get() calls for shared boutiques.
 */
async function checkCartItemStatus(
  ctx: any,
  item: any,
  prefetchedBoutique?: any
): Promise<{ isValid: boolean; status: "available" | "deleted" | "inactive" | "suspended" | "out_of_stock" | "quantity_exceeded" }> {
  // 1. Resolve product by slug or ID
  const bySlug = await ctx.db
    .query("products")
    .withIndex("by_slug", (q: any) => q.eq("slug", item.productId))
    .unique();

  let productRow = bySlug;
  if (!productRow) {
    try {
      productRow = await ctx.db.get(item.productId);
    } catch {
      // Ignore invalid ID checks
    }
  }

  const isMock = MOCK_INVENTORY[item.productId] !== undefined;

  // Check if product is deleted
  if (!productRow && !isMock) {
    return { isValid: false, status: "deleted" };
  }

  // Check if product is inactive
  if (productRow && !productRow.active) {
    return { isValid: false, status: "inactive" };
  }

  // Check if product is hidden by admin
  if (productRow && productRow.adminHidden === true) {
    return { isValid: false, status: "inactive" };
  }

  // Resolve Boutique — use pre-fetched value if provided, else fall back to db lookup
  let boutique = prefetchedBoutique ?? null;
  if (!boutique) {
    if (productRow) {
      boutique = await ctx.db.get(productRow.boutiqueId);
    } else {
      // Mock product: fallback matching by boutiqueName string
      boutique = await ctx.db
        .query("boutiques")
        .filter((q: any) => q.eq(q.field("boutiqueName"), item.boutiqueName))
        .first();
    }
  }

  // Check if boutique is suspended/unapproved
  if (!boutique || boutique.status !== "APPROVED") {
    return { isValid: false, status: "suspended" };
  }

  // Check catalog stock levels
  let stock = 0;
  if (productRow) {
    stock = productRow.stockBySize[item.size] ?? 0;
  } else if (isMock) {
    const mock = MOCK_INVENTORY[item.productId];
    if (mock) {
      stock = mock.inventory[item.size] ?? 0;
    }
  }

  if (stock === 0) {
    return { isValid: false, status: "out_of_stock" };
  }

  if (item.quantity > stock) {
    return { isValid: false, status: "quantity_exceeded" };
  }

  return { isValid: true, status: "available" };
}

/**
 * Fetch all cart items for the current user.
 */
export const getCart = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) {
      return {
        items: [],
        hasIssues: false,
      };
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();

    // Pre-resolve all products in parallel to extract unique boutiqueIds
    const productFetches = await Promise.all(
      items.map(async (item) => {
        const bySlug = await ctx.db
          .query("products")
          .withIndex("by_slug", (q: any) => q.eq("slug", item.productId))
          .unique();
        let productRow: any = bySlug;
        if (!productRow) {
          try { productRow = await ctx.db.get(item.productId as any); } catch {}
        }
        return { item, productRow };
      })
    );

    // Batch-fetch unique boutiques once into a Map
    const uniqueBoutiqueIds = new Set<string>();
    for (const { productRow } of productFetches) {
      if (productRow) uniqueBoutiqueIds.add(productRow.boutiqueId.toString());
    }
    const boutiqueFetches: any[] = await Promise.all(
      [...uniqueBoutiqueIds].map((id) => ctx.db.get(id as any))
    );
    const boutiqueMap = new Map<string, any>(
      boutiqueFetches.filter(Boolean).map((b: any) => [b._id.toString(), b])
    );

    // Enrich cart items with current status and validity checks, passing pre-fetched boutique
    const enrichedItems = await Promise.all(
      productFetches.map(async ({ item, productRow }) => {
        const prefetchedBoutique = productRow
          ? boutiqueMap.get(productRow.boutiqueId.toString()) ?? null
          : null;
        const check = await checkCartItemStatus(ctx, item, prefetchedBoutique);
        const boutiqueId = productRow ? productRow.boutiqueId : prefetchedBoutique?._id;
        return {
          ...item,
          boutiqueId,
          isValid: check.isValid,
          status:  check.status,
        };
      })
    );

    const hasIssues = enrichedItems.some((item) => !item.isValid);
    const blockingReason = hasIssues
      ? "Some items in your cart are no longer available. Please remove them to proceed."
      : undefined;

    return {
      items: enrichedItems,
      hasIssues,
      blockingReason,
    };
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
    token:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);

    // Validate size and stock
    await validateProductSizeAndStock(ctx.db, args.productId, args.size, args.quantity);

    // Resolve boutique ID for the new item
    const newBoutiqueId = await resolveBoutiqueId(ctx, args.productId, args.boutiqueName);

    // Enforce "One Boutique Per Checkout" constraint using ID
    const existingCartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    if (existingCartItems.length > 0) {
      for (const item of existingCartItems) {
        const itemBoutiqueId = item.boutiqueId || await resolveBoutiqueId(ctx, item.productId, item.boutiqueName);
        if (itemBoutiqueId !== newBoutiqueId) {
          throw new Error("Your cart contains items from another boutique. Clear your cart to continue.");
        }
      }
    }

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
      boutiqueId:  newBoutiqueId,
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
  args: { cartItemId: v.id("cartItems"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
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
    token:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
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
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(200);
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});

/**
 * Automatically removes inactive, deleted, and suspended items from the cart.
 */
export const removeInvalidItems = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    let removedCount = 0;
    for (const item of items) {
      const check = await checkCartItemStatus(ctx, item);
      if (
        check.status === "deleted" ||
        check.status === "inactive" ||
        check.status === "suspended"
      ) {
        await ctx.db.delete(item._id);
        removedCount++;
      }
    }
    return { removedCount };
  },
});

/**
 * Background cleanup job when a boutique becomes SUSPENDED.
 * Purges affected cart items and issues notifications.
 */
export const onBoutiqueSuspended = internalMutation({
  args: { boutiqueId: v.string() },
  handler: async (ctx, args) => {
    // 1. Find all products belonging to this boutique
    const products = await ctx.db
      .query("products")
      .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    const productIdsOrSlugs = new Set<string>();
    for (const p of products) {
      productIdsOrSlugs.add(p._id);
      productIdsOrSlugs.add(p.slug);
    }

    // 2. Fetch all cart items to find affected users/carts
    const cartItems = await ctx.db.query("cartItems").collect();
    const affectedUserIds = new Set<string>();

    for (const item of cartItems) {
      const isMatch = productIdsOrSlugs.has(item.productId) || (item.productSlug && productIdsOrSlugs.has(item.productSlug));
      if (isMatch) {
        await ctx.db.delete(item._id);
        affectedUserIds.add(item.userId as any);
      }
    }

    // 3. Create a notification for each affected user
    for (const userIdStr of affectedUserIds) {
      const userId = userIdStr as any;
      await ctx.db.insert("notifications", {
        userId,
        type: "boutique_suspended",
        channel: "in_app",
        title: "Cart Updated",
        body: "One or more products were removed from your cart because the boutique is temporarily unavailable.",
        status: "pending",
        isRead: false,
        createdAt: Date.now(),
      });
    }
  },
});
