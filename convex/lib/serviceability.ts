const EARTH_RADIUS_KM = 6371;
const URBAN_DISTANCE_MULTIPLIER = 1.35; // corrects Haversine straight-line for road/water routing
const MAX_ALLOWED_RADIUS_KM = 17; // your business ceiling — no boutique can exceed this
const DEFAULT_RADIUS_KM = 15;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ServiceabilityResult {
  serviceable: boolean;
  distanceKm?: number;
  effectiveDistanceKm?: number;
  radiusKm?: number;
  reason?: string;
}

export function checkServiceability(
  deliveryLat: number | undefined,
  deliveryLng: number | undefined,
  boutique: { latitude?: number; longitude?: number; addressDetails?: { lat?: number; lng?: number }; deliveryRadiusKm?: number }
): ServiceabilityResult {
  // Fail CLOSED: no delivery address provided
  if (deliveryLat === undefined || deliveryLng === undefined || (deliveryLat === 0 && deliveryLng === 0)) {
    return { serviceable: false, reason: "Delivery address coordinates missing." };
  }

  const bLat = boutique.latitude ?? boutique.addressDetails?.lat;
  const bLng = boutique.longitude ?? boutique.addressDetails?.lng;

  // Fail CLOSED: boutique has no coordinates on file — do NOT allow by default
  if (bLat === undefined || bLng === undefined) {
    return { serviceable: false, reason: "Boutique location not configured." };
  }

  // Cap radius at MAX, never silently floor it below the DB value
  const radius = Math.min(boutique.deliveryRadiusKm ?? DEFAULT_RADIUS_KM, MAX_ALLOWED_RADIUS_KM);

  const rawDistance = haversineKm(deliveryLat, deliveryLng, bLat, bLng);
  const effectiveDistance = rawDistance * URBAN_DISTANCE_MULTIPLIER;

  if (effectiveDistance > radius) {
    return {
      serviceable: false,
      distanceKm: rawDistance,
      effectiveDistanceKm: effectiveDistance,
      radiusKm: radius,
      reason: "Address is outside the boutique's delivery radius.",
    };
  }

  return { serviceable: true, distanceKm: rawDistance, effectiveDistanceKm: effectiveDistance, radiusKm: radius };
}
