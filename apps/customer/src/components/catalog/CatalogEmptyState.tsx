import React from "react";
import Link from "next/link";
import { SearchX, RotateCcw, LayoutGrid } from "lucide-react";

export interface CatalogEmptyStateProps {
  onClearFilters: () => void;
  /** Optional accent colour — used for collection pages */
  accentColor?: string;
}

export const CatalogEmptyState: React.FC<CatalogEmptyStateProps> = ({
  onClearFilters,
  accentColor,
}) => {
  const accent = accentColor ?? "#C9A84C";

  return (
    <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Icon ring */}
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: `${accent}12`, border: `1.5px dashed ${accent}40` }}
      >
        <SearchX className="w-8 h-8" style={{ color: accent }} strokeWidth={1.5} />
        {/* Animated pulse ring */}
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-10"
          style={{ background: accent }}
        />
      </div>

      {/* Copy */}
      <h3 className="text-xl font-serif font-extrabold text-hive-dark mb-2">
        No products found
      </h3>
      <p className="text-sm text-hive-text-muted max-w-xs leading-relaxed mb-8">
        Try adjusting your filters or browse all products to discover more boutique designs.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold uppercase tracking-widest text-white hover:opacity-90 transition-all duration-200 shadow-md"
          style={{
            background: accent,
            boxShadow: `0 4px 18px ${accent}30`,
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
          Reset Filters
        </button>

        <Link
          href="/products?browse=all"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-hive-border/60 text-hive-dark hover:border-hive-gold/50 hover:bg-hive-comb/10 transition-all duration-200"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-hive-gold" strokeWidth={2} />
          Browse All Products
        </Link>
      </div>
    </div>
  );
};
