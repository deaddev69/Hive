import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { calculateProductPricing, PlatformSettings, DEFAULT_TIER_SLABS, getPlatformSettings as fetchPlatformSettings } from "./pricingService";

/**
 * Recalculate customer prices for all products in the database from their basePrice.
 * Each product is recalculated using its owning boutique's pricingTier.
 */
async function syncAllProductsPricing(ctx: any, settings: PlatformSettings): Promise<number> {
  const products = await ctx.db.query("products").collect();
  let updatedCount = 0;

  // Build a cache of boutiqueId → pricingTier to avoid N+1 queries
  const boutiqueTierCache: Record<string, string> = {};

  for (const product of products) {
    const basePricePaise = product.basePrice !== undefined ? product.basePrice : product.price;
    const basePriceRupees = basePricePaise / 100;
    const baseDiscountPriceRupees = product.baseDiscountPrice ? product.baseDiscountPrice / 100 : undefined;

    // Resolve boutique pricingTier (cached)
    let pricingTier = "tier1";
    if (product.boutiqueId) {
      if (boutiqueTierCache[product.boutiqueId] !== undefined) {
        pricingTier = boutiqueTierCache[product.boutiqueId];
      } else {
        const boutique = await ctx.db.get(product.boutiqueId);
        pricingTier = boutique?.pricingTier || "tier1";
        boutiqueTierCache[product.boutiqueId] = pricingTier;
      }
    }

    const pricing = calculateProductPricing(basePriceRupees, baseDiscountPriceRupees, settings, pricingTier);

    const customerPrice = Math.round(pricing.customerPrice * 100);
    const customerDiscountPrice = pricing.customerDiscountPrice
      ? Math.round(pricing.customerDiscountPrice * 100)
      : undefined;

    await ctx.db.patch(product._id, {
      basePrice: basePricePaise,
      price: customerPrice,
      discountPrice: customerDiscountPrice,
      updatedAt: Date.now(),
    });
    updatedCount++;
  }

  return updatedCount;
}

export const getPlatformSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").first();
    if (!settings) {
      // Return defaults if not initialized in DB yet
      return { 
        markupRate: 0.15, 
        platformFeeRate: 0.02,
        markupType: "tiered" as const,
        markupTiers: DEFAULT_TIER_SLABS,
      };
    }
    return {
      ...settings,
      markupType: settings.markupType ?? "tiered",
      markupTiers: settings.markupTiers ?? DEFAULT_TIER_SLABS,
    };
  },
});

export const syncOfficialHiveSlabs = mutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        markupRate: 0.15,
        platformFeeRate: 0.02,
        markupType: "tiered",
        markupTiers: DEFAULT_TIER_SLABS,
        updatedAt: Date.now(),
      });
      return "Updated platformSettings with official Hive slabs (8%/5%).";
    } else {
      await ctx.db.insert("platformSettings", {
        markupRate: 0.15,
        platformFeeRate: 0.02,
        markupType: "tiered",
        markupTiers: DEFAULT_TIER_SLABS,
        updatedAt: Date.now(),
      });
      return "Created platformSettings with official Hive slabs (8%/5%).";
    }
  },
});

const tierSlabValidator = v.object({
  min_price: v.number(),
  max_price: v.union(v.number(), v.null()),
  rate: v.number()
});

const tierConfigValidator = v.optional(v.object({
  name: v.string(),
  slabs: v.array(tierSlabValidator),
}));

export const updatePlatformSettings = mutation({
  args: {
    markupRate: v.number(),
    platformFeeRate: v.number(),
    markupType: v.union(v.literal("flat"), v.literal("tiered")),
    markupTiers: v.array(tierSlabValidator),
    tier1: tierConfigValidator,
    tier2: tierConfigValidator,
    tier3: tierConfigValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const settings = await ctx.db.query("platformSettings").first();
    
    const patchData: any = {
      markupRate: args.markupRate,
      platformFeeRate: args.platformFeeRate,
      markupType: args.markupType,
      markupTiers: args.markupTiers,
      updatedAt: Date.now(),
    };
    if (args.tier1 !== undefined) patchData.tier1 = args.tier1;
    if (args.tier2 !== undefined) patchData.tier2 = args.tier2;
    if (args.tier3 !== undefined) patchData.tier3 = args.tier3;

    if (settings) {
      await ctx.db.patch(settings._id, patchData);
    } else {
      await ctx.db.insert("platformSettings", patchData);
    }

    const newSettings: PlatformSettings = {
      markupRate: args.markupRate,
      platformFeeRate: args.platformFeeRate,
      markupType: args.markupType,
      markupTiers: args.markupTiers,
      tier1: args.tier1,
      tier2: args.tier2,
      tier3: args.tier3,
    };

    const updatedProductsCount = await syncAllProductsPricing(ctx, newSettings);

    return {
      success: true,
      updatedProductsCount,
    };
  },
});

export const updatePlatformSettingsFromApi = mutation({
  args: {
    secret: v.optional(v.string()),
    markupRate: v.number(),
    platformFeeRate: v.number(),
    markupType: v.union(v.literal("flat"), v.literal("tiered")),
    markupTiers: v.array(tierSlabValidator),
    tier1: tierConfigValidator,
    tier2: tierConfigValidator,
    tier3: tierConfigValidator,
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.CLERK_SECRET_KEY;
    if (expectedSecret && args.secret && args.secret !== expectedSecret) {
      throw new Error("Unauthorized: Invalid secret key.");
    }
    const settings = await ctx.db.query("platformSettings").first();

    const patchData: any = {
      markupRate: args.markupRate,
      platformFeeRate: args.platformFeeRate,
      markupType: args.markupType,
      markupTiers: args.markupTiers,
      updatedAt: Date.now(),
    };
    if (args.tier1 !== undefined) patchData.tier1 = args.tier1;
    if (args.tier2 !== undefined) patchData.tier2 = args.tier2;
    if (args.tier3 !== undefined) patchData.tier3 = args.tier3;

    if (settings) {
      await ctx.db.patch(settings._id, patchData);
    } else {
      await ctx.db.insert("platformSettings", patchData);
    }

    const newSettings: PlatformSettings = {
      markupRate: args.markupRate,
      platformFeeRate: args.platformFeeRate,
      markupType: args.markupType,
      markupTiers: args.markupTiers,
      tier1: args.tier1,
      tier2: args.tier2,
      tier3: args.tier3,
    };

    const updatedProductsCount = await syncAllProductsPricing(ctx, newSettings);

    return {
      success: true,
      updatedProductsCount,
    };
  }
});

export const recalculateAllProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const settings = await fetchPlatformSettings(ctx);
    const updatedProductsCount = await syncAllProductsPricing(ctx, settings);
    return {
      success: true,
      updatedProductsCount,
    };
  },
});
