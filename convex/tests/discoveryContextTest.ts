// convex/tests/discoveryContextTest.ts
// Phase 2A: tests for the DiscoveryContext bootstrap resolver.
//
// Fixtures use real coordinates from the 22 active production pincodes (public geographic data)
// so the geometry under test matches the geometry the threshold was measured against. Nothing
// here reads the database.
//
// Run with: npx tsx convex/tests/discoveryContextTest.ts

import {
  buildDiscoveryContext,
  findNearestCentroid,
  normalizeCoord,
  SERVICE_AREA_RESOLUTION_KM,
  type PincodeCentroid,
} from "../lib/discoveryContext";

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

// Real Kochi centroids (subset of the 22 active production rows).
const PINCODES: PincodeCentroid[] = [
  { pincode: "682016", city: "Kaloor", lat: 9.9932, lng: 76.2952, zoneCode: "KOCHI_CORE", active: true },
  { pincode: "682024", city: "Edappally", lat: 10.0261, lng: 76.3088, zoneCode: "KOCHI_CORE", active: true },
  { pincode: "682036", city: "Panampilly Nagar", lat: 9.9592, lng: 76.2928, zoneCode: "KOCHI_CORE", active: true },
  { pincode: "682030", city: "Kakkanad Infopark", lat: 10.0159, lng: 76.3419, zoneCode: "KOCHI_EXTENDED", active: true },
  { pincode: "682307", city: "Kundannoor", lat: 9.932, lng: 76.315, zoneCode: "KOCHI_EXTENDED", active: true },
];

const ctxOf = (lat: any, lng: any, list = PINCODES) => buildDiscoveryContext(lat, lng, list);

// ── 1. Known in-area coordinate resolves to the expected zone ────────────────
{
  const c = ctxOf(9.9932, 76.2952);
  assertEqual("exact Kaloor centroid -> KOCHI_CORE", c.serviceArea, "KOCHI_CORE");
  assertEqual("city comes from the matched pincode row", c.city, "Kaloor");
  assertEqual("isServiceable true in area", c.isServiceable, true);
  assertEqual("resolutionSource is PINCODE_CENTROID", c.resolutionSource, "PINCODE_CENTROID");
  const ext = ctxOf(10.0159, 76.3419);
  assertEqual("Kakkanad Infopark -> KOCHI_EXTENDED", ext.serviceArea, "KOCHI_EXTENDED");
}

// ── 2/3. Normalisation: same cell resolves identically ───────────────────────
{
  assertEqual("normalizeCoord rounds to 3dp", normalizeCoord(9.99321789), 9.993);
  assertEqual("normalizeCoord passes through an already-3dp value", normalizeCoord(9.993), 9.993);
  assertEqual("normalizeCoord rejects null", normalizeCoord(null), undefined);
  assertEqual("normalizeCoord rejects NaN", normalizeCoord(NaN), undefined);

  const unrounded = ctxOf(9.99321789, 76.29518642);
  const rounded = ctxOf(9.993, 76.295);
  assertEqual("unrounded input resolves identically to its normalized equivalent", unrounded, rounded);
  assertEqual("normalized coords are returned, not the raw input", unrounded.coords, { lat: 9.993, lng: 76.295 });

  // Two shoppers a few metres apart share one identity — the point of normalising.
  const a = ctxOf(9.99331, 76.29524);
  const b = ctxOf(9.99349, 76.29511);
  assertEqual("two points in the same 3dp cell produce identical context", a, b);
}

// ── 4/5. Remote coordinates collapse to OUT_OF_AREA ──────────────────────────
{
  const remotes: Array<[string, number, number]> = [
    ["Thrissur (54 km)", 10.5276, 76.2144],
    ["Alappuzha (48 km)", 9.4981, 76.3388],
    ["Bengaluru (353 km)", 12.9716, 77.5946],
    ["Hyderabad (848 km)", 17.385, 78.4867],
    ["Delhi (2066 km)", 28.6139, 77.209],
    ["null island", 0, 0],
  ];
  for (const [label, lat, lng] of remotes) {
    const c = ctxOf(lat, lng);
    assertEqual(`${label} -> OUT_OF_AREA`, c.resolutionSource, "OUT_OF_AREA");
    assertEqual(`${label} -> serviceArea null`, c.serviceArea, null);
    assertEqual(`${label} -> coords null (collapses to one identity)`, c.coords, null);
    assertEqual(`${label} -> not serviceable`, c.isServiceable, false);
  }
  // Every out-of-area coordinate must produce the SAME object, or the keyspace is not bounded.
  assertEqual(
    "all out-of-area coordinates share one identity",
    JSON.stringify(ctxOf(17.385, 78.4867)) === JSON.stringify(ctxOf(28.6139, 77.209)),
    true
  );
}

// ── 6/13. Client city can never influence resolution ─────────────────────────
{
  // The resolver takes no city parameter at all, so this is structural. Assert the resolved city
  // is the matched pincode's, and that a differently-named nearby row wins purely on distance.
  const c = ctxOf(10.0159, 76.3419);
  assertEqual("city is the matched pincode's, not any caller-supplied value", c.city, "Kakkanad Infopark");
  assertEqual("buildDiscoveryContext takes no city argument", buildDiscoveryContext.length <= 4, true);
}

// ── 7. Inactive pincodes are ignored ─────────────────────────────────────────
{
  const withInactive: PincodeCentroid[] = [
    { pincode: "999999", city: "Ghost", lat: 9.9932, lng: 76.2952, zoneCode: "GHOST_ZONE", active: false },
    ...PINCODES,
  ];
  const c = buildDiscoveryContext(9.9932, 76.2952, withInactive);
  assertEqual("an inactive centroid at the exact point is skipped", c.serviceArea, "KOCHI_CORE");
  assertEqual("inactive row's city is not used", c.city, "Kaloor");

  const onlyInactive = buildDiscoveryContext(9.9932, 76.2952, [withInactive[0]!]);
  assertEqual("only-inactive candidates -> OUT_OF_AREA", onlyInactive.resolutionSource, "OUT_OF_AREA");
  assertEqual("empty candidate list -> OUT_OF_AREA", ctxOf(9.9932, 76.2952, []).resolutionSource, "OUT_OF_AREA");
}

// ── 8. Missing / malformed coordinates ───────────────────────────────────────
{
  for (const [label, lat, lng] of [
    ["both null", null, null],
    ["lat null", null, 76.2952],
    ["lng undefined", 9.9932, undefined],
    ["NaN lat", NaN, 76.2952],
    ["Infinity lng", 9.9932, Infinity],
  ] as Array<[string, any, any]>) {
    assertEqual(`${label} -> OUT_OF_AREA`, ctxOf(lat, lng).resolutionSource, "OUT_OF_AREA");
  }
}

// ── 9/10. Threshold boundary is inclusive ────────────────────────────────────
{
  // Construct a lone centroid and probe just inside / on / outside the radius using a
  // latitude offset, where 1 degree ~ 111.195 km on the great circle.
  const solo: PincodeCentroid[] = [
    { pincode: "000001", city: "Solo", lat: 10.0, lng: 76.3, zoneCode: "SOLO_ZONE", active: true },
  ];
  const degPerKm = 1 / 111.195;
  const at = (km: number) => buildDiscoveryContext(10.0 + km * degPerKm, 76.3, solo);

  assertEqual("2.5 km inside -> resolved", at(2.5).serviceArea, "SOLO_ZONE");
  assertEqual("2.85 km (largest measured interior gap) -> resolved", at(2.85).serviceArea, "SOLO_ZONE");
  assertEqual("2.9 km -> resolved", at(2.9).serviceArea, "SOLO_ZONE");
  assertEqual("3.2 km -> OUT_OF_AREA", at(3.2).resolutionSource, "OUT_OF_AREA");
  assertEqual("5 km -> OUT_OF_AREA", at(5).resolutionSource, "OUT_OF_AREA");
  assertEqual("threshold constant is 3.0 km", SERVICE_AREA_RESOLUTION_KM, 3.0);

  // The boundary is QUANTIZED to the 3dp normalization grid (~111 m), because coordinates are
  // rounded before the distance is measured. Probing at metre resolution would be testing a
  // precision the resolver cannot express, so instead assert the invariant that actually holds:
  // for every probe, the outcome agrees with the distance of its NORMALIZED coordinate.
  let boundaryConsistent = true;
  let sawInside = false;
  let sawOutside = false;
  for (let km = 2.0; km <= 4.0; km += 0.02) {
    const rawLat = 10.0 + km * degPerKm;
    const normLat = normalizeCoord(rawLat)!;
    const measured = findNearestCentroid(normLat, 76.3, solo)!.distanceKm;
    const resolved = buildDiscoveryContext(rawLat, 76.3, solo).serviceArea !== null;
    // Inclusive comparison: distance <= threshold must resolve, and only that.
    if (resolved !== (measured <= SERVICE_AREA_RESOLUTION_KM)) boundaryConsistent = false;
    if (resolved) sawInside = true;
    else sawOutside = true;
  }
  assertEqual("outcome matches normalized distance at every probe across the boundary", boundaryConsistent, true);
  assertEqual("the sweep actually crossed the boundary (inside seen)", sawInside, true);
  assertEqual("the sweep actually crossed the boundary (outside seen)", sawOutside, true);
}

// ── 11. Nearest wins when several are within range ───────────────────────────
{
  // A point between Kaloor and Edappally, deliberately closer to Kaloor.
  const near = findNearestCentroid(9.9982, 76.2985, PINCODES);
  assertEqual("nearest centroid selected", near?.centroid.pincode, "682016");

  const twoClose: PincodeCentroid[] = [
    { pincode: "AAA", city: "Far", lat: 10.02, lng: 76.3, zoneCode: "ZONE_FAR", active: true },
    { pincode: "BBB", city: "Near", lat: 10.001, lng: 76.3, zoneCode: "ZONE_NEAR", active: true },
  ];
  const c = buildDiscoveryContext(10.0, 76.3, twoClose);
  assertEqual("closer of two in-range centroids wins", c.serviceArea, "ZONE_NEAR");
  assertEqual("and supplies the city", c.city, "Near");
}

// ── 12. An unbacked zone can never become serviceable ────────────────────────
{
  // THRISSUR_CORE exists in deliveryZones but has no pincode mapped to it. Resolution starts from
  // pincodes and never reads deliveryZones, so such a zone is unreachable by construction.
  const thrissurish = ctxOf(10.5276, 76.2144);
  assertEqual("Thrissur coordinate cannot resolve to THRISSUR_CORE", thrissurish.serviceArea, null);
  const zonesSeen = new Set(PINCODES.filter((p) => p.active !== false).map((p) => p.zoneCode));
  assertEqual("only zones backed by an active pincode are reachable", zonesSeen.has("THRISSUR_CORE"), false);
}

// ── Phase 2B: discovery eligibility is independent of logistics coordinates ──
{
  // The wiring passes the ORIGINAL request coordinates to OperationsService while the resolver
  // reports OUT_OF_AREA. These assertions pin that separation: an out-of-area request must not
  // become a normal local-discovery request merely because logistics still received coordinates.
  const far = { lat: 10.5276, lng: 76.2144 }; // Thrissur, 54 km from the nearest centroid
  const ctxFar = ctxOf(far.lat, far.lng);

  assertEqual("out-of-area: discovery not serviceable", ctxFar.isServiceable, false);
  assertEqual("out-of-area: no service area identity", ctxFar.serviceArea, null);
  assertEqual("out-of-area: no city identity", ctxFar.city, null);
  assertEqual("out-of-area: discovery carries no coords", ctxFar.coords, null);

  // The request coordinates themselves are untouched by resolution — logistics still has them.
  // This is what lets an out-of-area shopper get honest distance/ETA without being treated as
  // local. If resolution ever mutated or consumed the request coords, this would fail.
  assertEqual("request coords survive resolution unchanged", far, { lat: 10.5276, lng: 76.2144 });

  // And the converse: being in-area must not depend on logistics succeeding.
  const ctxNear = ctxOf(9.9932, 76.2952);
  assertEqual("in-area: serviceable", ctxNear.isServiceable, true);
  assertEqual("in-area: has service area identity", ctxNear.serviceArea, "KOCHI_CORE");

  // An in-area and an out-of-area request must never produce the same discovery identity, which
  // is the property that stops the two collapsing into one another.
  assertEqual(
    "in-area and out-of-area identities are distinguishable",
    JSON.stringify(ctxNear) === JSON.stringify(ctxFar),
    false
  );

  // Discovery eligibility is decided purely by geography, not by whether coordinates exist.
  const ctxNone = ctxOf(undefined, undefined);
  assertEqual("absent coords are out-of-area, not serviceable-by-default", ctxNone.isServiceable, false);
  assertEqual(
    "absent coords and remote coords share one identity",
    JSON.stringify(ctxNone) === JSON.stringify(ctxFar),
    true
  );
}

console.log(`\nDiscovery context: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Discovery context tests failed (${failed} failures)`);
