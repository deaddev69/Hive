"use client";

import React, { useState, useMemo, useEffect } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileFilterDrawer } from "@/components/catalog/MobileFilterDrawer";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { CatalogEmptyState } from "@/components/catalog/CatalogEmptyState";
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

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTER_STATE);
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOption]);

  // Paginated products list
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [sortedProducts, currentPage]);

  const clearFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setCurrentPage(1);
  };

  return (
    <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
      {/* 1. Products Page Header (using CatalogHeader with Honeycomb bg) */}
      <div className="relative w-full">
        {/* Subtle decorative background honeycomb pattern */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.06] bg-gradient-to-br from-white via-[#FFFDF5] to-[#FFF3CC]/20">
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

        <CatalogHeader
          title="All Products"
          description="Every piece, every occasion — handpicked from verified boutiques near you."
          resultCount={sortedProducts.length}
          activeFilterCount={activeFilterCount}
          accentColor="#C9A84C"
        />
      </div>

      {/* 2. Body: sidebar + grid */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full flex flex-col gap-6 py-6">
        
        {/* Catalog Toolbar */}
        <CatalogToolbar
          activeFilterCount={activeFilterCount}
          resultCount={sortedProducts.length}
          sortOption={sortOption}
          onChangeSort={setSortOption}
          onOpenMobileFilters={() => setDrawerOpen(true)}
          onClearFilters={clearFilters}
          accentColor="#C9A84C"
          occasions={filters.occasions}
          categories={filters.categories}
          boutiques={filters.boutiques}
        />

        <div className="w-full flex gap-8 items-start">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-[300px] xl:w-[320px] flex-shrink-0">
            <CatalogFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Product Listing Main Slot */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {paginatedProducts.length > 0 ? (
              <>
                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 md:gap-6">
                  {paginatedProducts.map((product, idx) => (
                    <div
                      key={`${sortOption}-${currentPage}-${product.id}`}
                      className="animate-[cardIn_0.45s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

                {/* Catalog Pagination */}
                <CatalogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  resultCount={sortedProducts.length}
                  pageSize={PAGE_SIZE}
                  accentColor="#C9A84C"
                />
              </>
            ) : (
              /* Catalog Empty State */
              <CatalogEmptyState
                onClearFilters={clearFilters}
                accentColor="#C9A84C"
              />
            )}
          </div>
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
