/**
 * Haversine formula — returns the great-circle distance between two
 * coordinate pairs in kilometres.
 *
 * @param lat1  Origin latitude  (degrees)
 * @param lng1  Origin longitude (degrees)
 * @param lat2  Target latitude  (degrees)
 * @param lng2  Target longitude (degrees)
 * @returns Distance in kilometres
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns true if the user coordinates are within the boutique's delivery radius.
 */
export function isWithinDeliveryRadius(
  userLat: number,
  userLng: number,
  boutiqueLat: number,
  boutiqueLng: number,
  radiusKm: number
): boolean {
  return calculateDistanceKm(userLat, userLng, boutiqueLat, boutiqueLng) <= radiusKm;
}
