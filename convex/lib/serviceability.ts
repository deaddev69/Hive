// convex/lib/serviceability.ts
// Single source of truth for delivery-location serviceability checks.
// All distance/radius checks across the codebase should import from here.

const EARTH_RADIUS_KM = 6371;
const DEFAULT_RADIUS_KM = 13;

/**
 * Straight-line distance systematically understates how far a rider actually travels. Measured
 * against this deployment's own cachedRoadDistances rows, the road/straight-line ratio across
 * Kochi ranges 1.23–1.96 (median ≈ 1.5) — the backwaters and limited bridge crossings push it
 * well past the ~1.3 rule of thumb that holds in grid-planned cities.
 *
 * Applying this factor when no measured road distance is available keeps the radius check
 * honest: a boutique 8km away in a straight line can easily be 15km by road, and admitting it
 * into a 13km delivery radius means promising a 90-minute delivery that cannot be met.
 * Erring toward under-promising is the correct direction for a delivery guarantee.
 */
export const ROAD_DISTANCE_MULTIPLIER = 1.5;

/**
 * Best available estimate of road distance. Prefers a measured value when one exists, otherwise
 * scales the straight-line distance. Every radius/serviceability decision should go through this
 * so the header's "we deliver here" answer and the product filter cannot disagree.
 */
export function estimatedRoadKm(straightLineKm: number, measuredRoadKm?: number | null): number {
  if (measuredRoadKm !== undefined && measuredRoadKm !== null) return measuredRoadKm;
  return straightLineKm * ROAD_DISTANCE_MULTIPLIER;
}

/**
 * Haversine formula — returns the great-circle (straight-line) distance
 * between two coordinate pairs in kilometres.
 *
 * This is the ONLY Haversine implementation in the codebase.
 * All other files should import this function instead of defining their own.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolves boutique coordinates from either top-level fields or the
 * addressDetails fallback. Returns undefined if no coordinates are available.
 */
export function resolveBoutiqueCoords(
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number } } | null | undefined
): { lat: number; lng: number } | undefined {
  if (!boutique) return undefined;
  const lat = boutique.latitude ?? boutique.addressDetails?.lat;
  const lng = boutique.longitude ?? boutique.addressDetails?.lng;
  if (lat === undefined || lng === undefined) return undefined;
  return { lat, lng };
}

/**
 * Quick boolean check: is the user within the boutique's delivery radius?
 * Uses Haversine distance with the addressDetails fallback for boutique coords.
 *
 * Returns false if either the user or boutique has no coordinates.
 */
export function isWithinDeliveryRadius(
  userLat: number | undefined | null,
  userLng: number | undefined | null,
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number }; deliveryRadiusKm?: number } | null | undefined
): boolean {
  if (!boutique) return false;
  if (userLat == null || userLng == null || (userLat === 0 && userLng === 0)) return false;
  const coords = resolveBoutiqueCoords(boutique);
  if (!coords) return false;
  // Scaled to an estimated road distance so this matches what OperationsService decides when it
  // filters products. Previously this compared raw straight-line distance while the product
  // filter used measured road distance where cached, so the header could claim a location was
  // serviceable while every product from that boutique was filtered out (or the reverse).
  const dist = estimatedRoadKm(haversineKm(userLat, userLng, coords.lat, coords.lng));
  return dist <= (boutique.deliveryRadiusKm ?? DEFAULT_RADIUS_KM);
}

export interface ServiceabilityResult {
  serviceable: boolean;
  distanceKm?: number;
  radiusKm?: number;
  reason?: string;
}

/**
 * Full serviceability check with detailed result.
 * Used by PurchaseActions, orders, and payments for richer error reporting.
 *
 * Uses raw Haversine distance (no multiplier) — matching all other callsites.
 * The boutique's deliveryRadiusKm is trusted at face value (cap enforced at
 * write-time in boutique registration/update, not here).
 */
export function checkServiceability(
  deliveryLat: number | undefined | null,
  deliveryLng: number | undefined | null,
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number }; deliveryRadiusKm?: number } | null | undefined
): ServiceabilityResult {
  if (!boutique) {
    return { serviceable: false, reason: "Boutique location not configured." };
  }
  // Fail CLOSED: no delivery address provided
  if (deliveryLat == null || deliveryLng == null || (deliveryLat === 0 && deliveryLng === 0)) {
    return { serviceable: false, reason: "Delivery address coordinates missing." };
  }

  const coords = resolveBoutiqueCoords(boutique);

  // Fail CLOSED: boutique has no coordinates on file — do NOT allow by default
  if (!coords) {
    return { serviceable: false, reason: "Boutique location not configured." };
  }

  const radius = boutique.deliveryRadiusKm ?? DEFAULT_RADIUS_KM;
  // Scaled to estimated road distance, matching isWithinDeliveryRadius and OperationsService.
  // Comparing raw straight-line here while the browse/filter path compared road distance made
  // this gate the LOOSER of the two: a boutique hidden from the catalogue as out-of-range could
  // still be ordered from via a direct product link.
  const distance = estimatedRoadKm(haversineKm(deliveryLat, deliveryLng, coords.lat, coords.lng));

  if (distance > radius) {
    return {
      serviceable: false,
      distanceKm: distance,
      radiusKm: radius,
      reason: "Address is outside the boutique's delivery radius.",
    };
  }

  return { serviceable: true, distanceKm: distance, radiusKm: radius };
}
