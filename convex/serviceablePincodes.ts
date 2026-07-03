// convex/serviceablePincodes.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Retrieve serviceable pincode coordinates and zone details.
 */
export const getByPincode = query({
  args: { pincode: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("serviceablePincodes")
      .withIndex("by_pincode", (q) => q.eq("pincode", args.pincode))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    if (!record) return null;

    // Fetch associated delivery zone details
    const zone = await ctx.db
      .query("deliveryZones")
      .withIndex("by_code", (q) => q.eq("code", record.zoneCode))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    return {
      ...record,
      zoneDetails: zone || null,
    };
  },
});
