"use client";

import React, { useState, useMemo } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileFilterDrawer, MobileFilterTrigger } from "@/components/catalog/MobileFilterDrawer";
import { CatalogSort, SortDropdown } from "@/components/catalog/CatalogSort";
import { ProductCard } from "@/components/product/ProductCard";
import { mockProducts } from "@/lib/mockProducts";
import {
  CatalogFilterState,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
  applyFilters,
} from "@/lib/catalogFilters";
import {
  ProductSortOption,
  DEFAULT_SORT,
  applySort,
} from "@/lib/catalogSort";
import { Package, AlertCircle, RotateCcw } from "lucide-react";

export default function ProductsPage() {
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTER_STATE);
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeFilterCount = countActiveFilters(filters);

  // Filter then sort — both memoised separately so each step is cheap
  const filteredProducts = useMemo(
    () => applyFilters(mockProducts, filters),
    [filters]
  );
  const sortedProducts = useMemo(
    () => applySort(filteredProducts, sortOption),
    [filteredProducts, sortOption]
  );

  return (
    <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
      {/* ── Page Header ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-white via-[#FFFDF5] to-[#FFF3CC]/20 border-b border-hive-border/60 py-10 lg:py-14">
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.06]">
          <svg className="w-full h-full" aria-hidden="true">
            <defs>
              <pattern id="products-hc" patternUnits="userSpaceOnUse" width="52" height="90">
                <path fill="none" stroke="#F5A623" strokeWidth="1.5"
                  d="m0,15 26-15 26,15v30l-26,15-26-15z M26,60v30" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#products-hc)" />
          </svg>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full flex flex-col gap-4">
          <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-[10px] font-extrabold text-hive-amber bg-hive-gold/10 border border-hive-gold/25 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />
            BOUTIQUE MARKETPLACE
          </span>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-extrabold text-hive-dark tracking-tight">
                All Products
              </h1>
              <p className="text-sm text-hive-text-muted mt-1 max-w-md leading-relaxed">
                Every piece, every occasion — handpicked from verified boutiques near you.
              </p>
            </div>

            {/* Header right: count + mobile controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-hive-gold" />
                <span className="text-xs font-bold text-hive-dark">
                  {sortedProducts.length}{" "}
                  <span className="text-hive-text-muted font-medium">
                    of {mockProducts.length}
                  </span>
                </span>
              </div>

              {/* Mobile controls row */}
              <div className="flex items-center gap-2 lg:hidden">
                <SortDropdown
                  value={sortOption}
                  onChange={setSortOption}
                  compact={true}
                />
                <MobileFilterTrigger
                  activeCount={activeFilterCount}
                  onClick={() => setDrawerOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + grid ── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full flex gap-8 py-8 items-start">

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-[300px] xl:w-[320px] flex-shrink-0">
          <CatalogFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* ── Results bar: count + sort (desktop) ── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-hive-dark">
                {sortedProducts.length}{" "}
                {sortedProducts.length === 1 ? "result" : "results"}
              </span>
              {activeFilterCount > 0 && (
                <>
                  <span className="text-hive-border text-xs">·</span>
                  <span className="text-xs text-hive-text-muted">
                    {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTER_STATE)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-hive-amber hover:text-hive-gold transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                </>
              )}
            </div>

            {/* Sort dropdown — desktop only (compact shown in header on mobile) */}
            <div className="hidden lg:block">
              <SortDropdown value={sortOption} onChange={setSortOption} />
            </div>
          </div>

          {/* ── Grid or empty state ── */}
          {sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 md:gap-6">
              {sortedProducts.map((product, idx) => (
                <div
                  key={`${sortOption}-${product.id}`}
                  className="animate-[cardIn_0.45s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-6 border border-dashed border-hive-border/60 rounded-[32px] bg-hive-cream/5 text-center">
              <div className="p-4 rounded-full bg-hive-comb/20 border border-hive-border/40 text-hive-amber mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-serif text-hive-dark">No products match</h3>
              <p className="text-sm text-hive-text-muted mt-2 max-w-sm leading-relaxed">
                Try adjusting or clearing your filters to discover more boutique designs.
              </p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTER_STATE)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-hive-gold text-hive-dark text-xs font-extrabold uppercase tracking-widest hover:bg-hive-amber transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card entrance animation */}
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Mobile filter drawer */}
      <MobileFilterDrawer
        filters={filters}
        onChange={setFilters}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </CatalogLayout>
  );
}
