export interface CachedLocation {
  placeId?: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  timestamp: number;
}

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

// We group locations naturally by rounding coordinates to 4 decimal places
// 4 decimal places is roughly ~11.1 meters at the equator, effectively acting as our radius check.
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

class LocationCache {
  private cache: Map<string, CachedLocation> = new Map();

  set(lat: number, lng: number, data: Omit<CachedLocation, "timestamp">) {
    const key = getCacheKey(lat, lng);
    this.cache.set(key, { ...data, timestamp: Date.now() });
  }

  get(lat: number, lng: number): CachedLocation | null {
    const key = getCacheKey(lat, lng);
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  clear() {
    this.cache.clear();
  }
}

export const browserLocationCache = new LocationCache();
