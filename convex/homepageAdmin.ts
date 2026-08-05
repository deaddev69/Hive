import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { enrichProducts, getTotalStock } from "./products";

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

// Get all homepage collections with item counts and health status
export const getAllHomepageCollections = query({
  args: {},
  handler: async (ctx) => {
    const legacyCols = await ctx.db.query("homepageCollections").collect();
    const platformCols = await ctx.db.query("collections").collect();
    
    const combined = [
      ...legacyCols.map((c) => ({
        _id: c._id.toString(),
        title: c.title,
        subtitle: c.subtitle,
        emoji: c.emoji,
        imageUrl: c.imageUrl,
        slug: c.slug,
        type: c.type,
        sourceMode: "MANUAL",
        sortOrder: c.sortOrder,
        isPublished: c.isPublished,
        createdAt: c.createdAt,
      })),
      ...platformCols.map((c) => ({
        _id: c._id.toString(),
        title: c.name,
        subtitle: c.description,
        emoji: c.emoji,
        imageUrl: c.imageUrl,
        slug: c.slug,
        type: "collection",
        sourceMode: c.sourceMode || "MANUAL",
        rules: c.rules || [],
        sortOrder: 1,
        isPublished: c.isPublished,
        createdAt: c.createdAt,
      })),
    ];

    return await Promise.all(
      combined.map(async (col) => {
        const mappings = await ctx.db
          .query("collectionProducts")
          .withIndex("by_collection_sort", (q) => q.eq("collectionId", col._id))
          .collect();

        const productCount = mappings.length;
        let health: "HEALTHY" | "LOW_STOCK" | "ATTENTION" | "EMPTY" = "EMPTY";
        if (productCount >= 12) health = "HEALTHY";
        else if (productCount >= 5) health = "LOW_STOCK";
        else if (productCount > 0) health = "ATTENTION";

        return {
          ...col,
          productCount,
          health,
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

    let filtered = allProducts;
    if (args.query && args.query.trim() !== "") {
      const q = args.query.toLowerCase();
      filtered = allProducts.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
          (p.boutiqueName && p.boutiqueName.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    
    const enriched = await enrichProducts(ctx, filtered);
    
    // Only return products that have stock
    return enriched.filter((p: any) => p.active && getTotalStock(p.stockBySize) > 0);
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
  args: { collectionId: v.string(), productId: v.id("products") },
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
  args: { collectionId: v.string(), productId: v.id("products") },
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
    collectionId: v.string(),
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
      if (pId) {
        const mapping = mappingMap.get(pId);
        if (mapping) {
          await ctx.db.patch(mapping._id, { sortOrder: index });
        }
      }
    }
  },
});

export const togglePinProduct = mutation({
  args: { collectionId: v.string(), productId: v.id("products") },
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
// HOMEPAGE BLOCKS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getAllHomepageBlocks = query({
  args: { status: v.optional(v.union(v.literal("draft"), v.literal("published"))) },
  handler: async (ctx, args) => {
    const targetStatus = args.status ?? "draft";
    return await ctx.db
      .query("homepageBlocks")
      .withIndex("by_status_sort", (q) => q.eq("status", targetStatus))
      .collect();
  },
});

export const updateHomepageBlock = mutation({
  args: {
    id: v.id("homepageBlocks"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    config: v.optional(
      v.object({
        collectionId: v.optional(v.string()),
        bannerId: v.optional(v.string()),
        maxProducts: v.optional(v.number()),
        showSeeAll: v.optional(v.boolean()),
        theme: v.optional(v.string()),
        spacing: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const toggleBlockStatus = mutation({
  args: { id: v.id("homepageBlocks"), status: v.union(v.literal("draft"), v.literal("published")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const publishDraftBlocks = mutation({
  args: {},
  handler: async (ctx) => {
    const draftBlocks = await ctx.db
      .query("homepageBlocks")
      .withIndex("by_status_sort", (q) => q.eq("status", "draft"))
      .collect();

    // Delete current published blocks
    const publishedBlocks = await ctx.db
      .query("homepageBlocks")
      .withIndex("by_status_sort", (q) => q.eq("status", "published"))
      .collect();

    for (const pb of publishedBlocks) {
      await ctx.db.delete(pb._id);
    }

    // Clone draft blocks to published status
    for (const db of draftBlocks) {
      const { _id, _creationTime, ...blockData } = db;
      await ctx.db.insert("homepageBlocks", {
        ...blockData,
        status: "published",
      });
    }

    return draftBlocks.length;
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
        imageUrl: "",
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
        imageUrl: "",
        ctaText: "Shop Wedding Collection",
        ctaUrl: "/shop?collection=wedding",
        priority: 9,
        startDate: now - 1000,
        endDate: now + oneYear,
        isPublished: true,
        createdAt: now,
      });
    }

    // 2. Seed Default Blocks if empty
    const existingBlocks = await ctx.db.query("homepageBlocks").collect();
    if (existingBlocks.length === 0) {
      const defaultBlocks = [
        { blockKey: "hero_main", title: "Hero Carousel", blockType: "hero" as const, renderer: "productCarousel" as const, sortOrder: 1 },
        { blockKey: "categories_strip", title: "Shop By Category", blockType: "category" as const, renderer: "largeCards" as const, sortOrder: 2 },
        { blockKey: "trending_kochi", title: "Trending in Kochi", subtitle: "Most requested styles across Panampilly Nagar, Edappally & Kakkanad.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 3 },
        { blockKey: "fresh_arrivals", title: "Fresh on Hive", subtitle: "New styles added today by verified boutique partners.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 4 },
        { blockKey: "going_out", title: "Going Out Today?", subtitle: "Evening co-ords, statement mini dresses & luxury accessories.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 5 },
        { blockKey: "seasonal_highlight", title: "Wedding & Festive Curation '26", subtitle: "Handcrafted Zari sarees, bridal organzas & designer sherwanis.", blockType: "collection" as const, renderer: "editorialGrid" as const, sortOrder: 6 },
        { blockKey: "recently_viewed", title: "Recently Viewed & Recommended", blockType: "recentlyViewed" as const, renderer: "productCarousel" as const, sortOrder: 7 },
        { blockKey: "trust_strip", title: "Why Shop on Hive", blockType: "trust" as const, renderer: "largeCards" as const, sortOrder: 8 },
      ];

      for (const b of defaultBlocks) {
        // Insert both published & draft versions
        await ctx.db.insert("homepageBlocks", {
          blockKey: b.blockKey,
          title: b.title,
          subtitle: b.subtitle,
          blockType: b.blockType,
          renderer: b.renderer,
          config: {},
          sortOrder: b.sortOrder,
          status: "published",
        });

        await ctx.db.insert("homepageBlocks", {
          blockKey: b.blockKey,
          title: b.title,
          subtitle: b.subtitle,
          blockType: b.blockType,
          renderer: b.renderer,
          config: {},
          sortOrder: b.sortOrder,
          status: "draft",
        });
      }
    }

    // 3. Seed Homepage Collections if empty
    const existingCols = await ctx.db.query("homepageCollections").collect();
    if (existingCols.length === 0) {
      const defaultCols = [
        { title: "Today's Edit", subtitle: "Hand-picked daily editorial picks", emoji: "✨", type: "mood" as const, slug: "todays-edit" },
        { title: "Fresh on Hive", subtitle: "New arrivals in the last 14 days", emoji: "🌿", type: "trending" as const, slug: "fresh-on-hive" },
        { title: "Trending in Kochi", subtitle: "Popular styles across Panampilly Nagar & Edappally", emoji: "🔥", type: "trending" as const, slug: "trending-in-kochi" },
        { title: "Going Out Today", subtitle: "Evening co-ords & party wear", emoji: "🍸", type: "going_out" as const, slug: "going-out-today" },
        { title: "Wedding Season", subtitle: "Festive sarees, bridal lehengas & sherwanis", emoji: "👑", type: "seasonal" as const, slug: "wedding-season" },
        { title: "Quiet Luxury", subtitle: "Minimalist linen, silks & structured cuts", emoji: "🕊️", type: "mood" as const, slug: "quiet-luxury" },
        { title: "Linen Love", subtitle: "100% pure Kerala handloom linens", emoji: "🌾", type: "occasion" as const, slug: "linen-love" },
        { title: "Under ₹999", subtitle: "Affordable boutique finds", emoji: "🏷️", type: "occasion" as const, slug: "under-999" },
      ];

      let idx = 0;
      for (const col of defaultCols) {
        idx++;
        await ctx.db.insert("homepageCollections", {
          title: col.title,
          subtitle: col.subtitle,
          emoji: col.emoji,
          slug: col.slug,
          type: col.type,
          sortOrder: idx,
          isPublished: true,
          createdAt: now,
        });
      }
    }

    return true;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE COLLECTION & CAMPAIGN MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const duplicateCollection = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    let col: any = null;
    try {
      col = await ctx.db.get(args.id as any);
    } catch {
      col = null;
    }

    if (!col) return null;

    const now = Date.now();
    const newSlug = `${col.slug}-copy-${Math.random().toString(36).substring(7)}`;

    let newColId: string;
    if (col.name !== undefined) {
      newColId = (await ctx.db.insert("collections", {
        name: `${col.name} (Copy)`,
        slug: newSlug,
        description: col.description,
        imageUrl: col.imageUrl,
        emoji: col.emoji,
        sourceMode: col.sourceMode,
        rules: col.rules,
        isPublished: false,
        createdAt: now,
      })).toString();
    } else {
      newColId = (await ctx.db.insert("homepageCollections", {
        title: `${col.title} (Copy)`,
        subtitle: col.subtitle,
        emoji: col.emoji,
        imageUrl: col.imageUrl,
        slug: newSlug,
        type: col.type,
        sortOrder: (col.sortOrder || 1) + 1,
        isPublished: false,
        createdAt: now,
      })).toString();
    }

    // Duplicate mapped collection items
    const items = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.insert("collectionProducts", {
        collectionId: newColId,
        productId: item.productId,
        sortOrder: item.sortOrder,
        isPinned: item.isPinned,
        isFeatured: item.isFeatured,
        addedAt: now,
      });
    }

    return newColId;
  },
});

export const duplicateCampaign = mutation({
  args: { id: v.id("heroCampaigns") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;

    const now = Date.now();
    return await ctx.db.insert("heroCampaigns", {
      title: `${campaign.title} (Copy)`,
      subtitle: campaign.subtitle,
      imageUrl: campaign.imageUrl,
      ctaText: campaign.ctaText,
      ctaUrl: campaign.ctaUrl,
      priority: campaign.priority,
      startDate: now,
      endDate: campaign.endDate,
      isPublished: false,
      createdAt: now,
    });
  },
});

export const migrateProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;
    for (const p of products) {
      if (p.price < 100000) {
        await ctx.db.patch(p._id, {
          price: p.price * 100,
          basePrice: p.basePrice ? p.basePrice * 100 : undefined,
          discountPrice: p.discountPrice ? p.discountPrice * 100 : undefined,
          baseDiscountPrice: p.baseDiscountPrice ? p.baseDiscountPrice * 100 : undefined,
        });
        updated++;
      }
    }
    return `Migrated ${updated} product prices.`;
  }
});



