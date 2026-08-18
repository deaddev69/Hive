import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

import {
  PlatformConfig,
  TierPricingConfig,
  DEFAULT_TIERS_CONFIG,
  DEFAULT_COMMISSION_TIERS,
  DEFAULT_HANDLING_CHARGE_PAISE,
  DEFAULT_PLATFORM_FEE_PAISE,
  DEFAULT_GST_RATE_PERCENT,
  validateTierSlabs,
  calculateAllInclusivePrice,
  calculateAllInclusivePricePaise,
  getPlatformConfig as fetchPlatformConfig,
  // Legacy exports for backward compat
  calculateProductPricing,
  PlatformSettings,
  DEFAULT_TIER_SLABS,
  getPlatformSettings as fetchPlatformSettings,
} from "./pricingService";

// ─── v3: Dynamic Tier Commission Slabs & Platform Config ─────────────────────

export const getPlatformConfig = query({
  args: {},
  handler: async (ctx) => {
    const settings = (await ctx.db.query("platformSettings").first()) as any;
    const tiers: TierPricingConfig[] = settings?.tiers && Array.isArray(settings.tiers) && settings.tiers.length > 0
      ? settings.tiers
      : DEFAULT_TIERS_CONFIG;

    return {
      tiers,
      handlingChargePaise: settings?.handlingChargePaise ?? DEFAULT_HANDLING_CHARGE_PAISE,
      platformFeePaise: settings?.platformFeePaise ?? DEFAULT_PLATFORM_FEE_PAISE,
      gstRatePercent: settings?.gstRatePercent ?? DEFAULT_GST_RATE_PERCENT,
      commissionTiers: settings?.commissionTiers ?? DEFAULT_COMMISSION_TIERS,
      // Legacy fields (for admin UI to show current state)
      markupRate: settings?.markupRate,
      platformFeeRate: settings?.platformFeeRate,
      markupType: settings?.markupType,
      markupTiers: settings?.markupTiers,
    };
  },
});

const commissionSlabValidator = v.object({
  minPrice: v.number(),
  maxPrice: v.union(v.number(), v.null()),
  commissionPercent: v.number(),
});

const tierPricingConfigValidator = v.object({
  key: v.string(),
  name: v.string(),
  commissionSlabs: v.array(commissionSlabValidator),
  commissionGstPercent: v.number(),
  handlingChargePaise: v.number(),
  platformFeePaise: v.number(),
  platformGstPercent: v.number(),
});

const commissionTierValidator = v.object({
  key: v.string(),
  name: v.string(),
  sellerCommissionPercent: v.number(),
});

export const updatePlatformConfig = mutation({
  args: {
    tiers: v.optional(v.array(tierPricingConfigValidator)),
    handlingChargePaise: v.optional(v.number()),
    platformFeePaise: v.optional(v.number()),
    gstRatePercent: v.optional(v.number()),
    commissionTiers: v.optional(v.array(commissionTierValidator)),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const tiersToSave = args.tiers || DEFAULT_TIERS_CONFIG;
    if (tiersToSave.length === 0) {
      throw new Error("At least one tier configuration is required.");
    }

    // Validate each tier's commission slabs and charges
    for (const tier of tiersToSave) {
      const slabValidation = validateTierSlabs(tier.commissionSlabs);
      if (!slabValidation.valid) {
        throw new Error(`Invalid slabs in ${tier.name} tier: ${slabValidation.error}`);
      }

      if (tier.commissionGstPercent < 0 || tier.commissionGstPercent > 100) {
        throw new Error(`Commission GST for ${tier.name} must be between 0% and 100%`);
      }
      if (tier.handlingChargePaise < 0) {
        throw new Error(`Handling charge for ${tier.name} cannot be negative`);
      }
      if (tier.platformFeePaise < 0) {
        throw new Error(`Platform fee for ${tier.name} cannot be negative`);
      }
      if (tier.platformGstPercent < 0 || tier.platformGstPercent > 100) {
        throw new Error(`Platform fee GST for ${tier.name} must be between 0% and 100%`);
      }
    }

    const settings = await ctx.db.query("platformSettings").first();
    const patchData: any = {
      tiers: tiersToSave,
      handlingChargePaise: args.handlingChargePaise ?? tiersToSave[0]?.handlingChargePaise ?? DEFAULT_HANDLING_CHARGE_PAISE,
      platformFeePaise: args.platformFeePaise ?? tiersToSave[0]?.platformFeePaise ?? DEFAULT_PLATFORM_FEE_PAISE,
      gstRatePercent: args.gstRatePercent ?? tiersToSave[0]?.platformGstPercent ?? DEFAULT_GST_RATE_PERCENT,
      commissionTiers: args.commissionTiers ?? tiersToSave.map(t => ({
        key: t.key,
        name: t.name,
        sellerCommissionPercent: t.commissionSlabs[0]?.commissionPercent ?? 2,
      })),
      updatedAt: Date.now(),
    };

    if (settings) {
      await ctx.db.patch(settings._id, patchData);
    } else {
      await ctx.db.insert("platformSettings", patchData);
    }

    return { success: true };
  },
});


// ─── Legacy v1 API (kept for backward compat) ───────────────────────────────

/** @deprecated Use getPlatformConfig instead */
export const getPlatformSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").first();
    if (!settings) {
      return { 
        markupRate: 0.15, 
        platformFeeRate: 0.02,
        markupType: "tiered" as const,
        markupTiers: DEFAULT_TIER_SLABS,
      };
    }
    return {
      ...settings,
      markupType: (settings as any).markupType ?? "tiered",
      markupTiers: (settings as any).markupTiers ?? DEFAULT_TIER_SLABS,
    };
  },
});

/** @deprecated Use updatePlatformConfig instead */
export const syncOfficialHiveSlabs = mutation({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").first();
    const data: any = {
      handlingChargePaise: DEFAULT_HANDLING_CHARGE_PAISE,
      platformFeePaise: DEFAULT_PLATFORM_FEE_PAISE,
      gstRatePercent: DEFAULT_GST_RATE_PERCENT,
      commissionTiers: DEFAULT_COMMISSION_TIERS,
      updatedAt: Date.now(),
    };
    if (settings) {
      await ctx.db.patch(settings._id, data);
      return "Updated platformSettings with v2 commission-based defaults.";
    } else {
      await ctx.db.insert("platformSettings", data);
      return "Created platformSettings with v2 commission-based defaults.";
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

/** @deprecated Use updatePlatformConfig instead */
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

    return { success: true, updatedProductsCount: 0 };
  },
});

/** @deprecated Use updatePlatformConfig instead */
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

    return { success: true, updatedProductsCount: 0 };
  }
});

/**
 * Recalculates and synchronizes all existing products to the all-inclusive upfront pricing system.
 * Sets storefront price = Base Price + Handling Fee + Platform Fee + GST.
 */
export const recalculateAllProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const config = await fetchPlatformConfig(ctx);

    const products = await ctx.db.query("products").collect();
    let updatedCount = 0;
    const now = Date.now();


    // Preload all boutiques to resolve pricing tiers in O(1)
    const boutiques = await ctx.db.query("boutiques").collect();
    const boutiqueTierMap = new Map<string, string>();
    for (const b of boutiques) {
      boutiqueTierMap.set(b._id, (b as any).pricingTier || "bronze");
    }

    for (const product of products) {
      let basePrice = product.basePrice ?? product.price;
      let baseDiscountPrice = product.baseDiscountPrice ?? product.discountPrice;

      if (!basePrice || basePrice <= 0) {
        basePrice = product.price;
        baseDiscountPrice = product.discountPrice;
      }

      // Sanitize basePrice to clean integer paise (e.g. 90000 paise for ₹900)
      if (basePrice % 100 !== 0) {
        if (Math.abs((basePrice - 57.82) % 100) < 1) {
          basePrice = Math.round(basePrice - 57.82);
        } else {
          basePrice = Math.round(basePrice / 100) * 100;
        }
      }
      if (baseDiscountPrice && baseDiscountPrice % 100 !== 0) {
        if (Math.abs((baseDiscountPrice - 57.82) % 100) < 1) {
          baseDiscountPrice = Math.round(baseDiscountPrice - 57.82);
        } else {
          baseDiscountPrice = Math.round(baseDiscountPrice / 100) * 100;
        }
      }

      const tierKey = boutiqueTierMap.get(product.boutiqueId) || "bronze";
      const targetPrice = calculateAllInclusivePricePaise(basePrice, tierKey, config);
      const targetDiscountPrice = baseDiscountPrice ? calculateAllInclusivePricePaise(baseDiscountPrice, tierKey, config) : undefined;

      const needsUpdate =
        product.price !== targetPrice ||
        product.discountPrice !== targetDiscountPrice ||
        product.basePrice !== basePrice;

      if (needsUpdate) {
        await ctx.db.patch(product._id, {
          basePrice,
          baseDiscountPrice,
          price: targetPrice,
          discountPrice: targetDiscountPrice,
          updatedAt: now,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      totalProducts: products.length,
      message: `Successfully synchronized ${updatedCount} of ${products.length} products to all-inclusive upfront pricing.`,
    };
  },
});

export const recalculateAllProductPricesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const config = await fetchPlatformConfig(ctx);

    const products = await ctx.db.query("products").collect();
    let updatedCount = 0;
    const now = Date.now();

    // Preload all boutiques to resolve pricing tiers in O(1)
    const boutiques = await ctx.db.query("boutiques").collect();
    const boutiqueTierMap = new Map<string, string>();
    for (const b of boutiques) {
      boutiqueTierMap.set(b._id, (b as any).pricingTier || "bronze");
    }

    for (const product of products) {
      let basePrice = product.basePrice ?? product.price;
      let baseDiscountPrice = product.baseDiscountPrice ?? product.discountPrice;

      if (!basePrice || basePrice <= 0) {
        basePrice = product.price;
        baseDiscountPrice = product.discountPrice;
      }

      // Sanitize basePrice to clean integer paise (e.g. 90000 paise for ₹900)
      if (basePrice % 100 !== 0) {
        if (Math.abs((basePrice - 57.82) % 100) < 1) {
          basePrice = Math.round(basePrice - 57.82);
        } else {
          basePrice = Math.round(basePrice / 100) * 100;
        }
      }
      if (baseDiscountPrice && baseDiscountPrice % 100 !== 0) {
        if (Math.abs((baseDiscountPrice - 57.82) % 100) < 1) {
          baseDiscountPrice = Math.round(baseDiscountPrice - 57.82);
        } else {
          baseDiscountPrice = Math.round(baseDiscountPrice / 100) * 100;
        }
      }

      const tierKey = boutiqueTierMap.get(product.boutiqueId) || "bronze";
      const targetPrice = calculateAllInclusivePricePaise(basePrice, tierKey, config);
      const targetDiscountPrice = baseDiscountPrice ? calculateAllInclusivePricePaise(baseDiscountPrice, tierKey, config) : undefined;

      const needsUpdate =
        product.price !== targetPrice ||
        product.discountPrice !== targetDiscountPrice ||
        product.basePrice !== basePrice;

      if (needsUpdate) {
        await ctx.db.patch(product._id, {
          basePrice,
          baseDiscountPrice,
          price: targetPrice,
          discountPrice: targetDiscountPrice,
          updatedAt: now,
        });
        updatedCount++;
      }
    }


    return {
      success: true,
      updatedCount,
      totalProducts: products.length,
      message: `Successfully synchronized ${updatedCount} of ${products.length} products to all-inclusive upfront pricing.`,
    };
  },
});




