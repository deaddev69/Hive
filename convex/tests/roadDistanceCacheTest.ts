// convex/tests/roadDistanceCacheTest.ts
// Phase 2C: road-distance cache expiry sweep + priming hardening.
//
// Run with: npx tsx convex/tests/roadDistanceCacheTest.ts

import {
  isRoadDistanceExpired,
  selectUncachedDestinations,
  ROAD_DISTANCE_SWEEP_BATCH,
  ROAD_DISTANCE_SWEEP_MAX_PASSES,
} from "../locationActions";

let passed = 0;
let failed = 0;

function assertEqual(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}\n  expected ${e}\n  actual   ${a}`);
  }
}

const NOW = 1_800_000_000_000;
const HOUR = 3600_000;
const DAY = 24 * HOUR;

// ── Expiry decision ──────────────────────────────────────────────────────────
{
  assertEqual("row expiring in 7 days is kept", isRoadDistanceExpired(NOW + 7 * DAY, NOW), false);
  assertEqual("row expiring in 1 ms is kept", isRoadDistanceExpired(NOW + 1, NOW), false);
  assertEqual("row expiring exactly now is swept", isRoadDistanceExpired(NOW, NOW), true);
  assertEqual("row expired an hour ago is swept", isRoadDistanceExpired(NOW - HOUR, NOW), true);
  assertEqual("long-dead row is swept", isRoadDistanceExpired(NOW - 400 * DAY, NOW), true);

  assertEqual("sweep batch is bounded", ROAD_DISTANCE_SWEEP_BATCH > 0 && ROAD_DISTANCE_SWEEP_BATCH <= 1000, true);
  assertEqual("drain passes are bounded", ROAD_DISTANCE_SWEEP_MAX_PASSES > 0 && ROAD_DISTANCE_SWEEP_MAX_PASSES <= 100, true);
}

// ── Priming: skip destinations already measured and still fresh ──────────────
const B = (lat: number, lng: number) => ({ latitude: lat, longitude: lng });
const C = (lat: number, lng: number, expiresAt: number) => ({ endLat: lat, endLng: lng, expiresAt });

const boutiques = [B(10.0, 76.3), B(9.95, 76.32), B(10.02, 76.28)];

{
  // Nothing cached -> everything needs measuring. This is the first-visit case.
  assertEqual("empty cache -> all destinations selected", selectUncachedDestinations(boutiques, [], NOW).length, 3);

  // Everything cached and fresh -> nothing to buy. THIS is the regression that mattered: the old
  // code called Google unconditionally, so repeating the same coordinate spent quota every time.
  const allFresh = boutiques.map((b) => C(b.latitude, b.longitude, NOW + DAY));
  assertEqual("fully cached -> no Google call needed", selectUncachedDestinations(boutiques, allFresh, NOW).length, 0);

  // Partially cached -> only the gap is measured.
  const partial = [C(10.0, 76.3, NOW + DAY)];
  const remaining = selectUncachedDestinations(boutiques, partial, NOW);
  assertEqual("partially cached -> only uncached selected", remaining.length, 2);
  assertEqual("the cached destination is the one dropped", remaining.some((b) => b.latitude === 10.0 && b.longitude === 76.3), false);
}

// ── Expired cache entries must NOT count as cached ───────────────────────────
{
  const stale = boutiques.map((b) => C(b.latitude, b.longitude, NOW - 1));
  assertEqual("expired rows do not suppress re-measurement", selectUncachedDestinations(boutiques, stale, NOW).length, 3);

  const expiringExactlyNow = boutiques.map((b) => C(b.latitude, b.longitude, NOW));
  assertEqual("rows expiring exactly now are treated as stale", selectUncachedDestinations(boutiques, expiringExactlyNow, NOW).length, 3);

  const mixed = [C(10.0, 76.3, NOW + DAY), C(9.95, 76.32, NOW - DAY)];
  assertEqual("mixed fresh/stale -> stale is re-measured", selectUncachedDestinations(boutiques, mixed, NOW).length, 2);
}

// ── Matching is on the destination pair, not the origin ──────────────────────
{
  // A cached row for a DIFFERENT boutique must not suppress this one.
  const otherPlace = [C(12.9716, 77.5946, NOW + DAY)];
  assertEqual("unrelated cached destination suppresses nothing", selectUncachedDestinations(boutiques, otherPlace, NOW).length, 3);

  // Near-but-not-equal coordinates are different destinations.
  const nearMiss = [C(10.000001, 76.3, NOW + DAY)];
  assertEqual("a destination 0.1 m away is still a distinct pair", selectUncachedDestinations([B(10.0, 76.3)], nearMiss, NOW).length, 1);
}

// ── Degenerate inputs ────────────────────────────────────────────────────────
{
  assertEqual("no boutiques -> nothing to select", selectUncachedDestinations([], [], NOW).length, 0);
  assertEqual("no boutiques but cache present -> nothing to select", selectUncachedDestinations([], [C(10.0, 76.3, NOW + DAY)], NOW).length, 0);
  // Duplicate cache rows for one destination must not break the set logic.
  const dupes = [C(10.0, 76.3, NOW + DAY), C(10.0, 76.3, NOW + 2 * DAY)];
  assertEqual("duplicate cache rows still suppress once", selectUncachedDestinations([B(10.0, 76.3)], dupes, NOW).length, 0);
}

console.log(`\nRoad distance cache: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Road distance cache tests failed (${failed} failures)`);
