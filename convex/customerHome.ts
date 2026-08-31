import { query } from "./_generated/server";
import { v } from "convex/values";
import { ContentService } from "./services/content/ContentService";
import { CollectionService } from "./services/merchandising/CollectionService";

export const resolveExperiencePayload = query({
  args: {
    slug: v.string(),
    city: v.optional(v.string()),
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Delegate to the new decoupled Content Service architecture
    return ContentService.getExperience(ctx, args.slug, {
      lat: args.userLat,
      lng: args.userLng,
      city: args.city,
      userId: args.userId,
    });
  },
});

export const getCollection = query({
  args: {
    slug: v.string(),
    city: v.optional(v.string()),
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch collection by slug
    const collection = await ctx.db
      .query("collections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!collection || collection.status !== "published") return null;

    // 2. Hydrate
    const hydrated = await CollectionService.hydrateCollection(ctx, collection._id, new Map());
    if (!hydrated) return null;
    
    // We can just query products in parallel, or if hydrateCollection doesn't fetch products... wait, hydrateCollection returns productIds.
    const products = await Promise.all(hydrated.productIds.map(id => ctx.db.get(id as any)));
    const validProducts = products.filter(Boolean);

    // Ideally, we'd enrich these using the same method.
    // For Phase 1 commerce grid, just return them.
    return {
      collection: hydrated,
      products: validProducts,
    };
  }
});

export const getAllCollections = query({
  args: {},
  handler: async (ctx) => {
    const rawCollections = await ctx.db
      .query("collections")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return await Promise.all(
      rawCollections.map(async (col) => {
        const mappings = await ctx.db
          .query("collectionProducts")
          .withIndex("by_collection_sort", (q: any) => q.eq("collectionId", col._id))
          .collect();
        return {
          ...col,
          productCount: mappings.length,
        };
      })
    );
  }
});

