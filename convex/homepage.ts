import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get active hero campaigns, respecting start/end dates
export const getActiveHeroCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const campaigns = await ctx.db
      .query("heroCampaigns")
      .withIndex("by_published_priority", (q) => q.eq("isPublished", true))
      .collect();

    // Filter active dates and sort by priority (highest first)
    return campaigns
      .filter((c) => c.startDate <= now && c.endDate >= now)
      .sort((a, b) => b.priority - a.priority);
  },
});

// Generic query to fetch published collections by type
export const getCollectionsByType = query({
  args: {
    type: v.union(
      v.literal("mood"),
      v.literal("occasion"),
      v.literal("trending"),
      v.literal("going_out"),
      v.literal("seasonal")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("homepageCollections")
      .withIndex("by_type_published", (q) =>
        q.eq("type", args.type).eq("isPublished", true)
      )
      .collect(); // Sorted by sortOrder index
  },
});

// Resolve products for a specific collection
export const getCollectionProducts = query({
  args: { collectionId: v.id("homepageCollections"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .take(args.limit ?? 20);

    // Resolve product documents in parallel
    const products = await Promise.all(
      mappings.map(async (mapping) => {
        const product = await ctx.db.get(mapping.productId);
        if (!product) return null;
        return {
          ...product,
          collectionSortOrder: mapping.sortOrder,
          isPinned: mapping.isPinned,
        };
      })
    );

    // Filter out deleted products
    return products.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// Automatic "Fresh on Hive" Section (Latest active products)
export const getFreshArrivals = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

// Record a product view for a user
export const trackProductView = mutation({
  args: { userId: v.id("users"), productId: v.id("products") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("recentlyViewed")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", args.userId).eq("productId", args.productId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Update timestamp if already viewed
      await ctx.db.patch(existing._id, { viewedAt: now });
    } else {
      // Insert new view record
      await ctx.db.insert("recentlyViewed", {
        userId: args.userId,
        productId: args.productId,
        viewedAt: now,
      });
    }
  },
});

// Fetch recently viewed items (with fallback to latest products)
export const getRecentlyViewed = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxItems = args.limit ?? 10;
    const views = await ctx.db
      .query("recentlyViewed")
      .withIndex("by_user_viewed", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(maxItems);

    const products = await Promise.all(
      views.map(async (view) => await ctx.db.get(view.productId))
    );

    const validProducts = products.filter((p): p is NonNullable<typeof p> => p !== null);

    // 80% viewed + 20% fallback to fresh items if user hasn't viewed enough items
    if (validProducts.length < maxItems) {
      const fallbackProducts = await ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("active", true))
        .order("desc")
        .take(maxItems - validProducts.length);

      const existingIds = new Set(validProducts.map((p) => p._id));
      for (const fp of fallbackProducts) {
        if (!existingIds.has(fp._id)) {
          validProducts.push(fp);
        }
      }
    }

    return validProducts;
  },
});
