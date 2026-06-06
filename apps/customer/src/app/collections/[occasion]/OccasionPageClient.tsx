"use client";

import React, { useState, useMemo, useEffect } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileFilterDrawer } from "@/components/catalog/MobileFilterDrawer";
import { CollectionHero } from "@/components/catalog/CollectionHero";
import { CollectionStats } from "@/components/catalog/CollectionStats";
import { CollectionShowcase } from "@/components/catalog/CollectionShowcase";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { CatalogEmptyState } from "@/components/catalog/CatalogEmptyState";
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

interface OccasionPageClientProps {
  details: CollectionDetails;
}

const PAGE_SIZE = 12;

export function OccasionPageClient({ details }: OccasionPageClientProps) {
  const [filters, setFilters] = useState<CatalogFilterState>({
    ...DEFAULT_FILTER_STATE,
    occasions: [details.label],
  });
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const activeCount = countActiveFilters(filters);

  // Apply filters and sort to products
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

  // Paginated chunk of products
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [sortedProducts, currentPage]);

  const resetToCollection = () => {
    setFilters({ ...DEFAULT_FILTER_STATE, occasions: [details.label] });
    setCurrentPage(1);
  };

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Collections", href: "/collections" },
        { label: details.title },
      ]}
    >
      {/* 1. Collection Hero */}
      <CollectionHero details={details} />

      {/* 2. Collection Stats */}
      <CollectionStats details={details} />

      {/* 3. Collection Showcase */}
      <CollectionShowcase details={details} />

      {/* 4. Catalog Header (anchors the listing block) */}
      <div id="collection-grid" className="scroll-mt-6">
        <CatalogHeader
          title={`${details.title} Collection`}
          description={details.editorialCopy}
          resultCount={sortedProducts.length}
          activeFilterCount={activeCount}
          accentColor={details.accentColor}
        />
      </div>

      {/* 5. Sidebar + Grid Area */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full flex flex-col gap-6 py-6">
        
        {/* Catalog Toolbar */}
        <CatalogToolbar
          activeFilterCount={activeCount}
          resultCount={sortedProducts.length}
          sortOption={sortOption}
          onChangeSort={setSortOption}
          onOpenMobileFilters={() => setDrawerOpen(true)}
          onClearFilters={resetToCollection}
          accentColor={details.accentColor}
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
                      className="animate-[collectionCardIn_0.5s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
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
                  accentColor={details.accentColor}
                />
              </>
            ) : (
              /* Catalog Empty State */
              <CatalogEmptyState
                onClearFilters={resetToCollection}
                accentColor={details.accentColor}
              />
            )}
          </div>
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
