// apps/customer/src/lib/catalogEmptyState.ts
//
// Three-state empty reason resolution for the catalog grid.
// Bridges CategoryHierarchy counts with CatalogEmptyState.

export type EmptyStateReason = "coming_soon" | "location" | "filters";

export interface ResolveEmptyStateReasonArgs {
  currentGlobalCount: number | null;
  currentServiceableCount: number | null;
  hasKnownLocation: boolean;
}

/**
 * Resolves the empty state reason for the catalog grid.
 *
 * Rules:
 * 1. Global zero (globalCount === 0) -> "coming_soon"
 *    The category genuinely has zero styles anywhere on Hive (e.g. Anarkalis).
 * 2. Location zero (globalCount > 0 && hasKnownLocation && serviceableCount === 0) -> "location"
 *    Products exist globally, the customer's location is known, but no boutique delivers here.
 * 3. User filter zero -> "filters"
 *    Products are serviceable, but active user filters (price range, occasion, etc.) produced 0 matches.
 *    Also applies if location is unknown/browseAll and user filters match nothing.
 */
export function resolveEmptyStateReason({
  currentGlobalCount,
  currentServiceableCount,
  hasKnownLocation,
}: ResolveEmptyStateReasonArgs): EmptyStateReason {
  // 1. If global count is genuinely 0, this category has no products anywhere -> Coming Soon
  if (currentGlobalCount !== null && currentGlobalCount === 0) {
    return "coming_soon";
  }

  // 2. If products exist globally, the customer's location is known, but 0 are serviceable here -> Not available in your area
  if (
    hasKnownLocation &&
    currentGlobalCount !== null &&
    currentGlobalCount > 0 &&
    currentServiceableCount === 0
  ) {
    return "location";
  }

  // 3. Otherwise: products are available in the area, but current user filters produced 0 matches
  return "filters";
}
