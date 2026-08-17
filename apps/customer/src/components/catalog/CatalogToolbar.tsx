import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { ProductSortOption } from "@/lib/catalogSort";
import { SortDropdown } from "./CatalogSort";

export interface CatalogToolbarProps {
  activeFilterCount: number;
  resultCount: number;
  sortOption: ProductSortOption;
  onChangeSort: (sort: ProductSortOption) => void;
  onOpenMobileFilters: () => void;
  onClearFilters?: () => void;
  accentColor?: string;
  categoryNames?: string[];
}

export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  activeFilterCount,
  resultCount,
  sortOption,
  onChangeSort,
  onOpenMobileFilters,
  onClearFilters,
  accentColor,
  categoryNames,
}) => {
  return (
    <div className="relative z-40 w-full flex items-center justify-between gap-3 my-2">
      {/* Column 1: Filter button */}
      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center gap-2 shadow-2xs transition-all hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Column 2: Sort button */}
      <div className="flex-shrink-0">
        <SortDropdown
          value={sortOption}
          onChange={onChangeSort}
        />
      </div>
    </div>
  );
};
