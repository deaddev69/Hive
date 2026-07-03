// convex/routing.ts
// Hyperlocal routing calculation, OSRM fetching, 3-decimal caching (111m precision), 
// tiered launch delivery pricing, and dynamic cart-value subsidies.

import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { calculateDeliveryFeeRupees, estimateCourierCostRupees } from "./lib/deliveryPricing";

/**
 * Standard Haversine distance formula.
 */
function calculateHaversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch a single cached distance record if it is valid (expiresAt > now).
 */
export const getCachedDistanceRecord = internalQuery({
  args: {
    startLat: v.number(),
    startLng: v.number(),
    endLat:   v.number(),
    endLng:   v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db
      .query("cachedRoadDistances")
      .withIndex("by_start_end", (q) =>
        q.eq("startLat", args.startLat)
         .eq("startLng", args.startLng)
         .eq("endLat",   args.endLat)
         .eq("endLng",   args.endLng)
      )
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .first();
  },
});

/**
 * Write or update a road distance record in the cache table with a 7-day TTL.
 */
export const cacheDistance = internalMutation({
  args: {
    startLat:    v.number(),
    startLng:    v.number(),
    endLat:      v.number(),
    endLng:      v.number(),
    distanceKm:  v.number(),
    durationMin: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 3600 * 1000; // 7 days TTL

    const existing = await ctx.db
      .query("cachedRoadDistances")
      .withIndex("by_start_end", (q) =>
        q.eq("startLat", args.startLat)
         .eq("startLng", args.startLng)
         .eq("endLat",   args.endLat)
         .eq("endLng",   args.endLng)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        distanceKm:  args.distanceKm,
        durationMin: args.durationMin,
        createdAt:   now,
        expiresAt,
      });
    } else {
      await ctx.db.insert("cachedRoadDistances", {
        startLat:    args.startLat,
        startLng:    args.startLng,
        endLat:      args.endLat,
        endLng:      args.endLng,
        distanceKm:  args.distanceKm,
        durationMin: args.durationMin,
        createdAt:   now,
        expiresAt,
      });
    }
  },
});

/**
 * Convex Action to resolve road distance and duration via OSRM for top 20 candidate boutiques.
 * Throttles live OSRM calls to visible range.
 */
export const resolveRoadDistancesAction = action({
  args: {
    userLat: v.number(),
    userLng: v.number(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    // 1. Fetch approved boutiques
    const boutiques = await ctx.runQuery(api.boutiques.getApprovedBoutiques);
    if (!boutiques || boutiques.length === 0) return [];

    // 2. Calculate Haversine distance, filter to serviceable threshold, and sort
    const candidates = boutiques
      .map((b: any) => {
        const bLat = b.latitude ?? b.addressDetails?.lat;
        const bLng = b.longitude ?? b.addressDetails?.lng;
        if (bLat === undefined || bLng === undefined) return null;
        
        const haversineDist = calculateHaversineDistanceKm(args.userLat, args.userLng, bLat, bLng);
        return { boutique: b, haversineDist, bLat, bLng };
      })
      .filter(Boolean) as Array<{ boutique: any; haversineDist: number; bLat: number; bLng: number }>;

    // Sort by straight-line distance, limit routing calls to top 20 candidates
    candidates.sort((a, b) => a.haversineDist - b.haversineDist);
    const top20 = candidates.slice(0, 20);

    // Round coordinates to 3 decimals (approx. 111m grid precision)
    const startLat = Math.round(args.userLat * 1000) / 1000;
    const startLng = Math.round(args.userLng * 1000) / 1000;

    const results = [];

    for (const cand of top20) {
      const endLat = cand.bLat;
      const endLng = cand.bLng;

      // Check cache first
      const cached: any = await ctx.runQuery(internal.routing.getCachedDistanceRecord as any, {
        startLat,
        startLng,
        endLat,
        endLng,
      });

      if (cached) {
        results.push({
          boutiqueId:  cand.boutique._id,
          distanceKm:  cached.distanceKm,
          durationMin: cached.durationMin,
          source:      "cache",
        });
      } else {
        // Cache miss: Call public OSRM router
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`OSRM endpoint returned error status ${res.status}`);
          }
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceKm = route.distance / 1000;
            const durationMin = route.duration / 60;

            await ctx.runMutation(internal.routing.cacheDistance as any, {
              startLat,
              startLng,
              endLat,
              endLng,
              distanceKm,
              durationMin,
            });

            results.push({
              boutiqueId:  cand.boutique._id,
              distanceKm,
              durationMin,
              source:      "osrm",
            });
          } else {
            throw new Error("No routes found in OSRM payload response.");
          }
        } catch (err) {
          console.error(`[OSRM routing error] for boutique ${cand.boutique.boutiqueName}:`, err);
          // Graceful fallback to Haversine
          const distanceKm = cand.haversineDist;
          const durationMin = (distanceKm / 25) * 60; // 25 km/h driving speed approximation

          results.push({
            boutiqueId:  cand.boutique._id,
            distanceKm,
            durationMin,
            source:      "fallback_haversine",
          });
        }
      }
    }

    return results;
  },
});

/**
 * Shared logic helper to calculate the delivery quote.
 */
export async function calculateDeliveryQuote(
  db: any,
  args: {
    userLat:    number;
    userLng:    number;
    boutiqueId: any;
    subtotal:   number;
  }
) {
  const boutique = await db.get(args.boutiqueId);
  if (!boutique) {
    return { serviceable: false, reason: "Boutique not found" };
  }

  const boutiqueLat = boutique.latitude;
  const boutiqueLng = boutique.longitude;

  const startLat = Math.round(args.userLat * 1000) / 1000;
  const startLng = Math.round(args.userLng * 1000) / 1000;

  // Retrieve cached road distance
  const cached = await db
    .query("cachedRoadDistances")
    .withIndex("by_start_end", (q: any) =>
      q.eq("startLat", startLat)
       .eq("startLng", startLng)
       .eq("endLat",   boutiqueLat)
       .eq("endLng",   boutiqueLng)
    )
    .filter((q: any) => q.gt(q.field("expiresAt"), Date.now()))
    .first();

  let distanceKm = 0;
  let durationMin = 0;
  let isCached = false;

  if (cached) {
    distanceKm = cached.distanceKm;
    durationMin = cached.durationMin;
    isCached = true;
  } else {
    // Fallback to Haversine distance
    distanceKm = calculateHaversineDistanceKm(args.userLat, args.userLng, boutiqueLat, boutiqueLng);
    durationMin = (distanceKm / 25) * 60;
  }

  // Effective Serviceability constraint: boutique.deliveryRadiusKm
  const effectiveRadius = boutique.deliveryRadiusKm ?? 15;
  const serviceable = distanceKm <= effectiveRadius;

  if (!serviceable) {
    return {
      serviceable: false,
      reason: `Delivery address is outside the serviceable radius (${effectiveRadius} km) for this boutique.`,
      distanceKm,
      durationMin,
    };
  }

  // Delivery pricing via dynamic boutique freeDeliveryThreshold
  const subtotalRupees = args.subtotal / 100;
  
  let standardFee = 99;
  if (distanceKm <= 3) {
    standardFee = 39;
  } else if (distanceKm <= 6) {
    standardFee = 59;
  } else if (distanceKm <= 10) {
    standardFee = 79;
  }

  const thresholdRupees = boutique.freeDeliveryThreshold ?? 2500;
  let finalFeeRupees = standardFee;
  if (subtotalRupees >= thresholdRupees) {
    finalFeeRupees = 0;
  } else if (subtotalRupees >= thresholdRupees * 0.6) {
    finalFeeRupees = standardFee / 2;
  }

  const estimatedCourierCostRupees = estimateCourierCostRupees(distanceKm);

  const customerPaidFeePaise = Math.round(finalFeeRupees * 100);
  const estimatedCourierCostPaise = Math.round(estimatedCourierCostRupees * 100);

  return {
    serviceable: true,
    distanceKm,
    durationMin,
    etaMinutes: Math.round(durationMin + (boutique.averagePrepTime ?? 30)),
    customerPaidFee: customerPaidFeePaise,
    estimatedPorterCost: estimatedCourierCostPaise, // DEPRECATED fallback
    estimatedCourierCost: estimatedCourierCostPaise,
    isCached,
  };
}

export const getDeliveryQuote = query({
  args: {
    userLat:    v.number(),
    userLng:    v.number(),
    boutiqueId: v.id("boutiques"),
    subtotal:   v.number(), // in paise
  },
  handler: async (ctx, args) => {
    return await calculateDeliveryQuote(ctx.db, args);
  },
});
