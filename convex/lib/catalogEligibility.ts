// convex/lib/catalogEligibility.ts
//
// Canonical rules for product eligibility and location serviceability across discovery surfaces.
// Shared by getCatalogPage (products.ts) and getCategoryHierarchy (categories.ts) so counts
// and product results stay strictly consistent.

import { getBoutiqueStatus } from "../shared/boutiqueStatus";
import { resolveServiceability } from "./serviceability";

/**
 * Computes total available stock across all sizes for a product.
 */
export function getTotalStock(stockBySize?: Record<string, number>): number {
  if (!stockBySize) return 0;
  return Object.values(stockBySize).reduce((sum, val) => sum + val, 0);
}

/**
 * Checks if an approved boutique is currently open / accepting orders for general catalogue browsing.
 * In general browse, hide boutiques that are permanently paused/closed.
 */
export function isBoutiqueOpenForCatalog(
  boutique: any,
  now: number = Date.now(),
): boolean {
  if (!boutique) return false;
  const status = getBoutiqueStatus(boutique, now);
  return (
    status.type === "OPEN" ||
    status.type === "CLOSED_TODAY" ||
    status.type === "CLOSED_EXTENDED"
  );
}

/**
 * Evaluates whether a product meets all canonical eligibility criteria for the general catalogue:
 * 1. Product is marked active
 * 2. Product is not hidden by admin
 * 3. Product approval status is approved (or unset on legacy items)
 * 4. Product's boutique is approved
 * 5. Product's boutique is currently open/operational (unless browsing a specific boutique's store)
 * 6. Product has positive physical stock
 */
export function isProductGloballyEligible(
  product: any,
  boutique: any,
  options?: { isSpecificBoutique?: boolean; now?: number },
): boolean {
  if (!product || !product.active) return false;
  if (product.adminHidden === true) return false;
  if (product.approvalStatus && product.approvalStatus !== "approved")
    return false;
  if (!boutique || boutique.status !== "APPROVED") return false;
  if (
    !options?.isSpecificBoutique &&
    !isBoutiqueOpenForCatalog(boutique, options?.now ?? Date.now())
  ) {
    return false;
  }
  if (getTotalStock(product.stockBySize) <= 0) return false;
  return true;
}

/**
 * Resolves the set of boutique IDs that can deliver to the specified coordinates.
 * Consults cachedRoadDistances and applies resolveServiceability.
 */
export async function resolveDeliverableBoutiqueIds(
  ctx: { db: any },
  userLat: number,
  userLng: number,
  approvedBoutiques: any[],
): Promise<Set<string>> {
  const startLat = Math.round(userLat * 1000) / 1000;
  const startLng = Math.round(userLng * 1000) / 1000;

  const cachedDistances = await ctx.db
    .query("cachedRoadDistances")
    .withIndex("by_start_end", (q: any) =>
      q.eq("startLat", startLat).eq("startLng", startLng),
    )
    .collect();

  const cacheMap = new Map<
    string,
    { distanceKm: number; durationMin: number }
  >();
  for (const cd of cachedDistances) {
    const key = `${cd.endLat.toFixed(6)},${cd.endLng.toFixed(6)}`;
    cacheMap.set(key, {
      distanceKm: cd.distanceKm,
      durationMin: cd.durationMin,
    });
  }

  const deliverableBoutiqueIds = new Set<string>();

  for (const b of approvedBoutiques) {
    const bLat = b.latitude ?? b.addressDetails?.lat;
    const bLng = b.longitude ?? b.addressDetails?.lng;
    if (bLat === undefined || bLng === undefined) continue;

    const cacheKey = `${bLat.toFixed(6)},${bLng.toFixed(6)}`;
    const cached = cacheMap.get(cacheKey);

    const decision = resolveServiceability(userLat, userLng, b, {
      measuredRoadKm: cached ? cached.distanceKm : null,
    });

    if (decision.status === "serviceable") {
      deliverableBoutiqueIds.add(b._id);
    }
  }

  return deliverableBoutiqueIds;
}
