import React from "react";
import { RotateCcw } from "lucide-react";
import { ProductSortOption } from "@/lib/catalogSort";
import { SortDropdown } from "./CatalogSort";
import { CatalogResultsSummary } from "./CatalogResultsSummary";
import { MobileFilterTrigger } from "./MobileFilterDrawer";

export interface CatalogToolbarProps {
  activeFilterCount: number;
  resultCount: number;
  sortOption: ProductSortOption;
  onChangeSort: (sort: ProductSortOption) => void;
  onOpenMobileFilters: () => void;
  onClearFilters?: () => void;
  accentColor?: string;
  /** Resolved category names for the summary pill */
  categoryNames?: string[];
}

export const CatalogToolbar: React.FC<CatalogToolbarProps> = ({
  activeFilterCount,
  resultCount,
  sortOption,
  onChangeSort,
  onOpenMobileFilters,
  onClearFilters,
  accentColor = "#C9A84C",
  categoryNames = [],
}) => {
  return (
    <div className="relative z-40 w-full bg-white/60 backdrop-blur-md border border-hive-border/40 rounded-3xl p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
      {/* Desktop — left: count summary + clear */}
      <div className="hidden md:flex items-center gap-3">
        <CatalogResultsSummary
          count={resultCount}
          categoryNames={categoryNames}
        />

        {activeFilterCount > 0 && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border border-transparent hover:border-hive-border/40 hover:bg-hive-cream/30 text-hive-text-muted hover:text-hive-dark"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
            Reset
          </button>
        )}
      </div>

      {/* Desktop — right: sort */}
      <div className="hidden md:block">
        <SortDropdown value={sortOption} onChange={onChangeSort} />
      </div>

      {/* Mobile — filter trigger + sort */}
      <div className="flex md:hidden items-center gap-2.5 w-full">
        <div className="flex-1">
          <MobileFilterTrigger
            activeCount={activeFilterCount}
            onClick={onOpenMobileFilters}
          />
        </div>
        <div className="flex-1 flex justify-end">
          <SortDropdown
            value={sortOption}
            onChange={onChangeSort}
            compact={true}
            className="w-full [&>button]:w-full [&>button]:justify-between"
          />
        </div>
      </div>
    </div>
  );
};
