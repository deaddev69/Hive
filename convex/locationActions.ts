import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Coarse pre-filter helper to eliminate out-of-range boutiques before hitting Google's billing
function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getActiveBoutiquesForRouting = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();
  },
});

export const bulkWriteDistanceCache = internalMutation({
  args: {
    payloads: v.array(
      v.object({
        startLat: v.number(),
        startLng: v.number(),
        endLat: v.number(),
        endLng: v.number(),
        distanceKm: v.number(),
        durationMin: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 3600 * 1000; // 7 days TTL
    
    for (const item of args.payloads) {
      const existing = await ctx.db
        .query("cachedRoadDistances")
        .withIndex("by_start_end", (q) => 
          q.eq("startLat", item.startLat)
           .eq("startLng", item.startLng)
           .eq("endLat", item.endLat)
           .eq("endLng", item.endLng)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          distanceKm: item.distanceKm,
          durationMin: item.durationMin,
          createdAt: now,
          expiresAt: expiresAt,
        });
      } else {
        await ctx.db.insert("cachedRoadDistances", {
          startLat: item.startLat,
          startLng: item.startLng,
          endLat: item.endLat,
          endLng: item.endLng,
          distanceKm: item.distanceKm,
          durationMin: item.durationMin,
          createdAt: now,
          expiresAt: expiresAt,
        });
      }
    }
  },
});

export const primeRoadDistanceCache = action({
  args: {
    userLat: v.number(),
    userLng: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    if (!apiKey) {
      console.error("Missing GOOGLE_MAPS_API_KEY environment variable.");
      return;
    }

    // 1. Fetch active boutiques across the system
    const boutiques = await ctx.runQuery(internal.locationActions.getActiveBoutiquesForRouting);
    if (boutiques.length === 0) return;

    // 2. Coarse 30km Haversine pre-filter to drop obviously out-of-range targets
    const MAX_COARSE_RADIUS_KM = 30;
    const filteredBoutiques = boutiques.filter((b: any) => {
      const birdEyeDistance = calculateHaversine(args.userLat, args.userLng, b.latitude, b.longitude);
      return birdEyeDistance <= MAX_COARSE_RADIUS_KM;
    });

    if (filteredBoutiques.length === 0) return;

    // 3. Chunk destinations into groups of 25 to respect Google Matrix API hard limits
    const GOOGLE_MAX_CHUNKS = 25;
    const origin = `${args.userLat},${args.userLng}`;
    const writePayloads: any[] = [];

    // Format startLat/Lng to 3 decimal places to perfectly match customerHome.ts lookups
    const startLat = Math.round(args.userLat * 1000) / 1000;
    const startLng = Math.round(args.userLng * 1000) / 1000;

    for (let i = 0; i < filteredBoutiques.length; i += GOOGLE_MAX_CHUNKS) {
      const chunk = filteredBoutiques.slice(i, i + GOOGLE_MAX_CHUNKS);
      const destinations = chunk.map((b: any) => `${b.latitude},${b.longitude}`).join("|");

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destinations}&key=${apiKey}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "OK") {
          console.error(`Google Distance Matrix API returned root status: ${data.status}`);
          continue;
        }

        const elements = data.rows[0].elements;

        chunk.forEach((boutique: any, idx: number) => {
          const element = elements[idx];
          if (!element || element.status !== "OK") return;

          writePayloads.push({
            startLat: startLat,
            startLng: startLng,
            endLat: boutique.latitude,
            endLng: boutique.longitude,
            distanceKm: element.distance.value / 1000,   // meters to kilometers
            durationMin: Math.round(element.duration.value / 60), // seconds to minutes
          });
        });
      } catch (error) {
        console.error("Failed fetching routing matrix chunk from Google:", error);
      }
    }

    // 4. Fire transactional batch write to Convex
    if (writePayloads.length > 0) {
      await ctx.runMutation(internal.locationActions.bulkWriteDistanceCache, {
        payloads: writePayloads,
      });
    }
  },
});
