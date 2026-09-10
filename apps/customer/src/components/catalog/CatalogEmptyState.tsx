import React from "react";
import Link from "next/link";
import { SearchX, RotateCcw, LayoutGrid, MapPin, Clock } from "lucide-react";

export interface CatalogEmptyStateProps {
  onClearFilters: () => void;
  /** Optional accent colour — used for collection pages */
  accentColor?: string;
  /**
   * Why the grid is empty:
   * - "coming_soon": Global category product count is 0.
   * - "location": Products exist globally, but none are serviceable at current known location.
   * - "filters": Products are available in the area, but active user filters yielded 0 results.
   */
  reason?: "coming_soon" | "location" | "filters";
  /** Opens the location drawer. Only used by the "location" reason. */
  onChangeLocation?: () => void;
  /**
   * The category this page is scoped to, when it is a category route. Names what is unavailable
   * instead of leaving a generic line under a specific heading.
   */
  categoryName?: string | null;
}

export const CatalogEmptyState: React.FC<CatalogEmptyStateProps> = ({
  onClearFilters,
  accentColor,
  reason = "filters",
  onChangeLocation,
  categoryName,
}) => {
  const accent = accentColor ?? "#1A1200";

  if (reason === "coming_soon") {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mb-5 text-stone-600">
          <Clock className="w-6 h-6" strokeWidth={1.75} />
        </div>

        <h3 className="text-lg font-bold text-stone-900 tracking-tight mb-2">
          {categoryName ? `${categoryName} — Coming Soon` : "Coming Soon"}
        </h3>
        <p className="text-xs text-stone-500 max-w-xs leading-relaxed mb-6">
          More styles are being added to this collection.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <Link
            href="/products?browse=all"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border border-stone-200 bg-white text-stone-800 hover:border-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-stone-500" strokeWidth={2} />
            Browse All Styles
          </Link>
        </div>
      </div>
    );
  }

  if (reason === "location") {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center">
        {/* Neutral Icon ring */}
        <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mb-5 text-stone-700">
          <MapPin className="w-6 h-6" strokeWidth={1.75} />
        </div>

        <h3 className="text-lg font-bold text-stone-900 tracking-tight mb-2">
          {categoryName
            ? `${categoryName} not available in your area`
            : "Not available in your area"}
        </h3>
        <p className="text-xs text-stone-500 max-w-xs leading-relaxed mb-6">
          Try another location or browse all styles on Hive.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {onChangeLocation && (
            <button
              type="button"
              onClick={onChangeLocation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-stone-900 hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" strokeWidth={2} />
              Change Location
            </button>
          )}

          <Link
            href="/products?browse=all"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border border-stone-200 bg-white text-stone-800 hover:border-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-stone-500" strokeWidth={2} />
            Browse All Styles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Icon ring */}
      <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mb-5 text-stone-600">
        <SearchX className="w-6 h-6" strokeWidth={1.75} />
      </div>

      {/* Copy */}
      <h3 className="text-lg font-bold text-stone-900 tracking-tight mb-2">
        No matching styles
      </h3>
      <p className="text-xs text-stone-500 max-w-xs leading-relaxed mb-6">
        Adjust your filters to see more.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-stone-900 hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
          Clear Filters
        </button>

        <Link
          href="/products?browse=all"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border border-stone-200 bg-white text-stone-800 hover:border-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-stone-500" strokeWidth={2} />
          Browse All Styles
        </Link>
      </div>
    </div>
  );
};
