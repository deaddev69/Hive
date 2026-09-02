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

/**
 * Decimal places used when a coordinate is sent to Convex as a query argument.
 *
 * Convex caches a query result per exact argument tuple, so passing a raw GPS
 * reading makes every device a distinct cache key and the query is effectively
 * uncacheable. The server already collapses coordinates to this same precision
 * before using them (convex/services/operations/OperationsService.ts:19,
 * convex/products.ts:1180, convex/routing.ts:169), so rounding here changes no
 * result — it only lets shoppers standing in the same ~111 m cell share one
 * cached execution instead of each triggering their own.
 *
 * Keep this identical to the server's `Math.round(v * 1000) / 1000`. If the two
 * ever disagree the caching benefit silently disappears.
 */
const QUERY_COORD_FACTOR = 1000; // 3 decimal places, ~111 m

/**
 * Rounds one coordinate to the precision Convex queries are keyed on. Returns
 * undefined for absent or non-finite input so callers can hand the result
 * straight to an optional query argument.
 */
export function roundCoordForQuery(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  return Math.round(value * QUERY_COORD_FACTOR) / QUERY_COORD_FACTOR;
}

/**
 * Rounds a coordinate pair for use as Convex query arguments.
 *
 * Returns an empty object when either coordinate is missing, so a call site can
 * write `{ ...toQueryCoords(latitude, longitude) }` and cover both the "no
 * location yet" and "location known" cases without a ternary.
 *
 * Use this for cached reactive queries. Do NOT use it for a coordinate the user
 * is storing rather than searching by — a pinned delivery address or a seller's
 * shop location needs full precision.
 */
export function toQueryCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): { userLat: number; userLng: number } | Record<string, never> {
  const userLat = roundCoordForQuery(latitude);
  const userLng = roundCoordForQuery(longitude);
  if (userLat === undefined || userLng === undefined) return {};
  return { userLat, userLng };
}
