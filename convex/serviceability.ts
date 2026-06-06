// convex/serviceability.ts
// Handles serviceability checks, demand generation, and active zones management.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed default active service zones.
 * Kochi, Kakkanad, Aluva, Thrippunithura, Edappally, and Hyderabad.
 */
export const seedServiceZones = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultZones = [
      { city: "Kochi", state: "Kerala" },
      { city: "Kakkanad", state: "Kerala" },
      { city: "Kalamassery", state: "Kerala" },
      { city: "Aluva", state: "Kerala" },
      { city: "Thrippunithura", state: "Kerala" },
      { city: "Edappally", state: "Kerala" },
      { city: "Hyderabad", state: "Telangana" },
    ];

    const now = Date.now();
    let seededCount = 0;

    for (const zone of defaultZones) {
      const existing = await ctx.db
        .query("serviceZones")
        .withIndex("by_city", (q) => q.eq("city", zone.city))
        .first();

      if (!existing) {
        await ctx.db.insert("serviceZones", {
          city: zone.city,
          state: zone.state,
          isActive: true,
          createdAt: now,
        });
        seededCount++;
      }
    }

    return { seededCount };
  },
});

/**
 * Check if a given city is serviceable (case-insensitive).
 */
export const checkServiceability = query({
  args: { city: v.string() },
  handler: async (ctx, args) => {
    const searchCity = args.city.trim().toLowerCase();

    // Fetch active service zones and match in JS for case-insensitivity
    const activeZones = await ctx.db
      .query("serviceZones")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const matched = activeZones.find(
      (z) => z.city.trim().toLowerCase() === searchCity
    );

    return {
      isServiceable: !!matched,
      city: matched?.city || args.city,
      state: matched?.state || "",
    };
  },
});

/**
 * Create a new service request demand record.
 * Prevents duplicate user+city requests.
 */
export const requestService = mutation({
  args: {
    city: v.string(),
    state: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || undefined; // Use Clerk subject ID if logged in
    const city = args.city.trim();
    const state = args.state.trim();

    if (userId) {
      // Find any requests by this user for the same city
      const userRequests = await ctx.db
        .query("serviceRequests")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      const hasDuplicate = userRequests.some(
        (r) => r.city.trim().toLowerCase() === city.toLowerCase()
      );

      if (hasDuplicate) {
        return { success: false, reason: "Already requested" };
      }
    } else {
      // Guest duplicate check: check if there's already an anonymous request for this city & state
      const guestRequests = await ctx.db
        .query("serviceRequests")
        .withIndex("by_city_state", (q) => q.eq("city", city).eq("state", state))
        .collect();

      const hasDuplicate = guestRequests.some((r) => r.userId === undefined);

      if (hasDuplicate) {
        return { success: false, reason: "Already requested" };
      }
    }

    await ctx.db.insert("serviceRequests", {
      userId,
      city,
      state,
      latitude: args.latitude,
      longitude: args.longitude,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Fetch all service requests sorted by creation date (newest first).
 */
export const getServiceRequests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("serviceRequests")
      .order("desc")
      .collect();
  },
});

/**
 * Fetch all active service zones.
 */
export const getActiveZones = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("serviceZones")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});
