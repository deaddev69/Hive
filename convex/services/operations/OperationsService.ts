import { ResolvedProduct } from "../content/types";
import { haversineKm } from "../../lib/serviceability";

export class OperationsService {
  /**
   * Applies operational logistics (Distance & ETA) to a batch of catalog products.
   * Modifies and returns the resolved products with operation metrics.
   */
  static async enrichWithDeliveryLogistics(
    ctx: any,
    products: ResolvedProduct[],
    userContext?: { lat?: number; lng?: number; city?: string }
  ): Promise<ResolvedProduct[]> {
    if (!userContext || userContext.lat === undefined || userContext.lng === undefined) {
      return products; // No location provided, skip operational filtering
    }

    const startLat = Math.round(userContext.lat * 1000) / 1000;
    const startLng = Math.round(userContext.lng * 1000) / 1000;

    // Fetch cached distances once for this user location
    const cachedDistances = await ctx.db
      .query("cachedRoadDistances")
      .withIndex("by_start_end", (q: any) => q.eq("startLat", startLat).eq("startLng", startLng))
      .collect();

    const cacheMap = new Map<string, { distanceKm: number; durationMin: number }>();
    for (const cd of cachedDistances) {
      const key = `${cd.endLat.toFixed(6)},${cd.endLng.toFixed(6)}`;
      cacheMap.set(key, { distanceKm: cd.distanceKm, durationMin: cd.durationMin });
    }

    const boutiqueIds = Array.from(new Set(products.map((p) => p.boutiqueId)));
    const boutiques = await Promise.all(boutiqueIds.map((id) => ctx.db.get(id)));
    const boutiqueMap = new Map(boutiques.filter(Boolean).map((b: any) => [b._id.toString(), b]));

    return products.map((dto) => {
      const boutique = boutiqueMap.get(dto.boutiqueId);
      if (!boutique || boutique.latitude === undefined || boutique.longitude === undefined) {
        return dto;
      }

      const bLat = boutique.latitude;
      const bLng = boutique.longitude;
      const cacheKey = `${bLat.toFixed(6)},${bLng.toFixed(6)}`;
      const cached = cacheMap.get(cacheKey);

      let distanceKm = 0;
      let durationMin = 0;

      if (cached) {
        distanceKm = cached.distanceKm;
        durationMin = cached.durationMin;
      } else {
        distanceKm = haversineKm(startLat, startLng, bLat, bLng);
        durationMin = (distanceKm / 25) * 60; // rough heuristic
      }

      const prepTime = boutique.prepTimeMinutes ?? 30;
      const etaMinutes = Math.round(durationMin + prepTime);

      // Mutate DTO
      dto.distanceKm = distanceKm;
      dto.etaMinutes = etaMinutes;

      return dto;
    });
  }
}
