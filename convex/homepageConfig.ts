// convex/homepageConfig.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Retrieve active homepage styling and section configuration.
 */
export const getActiveConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("homepageConfig").first();
    if (config) return config;

    // Default configuration if none has been inserted yet
    return {
      activeHeroBannerIds: [],
      featuredCategoryIds: [],
      featuredBoutiqueIds: [],
      enableOccasionSection: true,
      enableMostLovedSection: true,
      trendingSectionTitle: "Trending Near You",
      enableTrendingSection: true,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Update active homepage configuration.
 */
export const updateConfig = mutation({
  args: {
    activeHeroBannerIds: v.optional(v.array(v.id("banners"))),
    featuredCategoryIds: v.optional(v.array(v.id("categories"))),
    featuredBoutiqueIds: v.optional(v.array(v.id("boutiques"))),
    enableOccasionSection: v.optional(v.boolean()),
    enableMostLovedSection: v.optional(v.boolean()),
    trendingSectionTitle: v.optional(v.string()),
    enableTrendingSection: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db.query("homepageConfig").first();
    const updateData: Record<string, any> = {
      ...args,
      updatedAt: Date.now(),
    };

    if (config) {
      await ctx.db.patch(config._id, updateData);
      return config._id;
    } else {
      const id = await ctx.db.insert("homepageConfig", {
        activeHeroBannerIds: args.activeHeroBannerIds || [],
        featuredCategoryIds: args.featuredCategoryIds || [],
        featuredBoutiqueIds: args.featuredBoutiqueIds || [],
        enableOccasionSection: args.enableOccasionSection ?? true,
        enableMostLovedSection: args.enableMostLovedSection ?? true,
        trendingSectionTitle: args.trendingSectionTitle || "Trending Near You",
        enableTrendingSection: args.enableTrendingSection ?? true,
        updatedAt: Date.now(),
      });
      return id;
    }
  },
});
