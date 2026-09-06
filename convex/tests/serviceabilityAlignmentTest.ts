// convex/tests/serviceabilityAlignmentTest.ts
// Phase 3A: the delivery-location drawer must decide serviceability using the same model as the
// gate that actually allows an order.
//
// Before this change, convex/serviceability.ts compared RAW straight-line distance against a 15km
// default while convex/lib/serviceability.ts — which orders and reservations go through — compares
// an estimated ROAD distance (haversine x 1.5) against a 13km default. A shopper could be told
// "we deliver to you" and then be refused at checkout.
//
// Run with: npx tsx convex/tests/serviceabilityAlignmentTest.ts

import {
  isWithinDeliveryRadius,
  checkServiceability,
  estimatedRoadKm,
  haversineKm,
  ROAD_DISTANCE_MULTIPLIER,
} from "../lib/serviceability";

let passed = 0;
let failed = 0;

function assertEqual(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

/** The model the drawer used to use, reproduced here so the divergence is provable. */
function oldDrawerModel(lat: number, lng: number, b: any): boolean {
  const distance = haversineKm(lat, lng, b.latitude, b.longitude);
  return distance <= (b.deliveryRadiusKm ?? 15);
}

// A boutique matching production shape: explicit radius, real coordinates.
const BOUTIQUE = { latitude: 10.0, longitude: 76.3, deliveryRadiusKm: 10 };
const degPerKm = 1 / 111.195;
const northOf = (km: number) => ({ lat: 10.0 + km * degPerKm, lng: 76.3 });

// ── The drawer now agrees with the order gate ────────────────────────────────
{
  for (const km of [0, 1, 3, 5, 6, 6.6, 6.7, 7, 8, 9, 10, 12, 20]) {
    const p = northOf(km);
    const drawer = isWithinDeliveryRadius(p.lat, p.lng, BOUTIQUE);
    const gate = checkServiceability(p.lat, p.lng, BOUTIQUE).serviceable;
    if (drawer !== gate) {
      failed++;
      console.error(`[FAIL] drawer and gate disagree at ${km}km (drawer=${drawer}, gate=${gate})`);
    }
  }
  passed++;
  console.log("[PASS] drawer and order gate agree at every probed distance");
}

// ── The divergence being fixed is real, not theoretical ──────────────────────
{
  // 8 km straight-line against a 10 km radius: the old model accepted it (8 <= 10), the real gate
  // rejects it (8 x 1.5 = 12 > 10). Exactly the shopper who was told yes and refused at checkout.
  const p = northOf(8);
  assertEqual("old drawer model accepted 8km", oldDrawerModel(p.lat, p.lng, BOUTIQUE), true);
  assertEqual("order gate rejects 8km", checkServiceability(p.lat, p.lng, BOUTIQUE).serviceable, false);
  assertEqual("new drawer model rejects 8km, matching the gate", isWithinDeliveryRadius(p.lat, p.lng, BOUTIQUE), false);

  // Inside both models.
  const near = northOf(5);
  assertEqual("5km accepted by old model", oldDrawerModel(near.lat, near.lng, BOUTIQUE), true);
  assertEqual("5km still accepted after alignment", isWithinDeliveryRadius(near.lat, near.lng, BOUTIQUE), true);

  // The effective radius is now radius / multiplier.
  assertEqual("multiplier is 1.5", ROAD_DISTANCE_MULTIPLIER, 1.5);
  assertEqual("estimatedRoadKm scales straight-line distance", Math.round(estimatedRoadKm(10) * 100) / 100, 15);
  const boundaryKm = BOUTIQUE.deliveryRadiusKm / ROAD_DISTANCE_MULTIPLIER; // 6.667 km
  const justInside = northOf(boundaryKm - 0.1);
  const justOutside = northOf(boundaryKm + 0.1);
  assertEqual("just inside the effective radius is serviceable", isWithinDeliveryRadius(justInside.lat, justInside.lng, BOUTIQUE), true);
  assertEqual("just outside the effective radius is not", isWithinDeliveryRadius(justOutside.lat, justOutside.lng, BOUTIQUE), false);
}

// ── Behaviour the inline version silently got wrong ──────────────────────────
{
  // A boutique whose coordinates live only on addressDetails. The old inline filter read
  // b.latitude/b.longitude directly, producing NaN comparisons and treating it as unreachable.
  const addressOnly = { addressDetails: { lat: 10.0, lng: 76.3 }, deliveryRadiusKm: 10 } as any;
  assertEqual("addressDetails-only boutique is now resolvable", isWithinDeliveryRadius(10.01, 76.3, addressOnly), true);
  assertEqual("old inline model could not resolve it", oldDrawerModel(10.01, 76.3, addressOnly), false);
}

// ── Fail-closed cases ────────────────────────────────────────────────────────
{
  assertEqual("null user coords -> not serviceable", isWithinDeliveryRadius(null, null, BOUTIQUE), false);
  assertEqual("undefined user coords -> not serviceable", isWithinDeliveryRadius(undefined, undefined, BOUTIQUE), false);
  assertEqual("0,0 coords -> not serviceable", isWithinDeliveryRadius(0, 0, BOUTIQUE), false);
  assertEqual("missing boutique -> not serviceable", isWithinDeliveryRadius(10.0, 76.3, null), false);
  assertEqual("boutique without coords -> not serviceable", isWithinDeliveryRadius(10.0, 76.3, { deliveryRadiusKm: 10 } as any), false);
}

// ── Radius default no longer differs from the gate ───────────────────────────
{
  // No production boutique relies on the default today (all 11 carry an explicit 10 or 13), but
  // the drawer defaulted to 15 while the gate defaults to 13. Both now use the gate's value.
  const noRadius = { latitude: 10.0, longitude: 76.3 } as any;
  const at9km = northOf(9); // 9 x 1.5 = 13.5 -> outside a 13km default, inside a 15km one
  assertEqual("default radius now matches the gate", isWithinDeliveryRadius(at9km.lat, at9km.lng, noRadius), checkServiceability(at9km.lat, at9km.lng, noRadius).serviceable);
}

console.log(`\nServiceability alignment: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Serviceability alignment tests failed (${failed} failures)`);
