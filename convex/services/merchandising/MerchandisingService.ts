import { ResolvedProduct } from "../content/types";

export class MerchandisingService {
  /**
   * Applies merchandising logic: scoring, ranking, and badges.
   */
  static enrichWithMerchandising(
    products: ResolvedProduct[]
  ): ResolvedProduct[] {
    return products.map((product) => {
      // 1. Base Score calculation (ETA + Distance from Operations + Popularity)
      // For now, if ETA/Distance aren't calculated, default them for scoring
      const distanceKm = product.distanceKm ?? 15;
      const etaMinutes = product.etaMinutes ?? 120;

      let etaScore = 0;
      if (etaMinutes <= 45) etaScore = 100;
      else if (etaMinutes <= 90) etaScore = 85;
      else if (etaMinutes <= 120) etaScore = 60;
      else if (etaMinutes <= 180) etaScore = 30;
      else etaScore = 0;

      let distanceScore = 100;
      if (distanceKm > 1.0) {
        distanceScore = Math.max(0, Math.min(100, 100 - ((distanceKm - 1.0) / (15.0 - 1.0)) * 100));
      }

      // We don't have access to full raw product fields like "featured" or "sameDayEligible" easily here without coupling.
      // So we just compute the score based on the operational metrics we have.
      const fulfillmentScore = 100;
      const hiveScore = Math.round(
        0.35 * etaScore +
        0.25 * distanceScore +
        0.40 * fulfillmentScore
      );

      product.hiveScore = hiveScore;

      // 2. Badges
      const badges: string[] = [];
      if (etaMinutes <= 60) badges.push("Fast Delivery");
      if (hiveScore > 90) badges.push("Top Rated");

      product.badges = badges;

      return product;
    }).sort((a, b) => (b.hiveScore ?? 0) - (a.hiveScore ?? 0));
  }
}
