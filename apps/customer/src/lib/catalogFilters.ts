// ─────────────────────────────────────────────────────────────────────────────
// CatalogFilterState — single source of truth for all catalog filters.
// Designed to drop-in replace with a Convex query when backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogFilterState {
  occasions: string[];
  categories: string[];
  boutiques: string[];
  minPrice: number;
  maxPrice: number;
  sameDayDelivery: boolean;
}

export const DEFAULT_FILTER_STATE: CatalogFilterState = {
  occasions: [],
  categories: [],
  boutiques: [],
  minPrice: 0,
  maxPrice: 10000,
  sameDayDelivery: false,
};

export const PRICE_MIN = 0;
export const PRICE_MAX = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Static filter option lists
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export const OCCASION_OPTIONS: FilterOption[] = [
  { id: "wedding", label: "Wedding Guest", icon: "💍", count: 34 },
  { id: "festival", label: "Festival", icon: "🎉", count: 28 },
  { id: "workwear", label: "Work Wear", icon: "💼", count: 19 },
  { id: "party", label: "Party Night", icon: "🥂", count: 22 },
  { id: "casual", label: "Casual Day", icon: "☀️", count: 41 },
  { id: "date", label: "Date Night", icon: "🌹", count: 17 },
  { id: "ethnic", label: "Ethnic", icon: "🪔", count: 38 },
  { id: "coords", label: "Co-ords", icon: "✨", count: 15 },
];

export const CATEGORY_OPTIONS: FilterOption[] = [
  { id: "sarees", label: "Sarees", count: 32 },
  { id: "kurtis", label: "Kurtis", count: 28 },
  { id: "lehengas", label: "Lehengas", count: 14 },
  { id: "dresses", label: "Dresses", count: 21 },
  { id: "coords", label: "Co-ords", count: 15 },
  { id: "tops", label: "Tops", count: 19 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — count active filters (for the mobile badge)
// ─────────────────────────────────────────────────────────────────────────────

export function countActiveFilters(filters: CatalogFilterState): number {
  let count = 0;
  count += filters.occasions.length;
  count += filters.categories.length;
  count += filters.boutiques.length;
  if (filters.sameDayDelivery) count += 1;
  if (filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX) count += 1;
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side product filtering (replace with Convex query in Phase 6+)
// ─────────────────────────────────────────────────────────────────────────────

import { ProductCardData } from "./mockProducts";

export function applyFilters(
  products: ProductCardData[],
  filters: CatalogFilterState
): ProductCardData[] {
  return products.filter((p) => {
    // Occasion filter
    if (
      filters.occasions.length > 0 &&
      p.occasion &&
      !filters.occasions.includes(p.occasion)
    ) {
      return false;
    }

    // Price range filter
    if (p.price < filters.minPrice || p.price > filters.maxPrice) {
      return false;
    }

    // Same-day delivery filter
    if (filters.sameDayDelivery && !p.sameDayDelivery) {
      return false;
    }

    // Boutique filter — matches boutiqueName against boutique IDs via name
    // (In future Convex: match by boutique FK)
    if (filters.boutiques.length > 0) {
      // Using boutiqueName as proxy until DB join is available
      const normalised = p.boutiqueName.toLowerCase().replace(/\s+/g, "-");
      if (!filters.boutiques.some((b) => normalised.includes(b.toLowerCase()))) {
        return false;
      }
    }

    return true;
  });
}
