import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { enrichProducts, getTotalStock } from "./products";
import { enforceAdmin } from "./homepageAdminShared";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN QUERIES
// ─────────────────────────────────────────────────────────────────────────────

// Get all homepage collections with item counts and health status
export const getAllHomepageCollections = query({
  args: {},
  handler: async (ctx) => {
    const platformCols = await ctx.db.query("collections").withIndex("by_createdAt").collect();

    const combined = platformCols.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      title: c.name,
      subtitle: c.description,
      coverImage: c.coverImage,
      coverAlt: c.coverAlt,
      slug: c.slug,
      sourceMode: "MANUAL" as const,
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

// Rich Catalog query for Visual Merchandising Suite
export const getCatalogProductsForMerchandising = query({
  args: {
    query: v.optional(v.string()),
    collectionId: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    boutiqueId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(args.limit ?? 150);

    let filtered = allProducts;

    // Filter by search query
    if (args.query && args.query.trim() !== "") {
      const q = args.query.toLowerCase().trim();
      filtered = filtered.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
          (p.boutiqueName && p.boutiqueName.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (args.categoryId && args.categoryId !== "all") {
      const targetCat = args.categoryId.toLowerCase();
      filtered = filtered.filter(
        (p: any) => p.categoryId === args.categoryId || p.categoryName?.toLowerCase() === targetCat
      );
    }

    // Filter by boutique
    if (args.boutiqueId && args.boutiqueId !== "all") {
      filtered = filtered.filter((p: any) => p.boutiqueId === args.boutiqueId);
    }

    const enriched = await enrichProducts(ctx, filtered);
    const inStock = enriched.filter((p: any) => p.active && getTotalStock(p.stockBySize) > 0);

    // Get set of products already in the selected collection
    let existingProductIds = new Set<string>();
    if (args.collectionId) {
      const existingMappings = await ctx.db
        .query("collectionProducts")
        .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId!))
        .collect();
      existingProductIds = new Set(existingMappings.map((m) => m.productId.toString()));
    }

    return inStock.map((p: any) => ({
      ...p,
      isAlreadyInCollection: existingProductIds.has(p._id.toString()),
    }));
  },
});

// Search catalog products to add to a collection
export const searchCatalogProducts = query({
  args: { query: v.optional(v.string()), limit: v.optional(v.number()), collectionId: v.optional(v.string()) },
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

    // Filter out already added products if collectionId is provided
    if (args.collectionId) {
      const existingMappings = await ctx.db
        .query("collectionProducts")
        .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId!))
        .collect();
      const existingProductIds = new Set(existingMappings.map((m) => m.productId));
      filtered = filtered.filter((p: any) => !existingProductIds.has(p._id));
    }

    const enriched = await enrichProducts(ctx, filtered);

    // Only return products that have stock
    return enriched.filter((p: any) => p.active && getTotalStock(p.stockBySize) > 0);
  },
});

// Batch add multiple products to a collection
export const addProductsToCollectionBatch = mutation({
  args: {
    collectionId: v.string(),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const existing = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    const existingSet = new Set(existing.map((m) => m.productId));
    let nextSortOrder = existing.length > 0
      ? Math.max(...existing.map((m) => m.sortOrder)) + 1
      : 0;

    let addedCount = 0;
    for (const pId of args.productIds) {
      if (!existingSet.has(pId)) {
        await ctx.db.insert("collectionProducts", {
          collectionId: args.collectionId,
          productId: pId,
          sortOrder: nextSortOrder++,
          isPinned: false,
          addedAt: Date.now(),
        });
        existingSet.add(pId);
        addedCount++;
      }
    }
    return addedCount;
  },
});

// 1-Click Smart Auto-Populate Collection
export const autoPopulateCollection = mutation({
  args: {
    collectionId: v.string(),
    mode: v.union(
      v.literal("category"),
      v.literal("boutique"),
      v.literal("new_arrivals"),
      v.literal("best_sellers")
    ),
    targetId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const targetLimit = args.limit ?? 12;
    let queryBuilder = ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true));

    let candidateProducts = await queryBuilder.take(100);

    if (args.mode === "category" && args.targetId) {
      candidateProducts = candidateProducts.filter(
        (p: any) => p.categoryId === args.targetId || p.categoryName?.toLowerCase() === args.targetId?.toLowerCase()
      );
    } else if (args.mode === "boutique" && args.targetId) {
      candidateProducts = candidateProducts.filter((p: any) => p.boutiqueId === args.targetId);
    } else if (args.mode === "best_sellers") {
      candidateProducts = candidateProducts.filter((p: any) => p.featured || p.hiveScore > 50);
    }

    const sorted = candidateProducts
      .filter((p: any) => getTotalStock(p.stockBySize) > 0)
      .slice(0, targetLimit);

    const existing = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q) => q.eq("collectionId", args.collectionId))
      .collect();

    const existingSet = new Set(existing.map((m) => m.productId));
    let nextSortOrder = existing.length > 0
      ? Math.max(...existing.map((m) => m.sortOrder)) + 1
      : 0;

    let addedCount = 0;
    for (const p of sorted) {
      if (!existingSet.has(p._id)) {
        await ctx.db.insert("collectionProducts", {
          collectionId: args.collectionId,
          productId: p._id,
          sortOrder: nextSortOrder++,
          isPinned: false,
          addedAt: Date.now(),
        });
        existingSet.add(p._id);
        addedCount++;
      }
    }

    return addedCount;
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
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("collections", {
      sourceMode: "MANUAL",
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
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
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
    await enforceAdmin(ctx);
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
    await enforceAdmin(ctx);
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
    await enforceAdmin(ctx);
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
    await enforceAdmin(ctx);
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
    await enforceAdmin(ctx);
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
    await enforceAdmin(ctx);
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
// DUPLICATE COLLECTION MUTATION
// ─────────────────────────────────────────────────────────────────────────────

export const duplicateCollection = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
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
      sourceMode: "MANUAL",
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
