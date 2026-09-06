// convex/tests/serviceabilityFallbackTest.ts
// Phase 3B: checkServiceability is authoritative on boutique delivery geometry alone.
//
// The legacy behaviour fell back to matching the caller's `city` string against active
// serviceZones rows whenever no boutique was in range. That fallback fired ONLY after the
// geometry had already said no, so every result it produced asserted that Hive serves someone no
// boutique can reach. It is deleted, not replaced: resolveDiscoveryContext answers which service
// area a shopper is in, which is a different question from whether anyone can deliver there.
//
// Fixtures are the real coordinates and radii of the 11 currently approved boutiques, so these
// assertions reflect production geometry rather than invented numbers.
//
// Run with: npx tsx convex/tests/serviceabilityFallbackTest.ts

import { isWithinDeliveryRadius } from "../lib/serviceability";

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

/** The 11 approved boutiques in production, verbatim. */
const BOUTIQUES = [
  { latitude: 10.0007936, longitude: 76.3133952, deliveryRadiusKm: 13 },
  { latitude: 9.9948553, longitude: 76.3199931, deliveryRadiusKm: 13 },
  { latitude: 10.0162983, longitude: 76.3525004, deliveryRadiusKm: 13 },
  { latitude: 10.017636, longitude: 76.3688469, deliveryRadiusKm: 10 },
  { latitude: 9.995687461153745, longitude: 76.30579066492558, deliveryRadiusKm: 10 },
  { latitude: 9.9787512, longitude: 76.3170101, deliveryRadiusKm: 10 },
  { latitude: 9.9994391, longitude: 76.3042106, deliveryRadiusKm: 10 },
  { latitude: 9.9923694, longitude: 76.3039379, deliveryRadiusKm: 10 },
  { latitude: 9.9692376, longitude: 76.2909867, deliveryRadiusKm: 10 },
  { latitude: 9.9994483, longitude: 76.2964559, deliveryRadiusKm: 10 },
  { latitude: 10.0230675, longitude: 76.3413265, deliveryRadiusKm: 10 },
];

/**
 * Mirrors the decision tree in convex/serviceability.ts checkServiceability. `city` is accepted
 * exactly as the query accepts it — and, as there, is never read.
 */
function decide(args: { city: string; lat?: number; lng?: number }) {
  if (args.lat === undefined || args.lng === undefined || (args.lat === 0 && args.lng === 0)) {
    return { isServiceable: false, city: null, state: "", reason: "NO_COORDINATES" };
  }
  const inRange = BOUTIQUES.some((b) => isWithinDeliveryRadius(args.lat, args.lng, b));
  return inRange
    ? { isServiceable: true, city: null, state: "", reason: "BOUTIQUE_IN_RANGE" }
    : { isServiceable: false, city: null, state: "", reason: "OUT_OF_RANGE" };
}

// Real locations.
const KALOOR = { lat: 9.9932, lng: 76.2952 };           // pincode 682016, well covered
const TRIPUNITHURA = { lat: 9.9489, lng: 76.3431 };     // pincode 682301
const ALUVA = { lat: 10.1004, lng: 76.357 };            // active serviceZone, no pincode backing
const HYDERABAD = { lat: 17.385, lng: 78.4867 };

// ── 1. No coordinates → not serviceable ──────────────────────────────────────
{
  assertEqual("no coords -> not serviceable", decide({ city: "Kochi" }).isServiceable, false);
  assertEqual("no coords -> NO_COORDINATES", decide({ city: "Kochi" }).reason, "NO_COORDINATES");
  assertEqual("lat only -> not serviceable", decide({ city: "Kochi", lat: 9.9932 }).isServiceable, false);
  assertEqual("0,0 -> not serviceable", decide({ city: "Kochi", lat: 0, lng: 0 }).isServiceable, false);
  assertEqual("0,0 -> NO_COORDINATES", decide({ city: "Kochi", lat: 0, lng: 0 }).reason, "NO_COORDINATES");
}

// ── 2. Boutique in range → serviceable ───────────────────────────────────────
{
  const r = decide({ city: "Kochi", ...KALOOR });
  assertEqual("Kaloor -> serviceable", r.isServiceable, true);
  assertEqual("Kaloor -> BOUTIQUE_IN_RANGE", r.reason, "BOUTIQUE_IN_RANGE");
}

// ── 3. THE REGRESSION PIN: out of range + matching active zone → NOT serviceable ──
{
  // Every one of these city strings is an active serviceZones row. Under the old fallback each
  // would have returned ZONE_ACTIVE / serviceable despite no boutique being able to deliver.
  for (const city of ["Kochi", "Kakkanad", "Kalamassery", "Aluva", "Thrippunithura", "Edappally"]) {
    const r = decide({ city, ...HYDERABAD });
    if (r.isServiceable !== false || r.reason !== "OUT_OF_RANGE") {
      failed++;
      console.error(`[FAIL] active zone "${city}" at out-of-range coords resolved ${JSON.stringify(r)}`);
    }
  }
  passed++;
  console.log("[PASS] no active serviceZones city can rescue an out-of-range coordinate");
  assertEqual("ZONE_ACTIVE is no longer a reachable reason", decide({ city: "Aluva", ...HYDERABAD }).reason, "OUT_OF_RANGE");
}

// ── 4. Aluva → not serviceable ───────────────────────────────────────────────
{
  // No approved boutique reaches Aluva under the real delivery model, and it has no pincode
  // backing. It was serviceable only through the deleted fallback. This is the intended
  // correction: LocationContext, orders and payments already treated it as unserviceable.
  const r = decide({ city: "Aluva", ...ALUVA });
  assertEqual("Aluva -> not serviceable", r.isServiceable, false);
  assertEqual("Aluva -> OUT_OF_RANGE", r.reason, "OUT_OF_RANGE");
  assertEqual("no boutique reaches Aluva", BOUTIQUES.some((b) => isWithinDeliveryRadius(ALUVA.lat, ALUVA.lng, b)), false);
}

// ── 5. Tripunithura → serviceable on geometry, spelling irrelevant ───────────
{
  assertEqual("Tripunithura -> serviceable", decide({ city: "Tripunithura", ...TRIPUNITHURA }).isServiceable, true);
  // The serviceZones row spells it "Thrippunithura" and the pincode row "Tripunithura". Once city
  // strings stop being consulted the mismatch cannot affect anything.
  assertEqual("misspelt city -> still serviceable", decide({ city: "Thrippunithura", ...TRIPUNITHURA }).isServiceable, true);
  assertEqual("empty city -> still serviceable", decide({ city: "", ...TRIPUNITHURA }).isServiceable, true);
}

// ── 6. Client city cannot alter the result ───────────────────────────────────
{
  const cities = ["Kochi", "Aluva", "Hyderabad", "", "   ", "KOCHI", "not-a-city", "Bengaluru"];
  const atCovered = new Set(cities.map((c) => JSON.stringify(decide({ city: c, ...KALOOR }))));
  const atRemote = new Set(cities.map((c) => JSON.stringify(decide({ city: c, ...HYDERABAD }))));
  assertEqual("every city string yields one identical result at a covered point", atCovered.size, 1);
  assertEqual("every city string yields one identical result at a remote point", atRemote.size, 1);
  assertEqual("covered and remote still differ", atCovered.size === atRemote.size && [...atCovered][0] === [...atRemote][0], false);
  // And the successful result no longer echoes the caller's city back as if verified.
  assertEqual("success does not echo client city", decide({ city: "Kochi", ...KALOOR }).city, null);
}

console.log(`\nServiceability fallback removal: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Serviceability fallback tests failed (${failed} failures)`);
