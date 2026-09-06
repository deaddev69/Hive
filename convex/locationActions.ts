import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { haversineKm } from "./lib/serviceability";
import { checkRateLimit } from "./lib/rateLimit";


/** Rows deleted per sweep invocation. Keeps each transaction small and predictable. */
export const ROAD_DISTANCE_SWEEP_BATCH = 500;

/** Guards the self-rescheduling drain so a large backlog cannot loop indefinitely. */
export const ROAD_DISTANCE_SWEEP_MAX_PASSES = 20;

/** Pure so the expiry decision is testable without the Convex runtime. */
export function isRoadDistanceExpired(expiresAt: number, now: number): boolean {
  return expiresAt <= now;
}

/**
 * Deletes expired road-distance rows.
 *
 * cachedRoadDistances has carried an expiresAt field and a by_expiresAt index since it was
 * created, and writes set a 7-day TTL — but nothing ever swept it, so "expired" rows simply
 * accumulated forever. Reads already ignore staleness by overwriting on the next prime, so this
 * is purely about storage. Same shape as rateLimitMaintenance: an indexed range read so cost
 * tracks what is deleted rather than table size, a bounded batch, and a self-rescheduling drain
 * rather than one oversized transaction.
 */
export const cleanupExpiredRoadDistances = internalMutation({
  args: { pass: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const pass = args.pass ?? 1;
    const now = Date.now();

    const expired = await ctx.db
      .query("cachedRoadDistances")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .take(ROAD_DISTANCE_SWEEP_BATCH);

    for (const row of expired) {
      await ctx.db.delete(row._id);
    }

    const drainedFullBatch = expired.length === ROAD_DISTANCE_SWEEP_BATCH;
    const shouldContinue = drainedFullBatch && pass < ROAD_DISTANCE_SWEEP_MAX_PASSES;
    if (shouldContinue) {
      await ctx.scheduler.runAfter(5000, internal.locationActions.cleanupExpiredRoadDistances, {
        pass: pass + 1,
      });
    }

    return { deleted: expired.length, pass, scheduledAnotherPass: shouldContinue };
  },
});

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

/**
 * Which of these boutiques still need a road-distance measurement for this origin.
 *
 * Priming used to call Google unconditionally, so every repeat of the same coordinate bought the
 * same answer again — an unauthenticated caller could spend Distance Matrix quota just by calling
 * repeatedly, without even varying the coordinate, and ordinary shoppers re-primed on every
 * location confirm. Pure so the decision is testable without the database or the network.
 */
export function selectUncachedDestinations(
  boutiques: Array<{ latitude: number; longitude: number }>,
  cached: Array<{ endLat: number; endLng: number; expiresAt: number }>,
  now: number
): Array<{ latitude: number; longitude: number }> {
  const fresh = new Set(
    cached
      .filter((c) => c.expiresAt > now)
      .map((c) => `${c.endLat.toFixed(6)},${c.endLng.toFixed(6)}`)
  );
  return boutiques.filter((b) => !fresh.has(`${b.latitude.toFixed(6)},${b.longitude.toFixed(6)}`));
}

export const getFreshCachedDistancesForOrigin = internalQuery({
  args: { startLat: v.number(), startLng: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cachedRoadDistances")
      .withIndex("by_start_end", (q) =>
        q.eq("startLat", args.startLat).eq("startLng", args.startLng)
      )
      .collect();
  },
});

/**
 * Platform-wide ceiling on outbound Distance Matrix requests.
 *
 * This endpoint is public and unauthenticated by necessity — setting a delivery location does not
 * require an account — so it cannot be keyed on identity, and an anonymous session id would be
 * rotatable anyway. A single global budget is acceptable here specifically because exhausting it
 * is harmless: priming is opportunistic, and OperationsService already falls back to
 * estimatedRoadKm(haversineKm(...)) whenever a pair is not cached. Exceeding the budget therefore
 * degrades accuracy slightly rather than blocking anyone, which is why a shared bucket is safe
 * here and would not be for search.
 */
const GOOGLE_MATRIX_BUDGET_PER_HOUR = 500;

export const consumeGoogleMatrixBudget = internalMutation({
  args: {},
  handler: async (ctx) => {
    await checkRateLimit(ctx, "google_matrix:global", GOOGLE_MATRIX_BUDGET_PER_HOUR, 60 * 60 * 1000);
  },
});

export const primeRoadDistanceCache = action({
  args: {
    userLat: v.number(),
    userLng: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      console.error("Missing GOOGLE_MAPS_SERVER_KEY environment variable.");
      return;
    }

    // Round FIRST, and use the rounded value for the outbound request as well as the cache key.
    // Previously Google was called with the raw coordinate while rows were written rounded, so two
    // shoppers a few metres apart paid for two lookups that produced one identical row.
    const startLat = Math.round(args.userLat * 1000) / 1000;
    const startLng = Math.round(args.userLng * 1000) / 1000;

    // 1. Fetch active boutiques across the system
    const boutiques = await ctx.runQuery(internal.locationActions.getActiveBoutiquesForRouting);
    if (boutiques.length === 0) return;

    // 2. Coarse 30km Haversine pre-filter to drop obviously out-of-range targets
    const MAX_COARSE_RADIUS_KM = 30;
    const inRangeBoutiques = boutiques.filter((b: any) => {
      const birdEyeDistance = haversineKm(startLat, startLng, b.latitude, b.longitude);
      return birdEyeDistance <= MAX_COARSE_RADIUS_KM;
    });

    if (inRangeBoutiques.length === 0) return;

    // 2b. Drop destinations already measured and still fresh for this origin cell. This is what
    // makes repeated calls with the same coordinate free.
    const cached = await ctx.runQuery(internal.locationActions.getFreshCachedDistancesForOrigin, {
      startLat,
      startLng,
    });
    const filteredBoutiques = selectUncachedDestinations(inRangeBoutiques, cached, Date.now());
    if (filteredBoutiques.length === 0) return;

    // 2c. Spend from the platform-wide budget. Throws when exhausted; priming is opportunistic, so
    // the caller's .catch() swallowing it is the intended behaviour.
    await ctx.runMutation(internal.locationActions.consumeGoogleMatrixBudget, {});

    // 3. Chunk destinations into groups of 25 to respect Google Matrix API hard limits
    const GOOGLE_MAX_CHUNKS = 25;
    const origin = `${startLat},${startLng}`;
    const writePayloads: any[] = [];

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
