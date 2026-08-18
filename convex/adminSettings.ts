import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import {
  PlatformConfig,
  DEFAULT_COMMISSION_TIERS,
  DEFAULT_HANDLING_CHARGE_PAISE,
  DEFAULT_PLATFORM_FEE_PAISE,
  DEFAULT_GST_RATE_PERCENT,
  // Legacy exports for backward compat
  calculateProductPricing,
  PlatformSettings,
  DEFAULT_TIER_SLABS,
  getPlatformSettings as fetchPlatformSettings,
} from "./pricingService";

// ─── v2: Commission-Based Platform Config ────────────────────────────────────

export const getPlatformConfig = query({
  args: {},
  handler: async (ctx) => {
    const settings = (await ctx.db.query("platformSettings").first()) as any;
    return {
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

const commissionTierValidator = v.object({
  key: v.string(),
  name: v.string(),
  sellerCommissionPercent: v.number(),
});

export const updatePlatformConfig = mutation({
  args: {
    handlingChargePaise: v.number(),
    platformFeePaise: v.number(),
    gstRatePercent: v.number(),
    commissionTiers: v.array(commissionTierValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Validate inputs
    if (args.handlingChargePaise < 0) throw new Error("Handling charge cannot be negative");
    if (args.platformFeePaise < 0) throw new Error("Platform fee cannot be negative");
    if (args.gstRatePercent < 0 || args.gstRatePercent > 100) throw new Error("GST rate must be between 0 and 100");
    if (args.commissionTiers.length === 0) throw new Error("At least one commission tier is required");
    for (const tier of args.commissionTiers) {
      if (tier.sellerCommissionPercent < 0 || tier.sellerCommissionPercent > 100) {
        throw new Error(`Commission for ${tier.name} must be between 0% and 100%`);
      }
    }

    const settings = await ctx.db.query("platformSettings").first();
    const patchData: any = {
      handlingChargePaise: args.handlingChargePaise,
      platformFeePaise: args.platformFeePaise,
      gstRatePercent: args.gstRatePercent,
      commissionTiers: args.commissionTiers,
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

/** @deprecated No longer needed — product price = seller base price */
export const recalculateAllProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return { success: true, updatedProductsCount: 0 };
  },
});
