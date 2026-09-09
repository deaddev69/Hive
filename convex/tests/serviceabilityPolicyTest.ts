// convex/tests/serviceabilityPolicyTest.ts
//
// The agreed serviceability contract, written before the discovery surfaces migrate onto it.
//
// Seven product surfaces each answer "can this be delivered here?" a slightly different way
// today: Home scales straight-line distance to an estimated road distance and defaults to a 13km
// radius; Shop compares raw straight-line against 15km, and silently switches to measured road
// distance for any pair that happens to be cached; Search compares raw straight-line with no
// default at all. The three disagree by a wide margin — against a 10km boutique, Home reaches
// 6.7km in a straight line where Shop reaches 10km, so every product from a boutique 6.7-10km
// away is hidden on Home and shown on Shop right now.
//
// These assertions are the contract those surfaces will be held to, not a description of what
// they currently do. resolveServiceability is deliberately not wired into any of them yet: this
// file exists so the policy is settled and pinned before the queries move, rather than being
// decided one query at a time in the middle of a refactor.
//
// The agreed policy, for the seven canonical discovery surfaces:
//
//   in range                   -> show
//   out of range               -> hide
//   no shopper location        -> browse, but never imply deliverability   (status "unknown")
//   boutique has no coordinates -> hide
//   closed seller              -> hide
//   suspended seller           -> hide
//   admin-hidden product       -> hide
//
// The boutique storefront is deliberately NOT covered here. It stays browsable outside the
// delivery area and while the boutique is closed, with the unavailability signalled instead —
// that is catalogue visibility, a separate question from delivery capability, and folding it in
// here is what would drag storefront policy back into the delivery rule.
//
// Run with: npx tsx convex/tests/serviceabilityPolicyTest.ts

import {
  resolveServiceability,
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

/** Production shape: explicit radius, coordinates on both the row and addressDetails. */
const BOUTIQUE = {
  latitude: 10.0,
  longitude: 76.3,
  addressDetails: { lat: 10.0, lng: 76.3 },
  deliveryRadiusKm: 10,
};

const degPerKm = 1 / 111.195;
const northOf = (km: number) => ({ lat: 10.0 + km * degPerKm, lng: 76.3 });

// ── 1. In range -> serviceable ───────────────────────────────────────────────
{
  // 10km radius under the road model reaches 10/1.5 = 6.67km in a straight line.
  const p = northOf(5);
  const d = resolveServiceability(p.lat, p.lng, BOUTIQUE);
  assertEqual("in range -> serviceable", d.status, "serviceable");
  assertEqual("in range reports a radius", d.radiusKm, 10);
  assertEqual("in range reports estimated source", d.source, "fallback");
  assertEqual("distance is the road estimate, not straight-line", Math.round((d.distanceKm ?? 0) * 10) / 10, Math.round(estimatedRoadKm(5) * 10) / 10);
}

// ── 2. Out of range -> not_serviceable ───────────────────────────────────────
{
  // 8km straight-line: inside a raw 10km comparison, outside once scaled (8 x 1.5 = 12 > 10).
  // This is exactly the band Shop currently shows and Home currently hides.
  const p = northOf(8);
  const d = resolveServiceability(p.lat, p.lng, BOUTIQUE);
  assertEqual("out of range -> not_serviceable", d.status, "not_serviceable");
  assertEqual("out of range still reports distance", (d.distanceKm ?? 0) > 10, true);
  assertEqual("raw straight-line would have admitted it", haversineKm(p.lat, p.lng, 10.0, 76.3) <= 10, true);
}

// ── 3. No shopper location -> unknown, NOT not_serviceable ───────────────────
{
  // The decision the whole tri-state exists for. Every surface currently treats this as falsy
  // and skips filtering entirely, which is how the shopper whose location nobody knows became
  // the one shown the entire catalogue with delivery promises attached.
  assertEqual("null coords -> unknown", resolveServiceability(null, null, BOUTIQUE).status, "unknown");
  assertEqual("undefined coords -> unknown", resolveServiceability(undefined, undefined, BOUTIQUE).status, "unknown");
  assertEqual("0,0 -> unknown", resolveServiceability(0, 0, BOUTIQUE).status, "unknown");
  assertEqual("lat without lng -> unknown", resolveServiceability(10.0, null, BOUTIQUE).status, "unknown");

  // unknown is an absent answer, so it carries no distance to render.
  const d = resolveServiceability(null, null, BOUTIQUE);
  assertEqual("unknown carries no distance", d.distanceKm, undefined);
  assertEqual("unknown carries no radius", d.radiusKm, undefined);

  // And it must be distinguishable from a real negative, or callers cannot apply the policy.
  assertEqual("unknown is not not_serviceable", resolveServiceability(null, null, BOUTIQUE).status === resolveServiceability(northOf(50).lat, 76.3, BOUTIQUE).status, false);
}

// ── 4. Boutique coordinates ──────────────────────────────────────────────────
{
  // addressDetails is a fallback, not an afterthought: a boutique carrying coordinates only
  // there is measured normally.
  const addressOnly = { addressDetails: { lat: 10.0, lng: 76.3 }, deliveryRadiusKm: 10 } as any;
  assertEqual("addressDetails-only boutique is measured", resolveServiceability(northOf(5).lat, 76.3, addressOnly).status, "serviceable");
  assertEqual("addressDetails-only boutique still respects the radius", resolveServiceability(northOf(8).lat, 76.3, addressOnly).status, "not_serviceable");

  // No usable coordinates at all is a definite no, not an unknown: the boutique's own location
  // is missing, so no promise about it can be verified. Home currently does the opposite of
  // this — it lets such a boutique through unfiltered.
  const noCoords = { deliveryRadiusKm: 10 } as any;
  assertEqual("boutique without coords -> not_serviceable", resolveServiceability(10.0, 76.3, noCoords).status, "not_serviceable");
  assertEqual("boutique without coords is NOT unknown", resolveServiceability(10.0, 76.3, noCoords).status === "unknown", false);
  assertEqual("missing boutique -> not_serviceable", resolveServiceability(10.0, 76.3, null).status, "not_serviceable");

  // Shopper location is checked first: with neither side known, the answer is still unknown,
  // because the surface's job is to ask for a location rather than to declare nothing deliverable.
  assertEqual("no shopper coords beats missing boutique coords", resolveServiceability(null, null, noCoords).status, "unknown");
}

// ── 5. Radius default is the order gate's, not the catalogue's ───────────────
{
  // No production boutique relies on this today (all 12 approved carry an explicit 10 or 13),
  // but Shop and the cart rail default to 15 and Search defaults to nothing at all — a boutique
  // with no radius is silently excluded there. 13 is the value orders/payments/reservations use.
  const noRadius = { latitude: 10.0, longitude: 76.3 } as any;
  assertEqual("default radius is 13", resolveServiceability(northOf(8).lat, 76.3, noRadius).radiusKm, 13);
  // 8km x 1.5 = 12km: inside the canonical 13km default, outside a 10km one.
  assertEqual("default radius admits 8km straight-line", resolveServiceability(northOf(8).lat, 76.3, noRadius).status, "serviceable");
  assertEqual("multiplier is 1.5", ROAD_DISTANCE_MULTIPLIER, 1.5);
}

// ── 6. Measured road distance wins, and is labelled ──────────────────────────
{
  // A cached road distance is the exact answer; the scaled straight-line is a stand-in for one.
  // Shop currently mixes the two silently, so the same boutique moves in and out of range as the
  // cache backfills. Reporting the source makes which one was used observable.
  const p = northOf(5);
  const withMeasured = resolveServiceability(p.lat, p.lng, BOUTIQUE, { measuredRoadKm: 12 });
  assertEqual("measured road distance is used verbatim", withMeasured.distanceKm, 12);
  assertEqual("measured is labelled road", withMeasured.source, "road");
  assertEqual("measured 12km exceeds a 10km radius", withMeasured.status, "not_serviceable");

  // The same point without a measurement is inside, so the two genuinely differ — this is the
  // divergence being made explicit rather than hidden.
  assertEqual("same point without measurement is serviceable", resolveServiceability(p.lat, p.lng, BOUTIQUE).status, "serviceable");

  // A measured 0 is a real measurement (same building), not a missing one.
  assertEqual("measured zero is honoured", resolveServiceability(p.lat, p.lng, BOUTIQUE, { measuredRoadKm: 0 }).source, "road");
  assertEqual("explicit null measurement falls back", resolveServiceability(p.lat, p.lng, BOUTIQUE, { measuredRoadKm: null }).source, "fallback");
}

// ── 7. Equivalence with the gate this must not change ────────────────────────
{
  // orders, payments and reservations decide through checkServiceability, and the drawer through
  // isWithinDeliveryRadius. Migrating the surfaces onto resolveServiceability must not move
  // either boundary, so the three are pinned against each other across the range.
  for (const km of [0, 1, 3, 5, 6, 6.6, 6.7, 7, 8, 9, 10, 12, 20, 50]) {
    const p = northOf(km);
    const decision = resolveServiceability(p.lat, p.lng, BOUTIQUE);
    const asBool = decision.status === "serviceable";
    if (asBool !== isWithinDeliveryRadius(p.lat, p.lng, BOUTIQUE)) {
      failed++;
      console.error(`[FAIL] resolveServiceability disagrees with isWithinDeliveryRadius at ${km}km`);
    }
    if (asBool !== checkServiceability(p.lat, p.lng, BOUTIQUE).serviceable) {
      failed++;
      console.error(`[FAIL] resolveServiceability disagrees with the order gate at ${km}km`);
    }
  }
  passed++;
  console.log("[PASS] serviceable status matches both existing gates at every probed distance");

  // The one place they deliberately differ: the existing gates collapse "no shopper location"
  // into false, because an order must fail closed. resolveServiceability keeps it separate so a
  // product rail can tell the two apart — and a caller that wants the old behaviour maps
  // unknown to false explicitly.
  assertEqual("order gate fails closed without coords", checkServiceability(null, null, BOUTIQUE).serviceable, false);
  assertEqual("primitive reports unknown instead", resolveServiceability(null, null, BOUTIQUE).status, "unknown");
  assertEqual("mapping unknown->false reproduces the gate", resolveServiceability(null, null, BOUTIQUE).status === "serviceable", checkServiceability(null, null, BOUTIQUE).serviceable);
}

// ── 8. Real production geometry ──────────────────────────────────────────────
{
  // Two of the twelve approved boutiques, with their real radii. Kaloor sits inside the cluster;
  // Aluva and Hyderabad sit outside every boutique's reach.
  const KALOOR = { lat: 9.9932, lng: 76.2952 };
  const ALUVA = { lat: 10.1004, lng: 76.357 };
  const HYDERABAD = { lat: 17.385, lng: 78.4867 };
  const NEAR_KALOOR = { latitude: 9.9994483, longitude: 76.2964559, deliveryRadiusKm: 10 };

  assertEqual("Kaloor is serviceable from the boutique beside it", resolveServiceability(KALOOR.lat, KALOOR.lng, NEAR_KALOOR).status, "serviceable");
  assertEqual("Aluva is not", resolveServiceability(ALUVA.lat, ALUVA.lng, NEAR_KALOOR).status, "not_serviceable");
  assertEqual("Hyderabad is not", resolveServiceability(HYDERABAD.lat, HYDERABAD.lng, NEAR_KALOOR).status, "not_serviceable");
  // 848km away still returns a distance rather than throwing — the number is what makes an
  // out-of-area result explainable instead of just empty.
  assertEqual("a remote point still reports its distance", (resolveServiceability(HYDERABAD.lat, HYDERABAD.lng, NEAR_KALOOR).distanceKm ?? 0) > 800, true);
}

console.log(`\nServiceability policy contract: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Serviceability policy tests failed (${failed} failures)`);
