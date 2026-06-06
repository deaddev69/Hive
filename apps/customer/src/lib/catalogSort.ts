// ─────────────────────────────────────────────────────────────────────────────
// CatalogSort — types, option metadata, and pure sort function.
// Architecture: applySort() is a pure function today; in Phase 6+ it becomes
// an `orderBy` argument passed to a Convex useQuery paginated query.
// ─────────────────────────────────────────────────────────────────────────────

import { ProductCardData } from "./mockProducts";

export type ProductSortOption =
  | "newest"
  | "priceAsc"
  | "priceDesc"
  | "rating"
  | "trending"
  | "sameDay";

export const DEFAULT_SORT: ProductSortOption = "newest";

export interface SortOptionMeta {
  id: ProductSortOption;
  label: string;
  shortLabel: string; // compact label shown in the trigger button
  description: string;
  icon: string; // lucide icon name (resolved in SortDropdown)
}

export const SORT_OPTIONS: SortOptionMeta[] = [
  {
    id: "newest",
    label: "Newest Arrivals",
    shortLabel: "Newest",
    description: "Recently added boutique pieces first",
    icon: "Sparkles",
  },
  {
    id: "priceAsc",
    label: "Price: Low → High",
    shortLabel: "Price ↑",
    description: "Affordable pieces first",
    icon: "ArrowUpFromLine",
  },
  {
    id: "priceDesc",
    label: "Price: High → Low",
    shortLabel: "Price ↓",
    description: "Premium pieces first",
    icon: "ArrowDownFromLine",
  },
  {
    id: "rating",
    label: "Best Rated",
    shortLabel: "Top Rated",
    description: "Highest customer ratings first",
    icon: "Star",
  },
  {
    id: "trending",
    label: "Trending",
    shortLabel: "Trending",
    description: "Most popular right now",
    icon: "TrendingUp",
  },
  {
    id: "sameDay",
    label: "Same Day Delivery",
    shortLabel: "Same Day",
    description: "Delivered today, eligible pieces first",
    icon: "Truck",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure sort function — swap for Convex orderBy in Phase 6+
// ─────────────────────────────────────────────────────────────────────────────

export function applySort(
  products: ProductCardData[],
  sortOption: ProductSortOption
): ProductCardData[] {
  const sorted = [...products]; // avoid mutating original

  switch (sortOption) {
    case "newest":
      // isNewArrival products first, then isTrending, else natural order
      return sorted.sort((a, b) => {
        const aScore = (a.isNewArrival ? 2 : 0) + (a.isTrending ? 1 : 0);
        const bScore = (b.isNewArrival ? 2 : 0) + (b.isTrending ? 1 : 0);
        return bScore - aScore;
      });

    case "priceAsc":
      return sorted.sort((a, b) => a.price - b.price);

    case "priceDesc":
      return sorted.sort((a, b) => b.price - a.price);

    case "rating":
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    case "trending":
      return sorted.sort((a, b) => {
        const aScore =
          (a.isTrending ? 3 : 0) +
          (a.isBestSeller ? 2 : 0) +
          (a.reviewCount ?? 0) / 100;
        const bScore =
          (b.isTrending ? 3 : 0) +
          (b.isBestSeller ? 2 : 0) +
          (b.reviewCount ?? 0) / 100;
        return bScore - aScore;
      });

    case "sameDay":
      // same-day eligible first, then by price ascending
      return sorted.sort((a, b) => {
        if (a.sameDayDelivery === b.sameDayDelivery) {
          return a.price - b.price;
        }
        return a.sameDayDelivery ? -1 : 1;
      });

    default:
      return sorted;
  }
}

/** Get meta for a single sort option */
export function getSortMeta(id: ProductSortOption): SortOptionMeta {
  return SORT_OPTIONS.find((o) => o.id === id)!;
}
