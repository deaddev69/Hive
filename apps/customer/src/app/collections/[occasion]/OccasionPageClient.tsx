"use client";

import React, { useState, useMemo } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileFilterDrawer, MobileFilterTrigger } from "@/components/catalog/MobileFilterDrawer";
import { SortDropdown } from "@/components/catalog/CatalogSort";
import { CollectionHero } from "@/components/catalog/CollectionHero";
import { CollectionStats } from "@/components/catalog/CollectionStats";
import { CollectionShowcase } from "@/components/catalog/CollectionShowcase";
import { CollectionHeader } from "@/components/catalog/CollectionHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { mockProducts } from "@/lib/mockProducts";
import { CollectionDetails } from "@/lib/mockCollections";
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
import { AlertCircle, RotateCcw } from "lucide-react";

interface OccasionPageClientProps {
  details: CollectionDetails;
}

export function OccasionPageClient({ details }: OccasionPageClientProps) {
  const [filters, setFilters] = useState<CatalogFilterState>({
    ...DEFAULT_FILTER_STATE,
    occasions: [details.label],
  });
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const filteredProducts = useMemo(
    () => applyFilters(mockProducts, filters),
    [filters]
  );
  const sortedProducts = useMemo(
    () => applySort(filteredProducts, sortOption),
    [filteredProducts, sortOption]
  );

  const resetToCollection = () =>
    setFilters({ ...DEFAULT_FILTER_STATE, occasions: [details.label] });

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Collections", href: "/collections" },
        { label: details.title },
      ]}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Phase 5.4: CollectionHero — full-bleed editorial banner             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CollectionHero details={details} />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Phase 5.4: CollectionStats — 4-column stat strip                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CollectionStats details={details} />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Phase 5.4: CollectionShowcase — editorial product/boutique mosaic  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CollectionShowcase details={details} />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Phase 5.4: CollectionHeader — grid section anchor + result count   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CollectionHeader details={details} resultCount={sortedProducts.length} />

      {/* ── Body: sidebar + product grid ── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full flex gap-8 py-8 items-start">

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-[300px] xl:w-[320px] flex-shrink-0">
          <CatalogFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Right: results bar + grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Results bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-hive-dark">
                {sortedProducts.length}{" "}
                {sortedProducts.length === 1 ? "result" : "results"}
              </span>
              {activeCount > 0 && (
                <>
                  <span className="text-hive-border text-xs">·</span>
                  <span className="text-xs text-hive-text-muted">
                    {activeCount} filter{activeCount > 1 ? "s" : ""} active
                  </span>
                  <button
                    type="button"
                    onClick={resetToCollection}
                    className="inline-flex items-center gap-1 text-xs font-bold transition-colors"
                    style={{ color: details.accentColor }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Desktop sort */}
              <div className="hidden lg:block">
                <SortDropdown value={sortOption} onChange={setSortOption} />
              </div>
              {/* Mobile: sort + filter */}
              <div className="flex items-center gap-2 lg:hidden">
                <SortDropdown value={sortOption} onChange={setSortOption} compact />
                <MobileFilterTrigger
                  activeCount={activeCount}
                  onClick={() => setDrawerOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Product grid */}
          {sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 md:gap-6">
              {sortedProducts.map((product, idx) => (
                <div
                  key={`${sortOption}-${product.id}`}
                  className="animate-[collectionCardIn_0.5s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-6 border border-dashed border-hive-border/60 rounded-[32px] bg-hive-cream/5 text-center">
              <div
                className="p-4 rounded-full mb-4"
                style={{ background: `${details.accentColor}15`, color: details.accentColor }}
              >
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-serif text-hive-dark">No results</h3>
              <p className="text-sm text-hive-text-muted mt-2 max-w-sm leading-relaxed">
                Try adjusting your filters to discover more from this collection.
              </p>
              <button
                type="button"
                onClick={resetToCollection}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-extrabold uppercase tracking-widest hover:opacity-90 transition-opacity"
                style={{ background: details.accentColor }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card entrance animation */}
      <style>{`
        @keyframes collectionCardIn {
          from { opacity: 0; transform: translateY(16px); }
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
