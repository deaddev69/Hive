// ─────────────────────────────────────────────────────────────────────────────
// CatalogSort — types, option metadata, and pure sort function.
// Architecture: applySort() is a pure function today; in Phase 6+ it becomes
// an `orderBy` argument passed to a Convex useQuery paginated query.
// ─────────────────────────────────────────────────────────────────────────────

import { ProductCardData } from "./mockProducts";

export type ProductSortOption =
  | "priceAsc"
  | "priceDesc"
  | "trending"
  | "nearby";

export const DEFAULT_SORT: ProductSortOption = "trending";

export interface SortOptionMeta {
  id: ProductSortOption;
  label: string;
  shortLabel: string; // compact label shown in the trigger button
  description: string;
  icon: string; // lucide icon name (resolved in SortDropdown)
}

export const SORT_OPTIONS: SortOptionMeta[] = [
  {
    id: "trending",
    label: "Trending",
    shortLabel: "Trending",
    description: "Most popular right now",
    icon: "TrendingUp",
  },
  {
    id: "nearby",
    label: "Nearby & Fastest Delivery",
    shortLabel: "Nearby",
    description: "Nearest designers first",
    icon: "MapPin",
  },
  {
    id: "priceAsc",
    label: "Price: Low to High",
    shortLabel: "Price: Low to High",
    description: "Affordable pieces first",
    icon: "ArrowUpFromLine",
  },
  {
    id: "priceDesc",
    label: "Price: High to Low",
    shortLabel: "Price: High to Low",
    description: "Premium pieces first",
    icon: "ArrowDownFromLine",
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
    case "priceAsc":
      return sorted.sort((a, b) => a.price - b.price);

    case "priceDesc":
      return sorted.sort((a, b) => b.price - a.price);

    case "nearby":
      return sorted.sort((a, b) => {
        const aDist = (a as any).estimatedDistanceKm ?? 9999;
        const bDist = (b as any).estimatedDistanceKm ?? 9999;
        if (aDist !== bDist) {
          return aDist - bDist;
        }
        const aScore = (a as any).hiveScore ?? 0;
        const bScore = (b as any).hiveScore ?? 0;
        return bScore - aScore;
      });

    case "trending":
    default:
      if (products.length < 50) {
        return sorted.sort((a, b) => {
          // Launch Curation Sorting Optimization: Prioritize new arrivals and curated/staff picks
          const aNew = a.isNewArrival ? 1 : 0;
          const bNew = b.isNewArrival ? 1 : 0;
          if (aNew !== bNew) {
            return bNew - aNew;
          }

          const aCurated = (a.isTrending ? 1 : 0) + (a.isBestSeller ? 1 : 0);
          const bCurated = (b.isTrending ? 1 : 0) + (b.isBestSeller ? 1 : 0);
          if (aCurated !== bCurated) {
            return bCurated - aCurated;
          }

          // Stable fallback
          const aScore = a.hiveScore ?? 0;
          const bScore = b.hiveScore ?? 0;
          return bScore - aScore;
        });
      }
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
  }
}

/** Get meta for a single sort option */
export function getSortMeta(id: ProductSortOption): SortOptionMeta {
  return SORT_OPTIONS.find((o) => o.id === id)!;
}
