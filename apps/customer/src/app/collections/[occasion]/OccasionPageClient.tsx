"use client";

import React, { useState, useMemo } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileFilterDrawer, MobileFilterTrigger } from "@/components/catalog/MobileFilterDrawer";
import { ProductCard } from "@/components/product/ProductCard";
import { mockProducts } from "@/lib/mockProducts";
import { Collection } from "@/lib/mockCollections";
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
import { SortDropdown } from "@/components/catalog/CatalogSort";
import { ArrowLeft, AlertCircle, RotateCcw, LayoutGrid } from "lucide-react";
import Link from "next/link";

interface OccasionPageClientProps {
  collection: Collection;
}

export function OccasionPageClient({ collection }: OccasionPageClientProps) {
  const [filters, setFilters] = useState<CatalogFilterState>({
    ...DEFAULT_FILTER_STATE,
    occasions: [collection.label],
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
    setFilters({ ...DEFAULT_FILTER_STATE, occasions: [collection.label] });

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Collections", href: "/collections" },
        { label: collection.title },
      ]}
    >
      {/* ── Collection Hero Banner ── */}
      <div className="relative w-full overflow-hidden">
        <div className="relative h-[260px] md:h-[340px] w-full">
          <img
            src={collection.imageUrl}
            alt={collection.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-hive-dark/80 via-hive-dark/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-hive-dark/60 via-transparent to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end pb-8 px-6 lg:px-8 max-w-[1440px] mx-auto w-full">
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-semibold uppercase tracking-widest mb-4 transition-colors group self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Collections
            </Link>

            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none">{collection.icon}</span>
                  <span className="text-[10px] font-extrabold text-hive-gold uppercase tracking-[0.2em]">
                    Boutique Collection
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-extrabold text-white tracking-tight leading-tight">
                  {collection.title}
                </h1>
                <p className="text-sm text-white/70 max-w-md leading-relaxed">
                  {collection.longDescription}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-3xl font-serif font-extrabold text-hive-gold">
                  {collection.productCount}
                </span>
                <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                  Pieces
                </span>
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

        {/* Right: results header + grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Results bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-hive-text-muted" />
              <span className="text-sm font-semibold text-hive-dark">
                {sortedProducts.length} {sortedProducts.length === 1 ? "result" : "results"}
              </span>
              {activeCount > 0 && (
                <span className="text-xs text-hive-text-muted">
                  · {activeCount} filter{activeCount > 1 ? "s" : ""} active
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={resetToCollection}
                  className="inline-flex items-center gap-1 text-xs font-bold text-hive-amber hover:text-hive-gold transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
              {/* Desktop sort */}
              <div className="hidden lg:block">
                <SortDropdown value={sortOption} onChange={setSortOption} />
              </div>
              {/* Mobile: sort + filter trigger */}
              <div className="flex items-center gap-2 lg:hidden">
                <SortDropdown value={sortOption} onChange={setSortOption} compact />
                <MobileFilterTrigger
                  activeCount={activeCount}
                  onClick={() => setDrawerOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Grid or empty state */}
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
              <h3 className="text-lg font-bold font-serif text-hive-dark">No results</h3>
              <p className="text-sm text-hive-text-muted mt-2 max-w-sm leading-relaxed">
                Try adjusting your filters.
              </p>
              <button
                type="button"
                onClick={resetToCollection}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-hive-gold text-hive-dark text-xs font-extrabold uppercase tracking-widest hover:bg-hive-amber transition-colors"
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
