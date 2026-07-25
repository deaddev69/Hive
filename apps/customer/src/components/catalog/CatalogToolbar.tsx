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
          className="border border-slate-200 bg-white rounded-lg px-4 py-2 text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 shadow-none transition-colors hover:bg-slate-50 cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-slate-900 text-white w-4 h-4 text-[10px] rounded-full flex items-center justify-center flex-shrink-0">
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
