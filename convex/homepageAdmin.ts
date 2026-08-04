import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN QUERIES
// ─────────────────────────────────────────────────────────────────────────────

// Get all hero campaigns for admin management
export const getAllHeroCampaigns = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("heroCampaigns").collect();
  },
});

// Get all homepage collections with item counts
export const getAllHomepageCollections = query({
  args: {},
  handler: async (ctx) => {
    const collections = await ctx.db.query("homepageCollections").collect();
    
    return await Promise.all(
      collections.map(async (col) => {
        const mappings = await ctx.db
          .query("collectionProducts")
          .withIndex("by_collection_sort", (q) => q.eq("collectionId", col._id))
          .collect();
        return {
          ...col,
          productCount: mappings.length,
        };
      })
    );
  },
});

// Search catalog products to add to a collection
export const searchCatalogProducts = query({
  args: { query: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(args.limit ?? 50);

    if (!args.query || args.query.trim() === "") {
      return allProducts;
    }

    const q = args.query.toLowerCase();
    return allProducts.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        (p.boutiqueName && p.boutiqueName.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HERO CAMPAIGN MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const createHeroCampaign = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    imageUrl: v.string(),
    ctaText: v.string(),
    ctaUrl: v.string(),
    priority: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("heroCampaigns", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateHeroCampaign = mutation({
  args: {
    id: v.id("heroCampaigns"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    priority: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteHeroCampaign = mutation({
  args: { id: v.id("heroCampaigns") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleCampaignPublished = mutation({
  args: { id: v.id("heroCampaigns"), isPublished: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isPublished: args.isPublished });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE COLLECTION MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const createCollection = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    emoji: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    slug: v.string(),
    type: v.union(
      v.literal("mood"),
      v.literal("occasion"),
      v.literal("trending"),
      v.literal("going_out"),
      v.literal("seasonal")
    ),
    sortOrder: v.number(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("homepageCollections", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateCollection = mutation({
  args: {
    id: v.id("homepageCollections"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    emoji: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    slug: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("mood"),
        v.literal("occasion"),
        v.literal("trending"),
        v.literal("going_out"),
        v.literal("seasonal")
      )
    ),
    sortOrder: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteCollection = mutation({
  args: { id: v.id("homepageCollections") },
  handler: async (ctx, args) => {
    // Delete collection products mapping first
    const mappings = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.id))
      .collect();

    for (const m of mappings) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.id);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION PRODUCT MERCHANDISER MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const addProductToCollection = mutation({
  args: { collectionId: v.id("homepageCollections"), productId: v.id("products") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    // Check if product already exists in collection
    const duplicate = existing.find((m) => m.productId === args.productId);
    if (duplicate) return duplicate._id;

    const nextSortOrder = existing.length > 0
      ? Math.max(...existing.map((m) => m.sortOrder)) + 1
      : 0;

    return await ctx.db.insert("collectionProducts", {
      collectionId: args.collectionId,
      productId: args.productId,
      sortOrder: nextSortOrder,
      isPinned: false,
      addedAt: Date.now(),
    });
  },
});

export const removeProductFromCollection = mutation({
  args: { collectionId: v.id("homepageCollections"), productId: v.id("products") },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (mapping) {
      await ctx.db.delete(mapping._id);
    }
  },
});

export const reorderCollectionProducts = mutation({
  args: {
    collectionId: v.id("homepageCollections"),
    orderedProductIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    const mappingMap = new Map(mappings.map((m) => [m.productId, m]));

    for (let index = 0; index < args.orderedProductIds.length; index++) {
      const pId = args.orderedProductIds[index];
      const mapping = mappingMap.get(pId);
      if (mapping) {
        await ctx.db.patch(mapping._id, { sortOrder: index });
      }
    }
  },
});

export const togglePinProduct = mutation({
  args: { collectionId: v.id("homepageCollections"), productId: v.id("products") },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (mapping) {
      await ctx.db.patch(mapping._id, {
        isPinned: !mapping.isPinned,
        sortOrder: !mapping.isPinned ? -1 : 0, // Pinned items get sortOrder -1
      });
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT METADATA ENRICHMENT MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const upsertProductMetadata = mutation({
  args: {
    productId: v.id("products"),
    styleTags: v.array(v.string()),
    occasionTags: v.array(v.string()),
    seasonTags: v.array(v.string()),
    color: v.optional(v.string()),
    fabric: v.optional(v.string()),
    fit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productMetadata")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        styleTags: args.styleTags,
        occasionTags: args.occasionTags,
        seasonTags: args.seasonTags,
        color: args.color,
        fabric: args.fabric,
        fit: args.fit,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("productMetadata", {
        productId: args.productId,
        styleTags: args.styleTags,
        occasionTags: args.occasionTags,
        seasonTags: args.seasonTags,
        color: args.color,
        fabric: args.fabric,
        fit: args.fit,
        updatedAt: now,
      });
    }
  },
});
