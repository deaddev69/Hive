// ─────────────────────────────────────────────────────────────────────────────
// CatalogFilterState — single source of truth for all catalog filters.
// Filtering happens server-side via Convex getActiveProducts query.
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogFilterState {
  /** Array of category DB IDs (from Convex categories table) */
  categories: string[];
  /** Array of occasion IDs (wedding, festival, workwear, casual, party) */
  occasions: string[];
  minPrice: number;
  maxPrice: number;
  newArrivals: boolean;
}

export const DEFAULT_FILTER_STATE: CatalogFilterState = {
  categories: [],
  occasions: [],
  minPrice: 0,
  maxPrice: 10000,
  newArrivals: false,
};

export const PRICE_MIN = 0;
export const PRICE_MAX = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — count active filters (for the mobile badge)
// ─────────────────────────────────────────────────────────────────────────────

export function countActiveFilters(filters: CatalogFilterState): number {
  let count = 0;
  count += filters.categories.length;
  count += filters.occasions.length;
  if (filters.newArrivals) count += 1;
  if (filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX) count += 1;
  return count;
}
