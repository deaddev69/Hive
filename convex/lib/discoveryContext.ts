// convex/lib/discoveryContext.ts
// Resolves an untrusted coordinate into a bounded discovery identity.
//
// WHY THIS EXISTS
// Home, Shop and Search are keyed on raw client coordinates today. The client rounds them for
// cache sharing (apps/customer/src/lib/distance.ts), but an attacker does not use the client, so
// the server sees unbounded precision and an unbounded range — every request can be a distinct
// cache key. Normalising alone bounds precision, not range: coordinates anywhere on earth still
// mint distinct keys. Resolving to a service area bounds both, because there is a finite number
// of them and everything else collapses to a single OUT_OF_AREA identity.
//
// WHAT THIS IS NOT
// The 3 km radius is a BOOTSTRAP RESOLVER, not a delivery boundary and not a seller radius.
// Whether an order can actually be delivered is decided per-seller by convex/lib/serviceability.ts
// against that boutique's own deliveryRadiusKm, and nothing here changes that. The threshold was
// chosen from measured geometry of the 22 active pincodes: the largest gap from any point inside
// the served footprint to its nearest centroid was 2.85 km, so 3 km is the smallest round value
// that leaves no hole inside the area already served, while keeping coverage at ~1.9x the known
// footprint rather than inflating it.
//
// When coverage gaps appear, add pincode rows — do not widen this radius. Adding a row is
// evidence-driven and shrinks the gap locally; widening the radius inflates coverage everywhere
// at once and erodes the bound this exists to provide.

import { haversineKm } from "./serviceability";

/** Matches the 3dp rounding the server already applies internally (OperationsService, routing)
 *  and the client applies before sending (apps/customer/src/lib/distance.ts). Because those
 *  consumers already discard this precision, normalising here changes no computed result — it
 *  only collapses the cache keyspace. Keep all four in step. */
const COORD_FACTOR = 1000; // 3 decimal places, ~111 m

/** Bootstrap resolution radius. See the header — this is not a delivery radius. */
export const SERVICE_AREA_RESOLUTION_KM = 3.0;

export interface DiscoveryContext {
  /** zoneCode of the resolved pincode. A discovery identity only — never a pricing or
   *  delivery-term authority. Null when out of area. */
  serviceArea: string | null;
  /** Resolved from the matched pincode row. Never taken from client input. */
  city: string | null;
  /** Normalised coordinates, or null out of area so hostile coordinates collapse to one identity. */
  coords: { lat: number; lng: number } | null;
  isServiceable: boolean;
  resolutionSource?: "PINCODE_CENTROID" | "OUT_OF_AREA";
}

/** The fields this resolver needs from a serviceablePincodes row. */
export interface PincodeCentroid {
  pincode: string;
  city: string;
  lat: number;
  lng: number;
  zoneCode: string;
  active?: boolean;
}

export const OUT_OF_AREA: DiscoveryContext = {
  serviceArea: null,
  city: null,
  coords: null,
  isServiceable: false,
  resolutionSource: "OUT_OF_AREA",
};

/** Rounds one coordinate to the precision every consumer already truncates to. */
export function normalizeCoord(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  return Math.round(value * COORD_FACTOR) / COORD_FACTOR;
}

/**
 * Nearest active centroid to a point, or null when there are no candidates.
 *
 * Filters on `active` here as well as at the query, so the decision is testable without a
 * database and an inactive row can never be selected even if a caller passes an unfiltered list.
 */
export function findNearestCentroid(
  lat: number,
  lng: number,
  centroids: PincodeCentroid[]
): { centroid: PincodeCentroid; distanceKm: number } | null {
  let best: { centroid: PincodeCentroid; distanceKm: number } | null = null;
  for (const c of centroids) {
    if (c.active === false) continue;
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const distanceKm = haversineKm(lat, lng, c.lat, c.lng);
    if (!best || distanceKm < best.distanceKm) best = { centroid: c, distanceKm };
  }
  return best;
}

/**
 * The whole decision, as a pure function, so the resolver's behaviour can be tested without the
 * Convex runtime and the DB wrapper below stays trivial.
 *
 * The threshold comparison is inclusive: a point exactly on the 3 km radius resolves as inside.
 * The radius exists to close a measured 2.85 km interior gap, so the boundary itself belongs to
 * the covered side.
 */
export function buildDiscoveryContext(
  lat: number | null | undefined,
  lng: number | null | undefined,
  centroids: PincodeCentroid[],
  thresholdKm: number = SERVICE_AREA_RESOLUTION_KM
): DiscoveryContext {
  const normLat = normalizeCoord(lat);
  const normLng = normalizeCoord(lng);
  // No usable location is not an error — the shopper simply has no discovery identity yet.
  if (normLat === undefined || normLng === undefined) return OUT_OF_AREA;

  const nearest = findNearestCentroid(normLat, normLng, centroids);
  if (!nearest || nearest.distanceKm > thresholdKm) return OUT_OF_AREA;

  return {
    // Carried straight from the matched pincode. deliveryZones is deliberately NOT consulted:
    // a zone's pricing or same-day flags are commercial terms, not evidence that any geography
    // is covered. Resolution starts from pincodes, so a zone with no pincodes mapped to it
    // (THRISSUR_CORE today) is unreachable by construction rather than by a guard.
    serviceArea: nearest.centroid.zoneCode,
    city: nearest.centroid.city,
    coords: { lat: normLat, lng: normLng },
    isServiceable: true,
    resolutionSource: "PINCODE_CENTROID",
  };
}

/**
 * Thin database wrapper. Takes coordinates only — there is deliberately no `city` parameter, so a
 * client-supplied city cannot influence resolution even by accident. serviceZones is never read:
 * its city-string matching is what allowed a Hyderabad row to report a shopper as serviceable
 * 848 km from the nearest boutique. checkServiceability still uses that fallback and is
 * unchanged here; replacing it is Phase 3.
 */
export async function resolveDiscoveryContext(
  ctx: any,
  args: { lat?: number | null; lng?: number | null }
): Promise<DiscoveryContext> {
  if (args.lat === undefined || args.lat === null || args.lng === undefined || args.lng === null) {
    return OUT_OF_AREA;
  }

  const centroids = (await ctx.db
    .query("serviceablePincodes")
    .withIndex("by_active", (q: any) => q.eq("active", true))
    .collect()) as PincodeCentroid[];

  return buildDiscoveryContext(args.lat, args.lng, centroids);
}
