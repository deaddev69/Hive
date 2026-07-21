// convex/serviceability.ts
// Handles serviceability checks, demand generation, and active zones management.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { haversineKm } from "./lib/serviceability";



/**
 * Fetch all approved boutiques that deliver to the user's location.
 */
export const getDeliverableBoutiques = query({
  args: { userLat: v.number(), userLng: v.number() },
  handler: async (ctx, args) => {
    const boutiques = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

    return boutiques.filter((b) => {
      const dist = haversineKm(args.userLat, args.userLng, b.latitude, b.longitude);
      return dist <= b.deliveryRadiusKm;
    });
  },
});

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
      { city: "Ernakulam", state: "Kerala" },
      { city: "Maradu", state: "Kerala" },
      { city: "Nettoor", state: "Kerala" },
      { city: "Cheranallur", state: "Kerala" },
      { city: "Chittoor", state: "Kerala" },
      { city: "Kaloor", state: "Kerala" },
      { city: "Panampilly Nagar", state: "Kerala" },
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
  args: {
    city: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. PRIMARY CHECK: If GPS coordinates are provided, evaluate Haversine distance
    if (args.lat !== undefined && args.lng !== undefined && args.lat !== 0 && args.lng !== 0) {
      const approvedBoutiques = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .collect();

      const nearbyBoutiques = approvedBoutiques.filter((b) => {
        const distance = haversineKm(args.lat!, args.lng!, b.latitude, b.longitude);
        const maxRadius = b.deliveryRadiusKm ?? 15;
        return distance <= maxRadius;
      });

      // If at least 1 boutique can fulfill to these coordinates, pass immediately
      if (nearbyBoutiques.length > 0) {
        return {
          isServiceable: true,
          city: args.city,
          state: "",
          reason: "BOUTIQUE_IN_RANGE",
        };
      }
    }

    // 2. SECONDARY FALLBACK: Check macro serviceZones string match
    const searchCity = args.city.trim().toLowerCase();
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
      reason: matched ? "ZONE_ACTIVE" : "OUT_OF_RANGE",
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
