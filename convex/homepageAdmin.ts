import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { enrichProducts, getTotalStock } from "./products";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN QUERIES
// ─────────────────────────────────────────────────────────────────────────────

// Get all hero campaigns for admin management
export const getAllEditorialBanners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("editorialBanners").collect();
  },
});

// Get all homepage collections with item counts and health status
export const getAllHomepageCollections = query({
  args: {},
  handler: async (ctx) => {
    const platformCols = await ctx.db.query("collections").collect();
    
    const combined = platformCols.map((c) => ({
      _id: c._id.toString(),
      title: c.name,
      subtitle: c.description,
      coverImage: c.coverImage,
      coverAlt: c.coverAlt,
      slug: c.slug,
      sourceMode: c.sourceMode || "MANUAL",
      rules: c.rules || [],
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

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

export const createCampaign = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    desktopImage: v.string(),
    mobileImage: v.string(),
    targetUrl: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const newId = await ctx.db.insert("editorialBanners", {
      ...args,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

export const updateEditorialBanner = mutation({
  args: {
    id: v.id("editorialBanners"),
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

export const deleteEditorialBanner = mutation({
  args: { id: v.id("editorialBanners") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateCampaign = mutation({
  args: {
    id: v.id("editorialBanners"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE COLLECTION MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const createCollection = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    coverAlt: v.optional(v.string()),
    sourceMode: v.union(v.literal("MANUAL"), v.literal("RULE"), v.literal("HYBRID")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("collections", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCollection = mutation({
  args: {
    id: v.id("collections"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    coverAlt: v.optional(v.string()),
    sourceMode: v.optional(v.union(v.literal("MANUAL"), v.literal("RULE"), v.literal("HYBRID"))),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteCollection = mutation({
  args: { id: v.id("collections") },
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
// EXPERIENCES ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getExperiences = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("experiences").collect();
  },
});

export const createExperience = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("experiences", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateExperience = mutation({
  args: {
    id: v.id("experiences"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const archiveExperience = mutation({
  args: { id: v.id("experiences") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE BLOCKS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getExperienceBlocks = query({
  args: {
    experienceId: v.id("experiences"),
    status: v.optional(v.union(v.literal("draft"), v.literal("published")))
  },
  handler: async (ctx, args) => {
    const targetStatus = args.status ?? "draft";
    return await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) => 
        q.eq("experienceId", args.experienceId).eq("status", targetStatus)
      )
      .collect();
  },
});

export const updateExperienceBlock = mutation({
  args: {
    id: v.id("experienceBlocks"),
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
  args: { id: v.id("experienceBlocks"), status: v.union(v.literal("draft"), v.literal("published")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const publishExperienceBlocks = mutation({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    const draftBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) => 
        q.eq("experienceId", args.experienceId).eq("status", "draft")
      )
      .collect();

    // Delete current published blocks for this experience
    const publishedBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) => 
        q.eq("experienceId", args.experienceId).eq("status", "published")
      )
      .collect();

    for (const pb of publishedBlocks) {
      await ctx.db.delete(pb._id);
    }

    // Clone draft blocks to published status
    for (const db of draftBlocks) {
      const { _id, _creationTime, ...blockData } = db;
      await ctx.db.insert("experienceBlocks", {
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
    const existingCampaigns = await ctx.db.query("editorialBanners").collect();
    if (existingCampaigns.length === 0) {
      await ctx.db.insert("editorialBanners", {
        title: "Monsoon Handloom Edit '26",
        subtitle: "Breathable Kerala linens, hand-dyed organzas & rainy day silhouettes curated by local boutiques.",
        desktopImage: "",
        mobileImage: "",
        targetUrl: "/shop?collection=monsoon",
        status: "published",
        createdAt: now,
      });

      await ctx.db.insert("editorialBanners", {
        title: "Kochi Festive & Wedding Luxe",
        subtitle: "Handcrafted Zari sarees, bridal lehengas & evening co-ords delivered in under 2 hours.",
        desktopImage: "",
        mobileImage: "",
        targetUrl: "/shop?collection=wedding",
        status: "published",
        createdAt: now,
      });
    }

    // 2. Seed Collections if empty
    const existingCols = await ctx.db.query("collections").collect();
    const colIdMap: Record<string, string> = {};
    if (existingCols.length === 0) {
      const defaultCols = [
        { name: "Today's Edit", description: "Hand-picked daily editorial picks", slug: "todays-edit" },
        { name: "Fresh on Hive", description: "New arrivals in the last 14 days", slug: "fresh-on-hive" },
        { name: "Trending in Kochi", description: "Popular styles across Panampilly Nagar & Edappally", slug: "trending-in-kochi" },
        { name: "Going Out Today", description: "Evening co-ords & party wear", slug: "going-out-today" },
        { name: "Wedding Season", description: "Festive sarees, bridal lehengas & sherwanis", slug: "wedding-season" },
        { name: "Quiet Luxury", description: "Minimalist linen, silks & structured cuts", slug: "quiet-luxury" },
        { name: "Linen Love", description: "100% pure Kerala handloom linens", slug: "linen-love" },
        { name: "Under ₹999", description: "Affordable boutique finds", slug: "under-999" },
      ];

      for (const col of defaultCols) {
        const id = await ctx.db.insert("collections", {
          name: col.name,
          description: col.description,
          slug: col.slug,
          sourceMode: "MANUAL",
          status: "published",
          createdAt: now,
          updatedAt: now,
        });
        colIdMap[col.slug] = id.toString();
      }
    } else {
      for (const col of existingCols) {
        colIdMap[col.slug] = col._id.toString();
      }
    }

    // 3. Seed Homepage Experience
    const existingExperiences = await ctx.db.query("experiences").collect();
    let homepageExpId: any = null;
    
    if (existingExperiences.length === 0) {
      homepageExpId = await ctx.db.insert("experiences", {
        name: "Homepage",
        slug: "homepage",
        seoTitle: "Hive - Women's Fashion Destination",
        seoDescription: "Discover curated fashion from the best local boutiques.",
        status: "published",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      homepageExpId = existingExperiences.find(e => e.slug === "homepage")?._id;
    }

    // 4. Seed Default Blocks if empty
    const existingBlocks = await ctx.db.query("experienceBlocks").collect();
    if (existingBlocks.length === 0 && homepageExpId) {
      const defaultBlocks = [
        { blockKey: "hero_main", title: "Hero Carousel", blockType: "hero" as const, renderer: "productCarousel" as const, sortOrder: 1, config: {} },
        { blockKey: "categories_strip", title: "Shop By Category", blockType: "category" as const, renderer: "largeCards" as const, sortOrder: 2, config: {} },
        { blockKey: "trending_kochi", title: "Trending in Kochi", subtitle: "Most requested styles across Panampilly Nagar, Edappally & Kakkanad.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 3, config: { collectionId: colIdMap["trending-in-kochi"] } },
        { blockKey: "fresh_arrivals", title: "Fresh on Hive", subtitle: "New styles added today by verified boutique partners.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 4, config: { collectionId: colIdMap["fresh-on-hive"] } },
        { blockKey: "going_out", title: "Going Out Today?", subtitle: "Evening co-ords, statement mini dresses & luxury accessories.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 5, config: { collectionId: colIdMap["going-out-today"] } },
        { blockKey: "seasonal_highlight", title: "Wedding & Festive Curation '26", subtitle: "Handcrafted Zari sarees, bridal organzas & designer sherwanis.", blockType: "collection" as const, renderer: "editorialGrid" as const, sortOrder: 6, config: { collectionId: colIdMap["wedding-season"] } },
        { blockKey: "recently_viewed", title: "Recently Viewed & Recommended", blockType: "recentlyViewed" as const, renderer: "productCarousel" as const, sortOrder: 7, config: {} },
        { blockKey: "trust_strip", title: "Why Shop on Hive", blockType: "trust" as const, renderer: "largeCards" as const, sortOrder: 8, config: {} },
      ];

      for (const b of defaultBlocks) {
        await ctx.db.insert("experienceBlocks", {
          experienceId: homepageExpId,
          blockKey: b.blockKey,
          title: b.title,
          subtitle: b.subtitle,
          blockType: b.blockType,
          renderer: b.renderer,
          config: b.config,
          sortOrder: b.sortOrder,
          status: "published",
        });

        await ctx.db.insert("experienceBlocks", {
          experienceId: homepageExpId,
          blockKey: b.blockKey,
          title: b.title,
          subtitle: b.subtitle,
          blockType: b.blockType,
          renderer: b.renderer,
          config: b.config,
          sortOrder: b.sortOrder,
          status: "draft",
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
    newColId = (await ctx.db.insert("collections", {
      name: `${col.name} (Copy)`,
      slug: newSlug,
      description: col.description,
      coverImage: col.coverImage,
      coverAlt: col.coverAlt,
      sourceMode: col.sourceMode,
      rules: col.rules,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    })).toString();

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
  args: { id: v.id("editorialBanners") },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.id);
    if (!campaign) return null;

    const now = Date.now();
    return await ctx.db.insert("editorialBanners", {
      title: `${campaign.title} (Copy)`,
      subtitle: campaign.subtitle,
      desktopImage: campaign.desktopImage,
      mobileImage: campaign.mobileImage,
      targetUrl: campaign.targetUrl,
      status: "draft",
      createdAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE STUDIO MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const duplicateExperience = mutation({
  args: { id: v.id("experiences"), newName: v.string(), newSlug: v.string() },
  handler: async (ctx, args) => {
    const experience = await ctx.db.get(args.id);
    if (!experience) throw new Error("Experience not found");

    const now = Date.now();
    const newExpId = await ctx.db.insert("experiences", {
      name: args.newName,
      slug: args.newSlug,
      seoTitle: experience.seoTitle,
      seoDescription: experience.seoDescription,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate all published blocks
    const blocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) => 
        q.eq("experienceId", args.id).eq("status", "published")
      )
      .collect();

    for (const b of blocks) {
      await ctx.db.insert("experienceBlocks", {
        experienceId: newExpId,
        blockKey: b.blockKey,
        title: b.title,
        subtitle: b.subtitle,
        blockType: b.blockType,
        renderer: b.renderer,
        config: b.config,
        sortOrder: b.sortOrder,
        status: "draft",
      });
    }

    return newExpId;
  },
});

export const addBlockToExperience = mutation({
  args: {
    experienceId: v.id("experiences"),
    blockKey: v.string(),
    blockType: v.union(
      v.literal("collection"),
      v.literal("category"),
      v.literal("hero"),
      v.literal("banner"),
      v.literal("recentlyViewed"),
      v.literal("trust")
    ),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    renderer: v.optional(v.union(
      v.literal("productCarousel"),
      v.literal("largeCards"),
      v.literal("moodGrid"),
      v.literal("occasionGrid"),
      v.literal("editorialGrid")
    )),
    config: v.optional(v.any()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("experienceBlocks", {
      experienceId: args.experienceId,
      blockKey: args.blockKey,
      blockType: args.blockType,
      title: args.title,
      subtitle: args.subtitle,
      renderer: args.renderer,
      config: args.config,
      sortOrder: args.sortOrder,
      status: "draft",
    });
  },
});

export const removeBlockFromExperience = mutation({
  args: { id: v.id("experienceBlocks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateExperienceLayout = mutation({
  args: {
    blocks: v.array(v.object({
      id: v.id("experienceBlocks"),
      sortOrder: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const b of args.blocks) {
      await ctx.db.patch(b.id, { sortOrder: b.sortOrder });
    }
  },
});

export const publishExperience = mutation({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    const draftBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) => 
        q.eq("experienceId", args.experienceId).eq("status", "draft")
      )
      .collect();

    const publishedBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) => 
        q.eq("experienceId", args.experienceId).eq("status", "published")
      )
      .collect();

    // Delete current published blocks
    for (const pb of publishedBlocks) {
      await ctx.db.delete(pb._id);
    }

    // Clone draft blocks to published
    for (const db of draftBlocks) {
      const { _id, _creationTime, ...blockData } = db;
      await ctx.db.insert("experienceBlocks", {
        ...blockData,
        status: "published",
      });
    }

    await ctx.db.patch(args.experienceId, {
      status: "published",
      updatedAt: Date.now(),
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

export const updateBlockContent = mutation({
  args: {
    id: v.id("experienceBlocks"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const updateBlockLayout = mutation({
  args: {
    id: v.id("experienceBlocks"),
    renderer: v.optional(
      v.union(
        v.literal("productCarousel"),
        v.literal("largeCards"),
        v.literal("moodGrid"),
        v.literal("occasionGrid"),
        v.literal("editorialGrid")
      )
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { renderer: args.renderer });
  },
});

export const toggleBlockVisibility = mutation({
  args: {
    id: v.id("experienceBlocks"),
    isHidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    // We repurpose the 'status' field for visibility within the draft experience.
    // 'draft' = visible, 'archived' = hidden
    await ctx.db.patch(args.id, { status: args.isHidden ? "archived" : "draft" });
  },
});

export const duplicateBlock = mutation({
  args: {
    id: v.id("experienceBlocks"),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.id);
    if (!block) throw new Error("Block not found");

    const { _id, _creationTime, ...blockData } = block;

    const allBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) =>
        q.eq("experienceId", block.experienceId)
      )
      .collect();

    const maxSort = allBlocks.reduce((max, b) => Math.max(max, b.sortOrder), 0);

    return await ctx.db.insert("experienceBlocks", {
      ...blockData,
      blockKey: `${blockData.blockKey}_copy_${Date.now()}`,
      sortOrder: maxSort + 1,
      status: "draft", // Always duplicate as visible
    });
  },
});
