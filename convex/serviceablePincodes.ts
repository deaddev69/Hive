// convex/serviceablePincodes.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

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

/**
 * List all pincodes for Admin management.
 */
export const listAllPincodes = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.db.query("serviceablePincodes").collect();
  },
});

/**
 * Block a pincode from receiving deliveries.
 * Admin-only mutation.
 */
export const blockPincode = mutation({
  args: { pincode: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const record = await ctx.db
      .query("serviceablePincodes")
      .withIndex("by_pincode", (q) => q.eq("pincode", args.pincode))
      .first();

    if (record) {
      await ctx.db.patch(record._id, { active: false });
      return { success: true, pincode: args.pincode, active: false };
    } else {
      // Create a blocked pincode entry if it doesn't exist
      const id = await ctx.db.insert("serviceablePincodes", {
        pincode: args.pincode,
        city: "Unknown",
        state: "Unknown",
        lat: 0,
        lng: 0,
        active: false,
        zoneCode: "BLOCKED",
      });
      return { success: true, id, pincode: args.pincode, active: false };
    }
  },
});

/**
 * Unblock a pincode for delivery.
 * Admin-only mutation.
 */
export const unblockPincode = mutation({
  args: { pincode: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const record = await ctx.db
      .query("serviceablePincodes")
      .withIndex("by_pincode", (q) => q.eq("pincode", args.pincode))
      .first();

    if (!record) {
      throw new Error(`Pincode ${args.pincode} not found in database.`);
    }

    await ctx.db.patch(record._id, { active: true });
    return { success: true, pincode: args.pincode, active: true };
  },
});

/**
 * Toggle pincode serviceability active status.
 * Admin-only mutation.
 */
export const togglePincodeActive = mutation({
  args: {
    id: v.id("serviceablePincodes"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.id, { active: args.active });
    return { success: true, id: args.id, active: args.active };
  },
});

/**
 * Add a new serviceable pincode.
 * Admin-only mutation.
 */
export const addPincode = mutation({
  args: {
    pincode: v.string(),
    city: v.string(),
    state: v.string(),
    lat: v.number(),
    lng: v.number(),
    zoneCode: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Check for duplicate
    const existing = await ctx.db
      .query("serviceablePincodes")
      .withIndex("by_pincode", (q) => q.eq("pincode", args.pincode))
      .first();

    if (existing) {
      throw new Error(`Pincode ${args.pincode} already exists.`);
    }

    const id = await ctx.db.insert("serviceablePincodes", {
      pincode: args.pincode,
      city: args.city,
      state: args.state,
      lat: args.lat,
      lng: args.lng,
      zoneCode: args.zoneCode,
      active: args.active,
    });
    return { success: true, id, pincode: args.pincode };
  },
});

/**
 * Delete a pincode record entirely.
 * Admin-only mutation.
 */
export const deletePincode = mutation({
  args: { id: v.id("serviceablePincodes") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

