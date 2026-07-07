// convex/lib/serviceability.ts
// Single source of truth for delivery-location serviceability checks.
// All distance/radius checks across the codebase should import from here.

const EARTH_RADIUS_KM = 6371;
const DEFAULT_RADIUS_KM = 15;

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
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number } }
): { lat: number; lng: number } | undefined {
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
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number }; deliveryRadiusKm?: number }
): boolean {
  if (userLat == null || userLng == null || (userLat === 0 && userLng === 0)) return false;
  const coords = resolveBoutiqueCoords(boutique);
  if (!coords) return false;
  const dist = haversineKm(userLat, userLng, coords.lat, coords.lng);
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
  deliveryLat: number | undefined,
  deliveryLng: number | undefined,
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number }; deliveryRadiusKm?: number }
): ServiceabilityResult {
  // Fail CLOSED: no delivery address provided
  if (deliveryLat === undefined || deliveryLng === undefined || (deliveryLat === 0 && deliveryLng === 0)) {
    return { serviceable: false, reason: "Delivery address coordinates missing." };
  }

  const coords = resolveBoutiqueCoords(boutique);

  // Fail CLOSED: boutique has no coordinates on file — do NOT allow by default
  if (!coords) {
    return { serviceable: false, reason: "Boutique location not configured." };
  }

  const radius = boutique.deliveryRadiusKm ?? DEFAULT_RADIUS_KM;
  const rawDistance = haversineKm(deliveryLat, deliveryLng, coords.lat, coords.lng);

  if (rawDistance > radius) {
    return {
      serviceable: false,
      distanceKm: rawDistance,
      radiusKm: radius,
      reason: "Address is outside the boutique's delivery radius.",
    };
  }

  return { serviceable: true, distanceKm: rawDistance, radiusKm: radius };
}
