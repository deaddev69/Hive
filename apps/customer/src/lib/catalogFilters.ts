// ─────────────────────────────────────────────────────────────────────────────
// CatalogFilterState — single source of truth for all catalog filters.
// Filtering happens server-side via Convex getActiveProducts query.
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogFilterState {
  /** Array of category DB IDs (from Convex categories table) */
  categories: string[];
  minPrice: number;
  maxPrice: number;
  sameDayDelivery: boolean;
}

export const DEFAULT_FILTER_STATE: CatalogFilterState = {
  categories: [],
  minPrice: 0,
  maxPrice: 10000,
  sameDayDelivery: false,
};

export const PRICE_MIN = 0;
export const PRICE_MAX = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — count active filters (for the mobile badge)
// ─────────────────────────────────────────────────────────────────────────────

export function countActiveFilters(filters: CatalogFilterState): number {
  let count = 0;
  count += filters.categories.length;
  if (filters.sameDayDelivery) count += 1;
  if (filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX) count += 1;
  return count;
}
