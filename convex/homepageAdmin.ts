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
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SEED STARTER HOMEPAGE DATA
// ─────────────────────────────────────────────────────────────────────────────

export const seedDefaultHomepageData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    // 1. Seed Hero Campaigns if empty
    const existingCampaigns = await ctx.db.query("heroCampaigns").collect();
    if (existingCampaigns.length === 0) {
      await ctx.db.insert("heroCampaigns", {
        title: "Monsoon Handloom Edit '26",
        subtitle: "Breathable Kerala linens, hand-dyed organzas & rainy day silhouettes curated by local boutiques.",
        imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80",
        ctaText: "Explore Monsoon Edit",
        ctaUrl: "/shop?collection=monsoon",
        priority: 10,
        startDate: now - 1000,
        endDate: now + oneYear,
        isPublished: true,
        createdAt: now,
      });

      await ctx.db.insert("heroCampaigns", {
        title: "Kochi Festive & Wedding Luxe",
        subtitle: "Handcrafted Zari sarees, bridal lehengas & evening co-ords delivered in under 2 hours.",
        imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1400&q=80",
        ctaText: "Shop Wedding Collection",
        ctaUrl: "/shop?collection=wedding",
        priority: 9,
        startDate: now - 1000,
        endDate: now + oneYear,
        isPublished: true,
        createdAt: now,
      });
    }

    // 2. Seed Homepage Collections if empty
    const existingCols = await ctx.db.query("homepageCollections").collect();
    if (existingCols.length === 0) {
      // Moods
      const moods = [
        { title: "Feeling Cute", emoji: "✨", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80" },
        { title: "Boss Mode", emoji: "💼", imageUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=600&q=80" },
        { title: "Minimal Luxe", emoji: "🌿", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80" },
        { title: "Coffee Date", emoji: "☕", imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80" },
      ];

      for (let i = 0; i < moods.length; i++) {
        const m = moods[i];
        await ctx.db.insert("homepageCollections", {
          title: m.title,
          subtitle: `Curated ${m.title} outfits`,
          emoji: m.emoji,
          imageUrl: m.imageUrl,
          slug: m.title.toLowerCase().replace(/\s+/g, "-"),
          type: "mood",
          sortOrder: i + 1,
          isPublished: true,
          createdAt: now,
        });
      }

      // Occasions
      const occasions = [
        { title: "Office & Workwear", subtitle: "Tailored blazers, linen trousers & crisp shirts", imageUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=80" },
        { title: "Brunch & Cafe", subtitle: "Floaty sundresses, pastel sets & tote bags", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" },
        { title: "Date Night", subtitle: "Silk slips, bodycon dresses & statement jewelry", imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80" },
      ];

      for (let i = 0; i < occasions.length; i++) {
        const o = occasions[i];
        await ctx.db.insert("homepageCollections", {
          title: o.title,
          subtitle: o.subtitle,
          imageUrl: o.imageUrl,
          slug: o.title.toLowerCase().replace(/\s+/g, "-"),
          type: "occasion",
          sortOrder: i + 1,
          isPublished: true,
          createdAt: now,
        });
      }

      // Trending in Kochi
      await ctx.db.insert("homepageCollections", {
        title: "Trending in Kochi",
        subtitle: "Most requested styles across Panampilly Nagar & Edappally",
        slug: "trending-in-kochi",
        type: "trending",
        sortOrder: 1,
        isPublished: true,
        createdAt: now,
      });

      // Going Out Today
      await ctx.db.insert("homepageCollections", {
        title: "Going Out Today",
        subtitle: "Evening co-ords & party edit",
        slug: "going-out-today",
        type: "going_out",
        sortOrder: 1,
        isPublished: true,
        createdAt: now,
      });
    }

    return true;
  },
});

