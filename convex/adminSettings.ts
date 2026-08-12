import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { calculateProductPricing, PlatformSettings, getPlatformSettings as fetchPlatformSettings } from "./pricingService";

/**
 * Recalculate customer prices for all products in the database from their basePrice.
 */
async function syncAllProductsPricing(ctx: any, settings: PlatformSettings): Promise<number> {
  const products = await ctx.db.query("products").collect();
  let updatedCount = 0;

  for (const product of products) {
    const basePricePaise = product.basePrice !== undefined ? product.basePrice : product.price;
    const basePriceRupees = basePricePaise / 100;
    const baseDiscountPriceRupees = product.baseDiscountPrice ? product.baseDiscountPrice / 100 : undefined;

    const pricing = calculateProductPricing(basePriceRupees, baseDiscountPriceRupees, settings);

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
    const defaultTiers = [
      { min_price: 0, max_price: 499, rate: 18 },
      { min_price: 500, max_price: 999, rate: 16 },
      { min_price: 1000, max_price: 1499, rate: 14 },
      { min_price: 1500, max_price: 2499, rate: 12 },
      { min_price: 2500, max_price: 4999, rate: 11 },
      { min_price: 5000, max_price: null, rate: 10 }
    ];
    if (!settings) {
      // Return defaults if not initialized in DB yet
      return { 
        markupRate: 0.15, 
        platformFeeRate: 0.02,
        markupType: "tiered" as const,
        markupTiers: defaultTiers
      };
    }
    return {
      ...settings,
      markupType: settings.markupType ?? "tiered",
      markupTiers: settings.markupTiers ?? defaultTiers
    };
  },
});

export const updatePlatformSettings = mutation({
  args: {
    markupRate: v.number(),
    platformFeeRate: v.number(),
    markupType: v.union(v.literal("flat"), v.literal("tiered")),
    markupTiers: v.array(v.object({
      min_price: v.number(),
      max_price: v.union(v.number(), v.null()),
      rate: v.number()
    }))
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const settings = await ctx.db.query("platformSettings").first();
    
    if (settings) {
      await ctx.db.patch(settings._id, {
        markupRate: args.markupRate,
        platformFeeRate: args.platformFeeRate,
        markupType: args.markupType,
        markupTiers: args.markupTiers,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platformSettings", {
        markupRate: args.markupRate,
        platformFeeRate: args.platformFeeRate,
        markupType: args.markupType,
        markupTiers: args.markupTiers,
        updatedAt: Date.now(),
      });
    }

    const newSettings: PlatformSettings = {
      markupRate: args.markupRate,
      platformFeeRate: args.platformFeeRate,
      markupType: args.markupType,
      markupTiers: args.markupTiers,
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
    markupTiers: v.array(v.object({
      min_price: v.number(),
      max_price: v.union(v.number(), v.null()),
      rate: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.CLERK_SECRET_KEY;
    if (expectedSecret && args.secret && args.secret !== expectedSecret) {
      throw new Error("Unauthorized: Invalid secret key.");
    }
    const settings = await ctx.db.query("platformSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        markupRate: args.markupRate,
        platformFeeRate: args.platformFeeRate,
        markupType: args.markupType,
        markupTiers: args.markupTiers,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platformSettings", {
        markupRate: args.markupRate,
        platformFeeRate: args.platformFeeRate,
        markupType: args.markupType,
        markupTiers: args.markupTiers,
        updatedAt: Date.now(),
      });
    }

    const newSettings: PlatformSettings = {
      markupRate: args.markupRate,
      platformFeeRate: args.platformFeeRate,
      markupType: args.markupType,
      markupTiers: args.markupTiers,
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
