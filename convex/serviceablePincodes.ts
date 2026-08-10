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

/**
 * Seed all primary Greater Kochi delivery pincodes into the database.
 * Admin-only mutation.
 */
export const seedKochiPincodes = mutation({
  args: {},
  handler: async (ctx) => {
    // If running in user context, verify admin role
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      await requireRole(ctx, "admin");
    }

    const kochiPincodes = [
      // Central & City (KOCHI_CORE)
      { pincode: "682011", city: "Ernakulam High Court", state: "Kerala", lat: 9.9816, lng: 76.2778, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682016", city: "Kaloor", state: "Kerala", lat: 9.9932, lng: 76.2952, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682017", city: "Kaloor North", state: "Kerala", lat: 9.9816, lng: 76.2999, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682018", city: "Ernakulam South", state: "Kerala", lat: 9.9680, lng: 76.2890, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682020", city: "Kadavanthra", state: "Kerala", lat: 9.9660, lng: 76.2990, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682025", city: "Palarivattom", state: "Kerala", lat: 10.0056, lng: 76.3075, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682035", city: "Ernakulam College", state: "Kerala", lat: 9.9750, lng: 76.2820, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682036", city: "Panampilly Nagar", state: "Kerala", lat: 9.9592, lng: 76.2928, zoneCode: "KOCHI_CORE", active: true },

      // North & IT Corridor
      { pincode: "682021", city: "Elamakkara", state: "Kerala", lat: 10.0190, lng: 76.2920, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682024", city: "Edappally", state: "Kerala", lat: 10.0261, lng: 76.3088, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682030", city: "Kakkanad Infopark", state: "Kerala", lat: 10.0159, lng: 76.3419, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "682037", city: "Vennala", state: "Kerala", lat: 9.9980, lng: 76.3210, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682039", city: "Chittur", state: "Kerala", lat: 10.0380, lng: 76.2790, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "682041", city: "Edappally North", state: "Kerala", lat: 10.0350, lng: 76.3120, zoneCode: "KOCHI_CORE", active: true },
      { pincode: "682042", city: "Kakkanad West", state: "Kerala", lat: 10.0080, lng: 76.3310, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "683104", city: "Kalamassery", state: "Kerala", lat: 10.0520, lng: 76.3240, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "683501", city: "Thrikkakara", state: "Kerala", lat: 10.0390, lng: 76.3310, zoneCode: "KOCHI_EXTENDED", active: true },

      // South & Suburbs
      { pincode: "682301", city: "Tripunithura", state: "Kerala", lat: 9.9489, lng: 76.3431, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "682304", city: "Maradu", state: "Kerala", lat: 9.9480, lng: 76.3210, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "682307", city: "Kundannoor", state: "Kerala", lat: 9.9320, lng: 76.3150, zoneCode: "KOCHI_EXTENDED", active: true },
      { pincode: "682038", city: "Kaloor Stadium / Thammanam", state: "Kerala", lat: 9.9910, lng: 76.3120, zoneCode: "KOCHI_CORE", active: true },
    ];

    let inserted = 0;
    let updated = 0;

    for (const item of kochiPincodes) {
      const existing = await ctx.db
        .query("serviceablePincodes")
        .withIndex("by_pincode", (q) => q.eq("pincode", item.pincode))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          city: item.city,
          state: item.state,
          lat: item.lat,
          lng: item.lng,
          zoneCode: item.zoneCode,
          active: true,
        });
        updated++;
      } else {
        await ctx.db.insert("serviceablePincodes", item);
        inserted++;
      }
    }

    return { success: true, inserted, updated, total: kochiPincodes.length };
  },
});

