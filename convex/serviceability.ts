// convex/serviceability.ts
// Handles serviceability checks, demand generation, and active zones management.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { haversineKm, isWithinDeliveryRadius } from "./lib/serviceability";
import { requireRole } from "./lib/auth";



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
    await requireRole(ctx, "admin");
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
 * Whether any approved boutique can actually deliver to these coordinates.
 *
 * This used to fall back to matching the caller's `city` string against active serviceZones rows
 * whenever no boutique was in range. That fallback only ever fired when the geometry had already
 * said no, so every result it produced was a claim that Hive serves someone no boutique can
 * reach — which is how a Hyderabad row once reported a shopper as serviceable 848 km from the
 * nearest boutique, and how Aluva still reports serviceable today with no boutique able to reach
 * it and no pincode backing.
 *
 * Deliberately NOT replaced with resolveDiscoveryContext. That answers a different question —
 * which service area a shopper is in — and substituting it here would rebuild the same defect in
 * better clothing: measured against current data there is ~3 km2 that sits within 3 km of a
 * pincode yet outside every boutique's delivery radius, and ~159 km2 that is genuinely
 * deliverable but nowhere near a pincode centroid. Discovery identity and delivery capability are
 * separate questions and this one is answered by boutique geometry alone.
 *
 * `city` is retained as an argument so the deployed client keeps working, but it cannot influence
 * the result and is no longer echoed back as though this query had verified it. Every other
 * serviceability consumer — LocationContext, orders, payments, reservations — already decided on
 * geometry alone, so this removes the last disagreement rather than introducing a new definition.
 */
export const checkServiceability = query({
  args: {
    // DEPRECATED AND UNUSED. See above: retained only for client compatibility.
    city: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Fail closed without usable coordinates: there is nothing to measure against, and the old
    // behaviour of falling through to a city-string match is exactly what is being removed.
    if (args.lat === undefined || args.lng === undefined || (args.lat === 0 && args.lng === 0)) {
      return {
        isServiceable: false,
        city: null,
        state: "",
        reason: "NO_COORDINATES",
      };
    }

    {
      const approvedBoutiques = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .collect();

      // Delegates to the same helper the order gate uses, rather than re-implementing the check.
      //
      // This previously compared RAW straight-line distance against a 15km default, while
      // convex/lib/serviceability.ts — which decides whether an order or reservation is actually
      // allowed — compares an estimated ROAD distance (haversine x 1.5) against a 13km default.
      // The drawer was therefore roughly 1.7x more permissive than the gate behind it, so a
      // shopper could be told "we deliver to you" here and then be refused at checkout. Measured
      // against the current 11 approved boutiques, the two models differ over about half the
      // area the drawer was calling serviceable.
      //
      // Sharing the function rather than copying its constants also picks up the addressDetails
      // coordinate fallback, which the inline version did not have: a boutique whose coordinates
      // live only on addressDetails was silently treated as unreachable here.
      const nearbyBoutiques = approvedBoutiques.filter((b) =>
        isWithinDeliveryRadius(args.lat, args.lng, b as any)
      );

      // At least one boutique can fulfil to these coordinates.
      if (nearbyBoutiques.length > 0) {
        return {
          isServiceable: true,
          // Not echoing the caller's city back: this query verified delivery geometry, not the
          // name the client attached to it, and returning it looked like confirmation.
          city: null,
          state: "",
          reason: "BOUTIQUE_IN_RANGE",
        };
      }
    }

    // No boutique in range. That is the answer — there is no second opinion to consult.
    return {
      isServiceable: false,
      city: null,
      state: "",
      reason: "OUT_OF_RANGE",
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
    await requireRole(ctx, "admin");
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
