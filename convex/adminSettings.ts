import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

export const getPlatformSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("platformSettings").first();
    if (!settings) {
      // Return defaults if not initialized in DB yet
      return { markupRate: 0.15, platformFeeRate: 0.02 };
    }
    return settings;
  },
});

export const updatePlatformSettings = mutation({
  args: {
    markupRate: v.number(),
    platformFeeRate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const settings = await ctx.db.query("platformSettings").first();
    
    if (settings) {
      // In a later phase, if markupRate changes, we should trigger a background task 
      // to re-calculate all product prices.
      await ctx.db.patch(settings._id, {
        markupRate: args.markupRate,
        platformFeeRate: args.platformFeeRate,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platformSettings", {
        markupRate: args.markupRate,
        platformFeeRate: args.platformFeeRate,
        updatedAt: Date.now(),
      });
    }
  },
});
