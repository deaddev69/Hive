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
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { ProductCardData } from "@/lib/mockProducts";
import { CollectionDetails } from "@/lib/mockCollections";
import { Loader2 } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import {
  CatalogFilterState,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
  PRICE_MIN,
  PRICE_MAX,
} from "@/lib/catalogFilters";
import {
  ProductSortOption,
  DEFAULT_SORT,
  applySort,
} from "@/lib/catalogSort";
import { Id } from "../../../../../../convex/_generated/dataModel";

interface OccasionPageClientProps {
  details: CollectionDetails;
}

const PAGE_SIZE = 12;

// Helper to deduce occasion from product tags/description
function getProductOccasion(product: any): string {
  const catName = (product.categoryName || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();

  if (name.includes("wedding") || desc.includes("wedding") || name.includes("lehenga") || catName.includes("lehengas")) return "wedding";
  if (name.includes("festival") || desc.includes("festival") || name.includes("saree") || catName.includes("sarees")) return "festival";
  if (name.includes("co-ord") || name.includes("coord") || catName.includes("coords") || catName.includes("co-ord")) return "coords";
  if (name.includes("kurta") || name.includes("kurti") || catName.includes("kurtis")) return "ethnic";
  if (name.includes("party") || desc.includes("party")) return "party";
  if (name.includes("date") || desc.includes("date") || name.includes("dress") || catName.includes("dresses")) return "date";
  if (name.includes("work") || name.includes("office")) return "workwear";
  return "casual";
}

// Helper to map DB product to ProductCardData interface
function mapDbProduct(p: any): ProductCardData & { sizes: string[]; stockBySize: Record<string, number> } {
  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || "",
    price,
    compareAtPrice,
    rating: 4.8,
    reviewCount: 12,
    occasion: getProductOccasion(p),
    isVerifiedBoutique: p.boutique?.verified || false,
    isNewArrival: Date.now() - p.createdAt < 7 * 24 * 60 * 60 * 1000,
    isTrending: p.featured,
    isBestSeller: p.featured,
    sameDayDelivery: p.sameDayEligible,
    videoAvailable: p.images?.length > 1,
    favorite: false,
    sizes: p.sizes || ["Free"],
    stockBySize: p.stockBySize || { Free: 5 },
  };
}

export function OccasionPageClient({ details }: OccasionPageClientProps) {
  const { latitude, longitude } = useLocation();

  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTER_STATE);
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch DB categories for resolving names
  const dbCategories = useQuery(api.categories.getCategories, { onlyActive: true });

  // Build query args — backend does filtering by category/price
  const queryArgs = useMemo(() => {
    const args: Record<string, any> = {};
    if (latitude !== null && longitude !== null) {
      args.userLat = latitude;
      args.userLng = longitude;
    }
    if (filters.categories.length > 0) {
      args.categoryIds = filters.categories as Id<"categories">[];
    }
    if (filters.minPrice > PRICE_MIN) args.minPrice = filters.minPrice;
    if (filters.maxPrice < PRICE_MAX) args.maxPrice = filters.maxPrice;
    return args;
  }, [latitude, longitude, filters]);

  const dbProducts = useQuery(api.products.getActiveProducts, queryArgs);

  const activeCount = countActiveFilters(filters);

  // Resolved category names for toolbar summary pill
  const selectedCategoryNames = useMemo(() => {
    if (!dbCategories || filters.categories.length === 0) return [];
    return filters.categories
      .map((id) => dbCategories.find((c) => c._id === id)?.name)
      .filter(Boolean) as string[];
  }, [dbCategories, filters.categories]);

  // Map products
  const products = useMemo(() => (dbProducts || []).map(mapDbProduct), [dbProducts]);

  // Client-side same-day filter + sort
  const filteredProducts = useMemo(() => {
    if (filters.sameDayDelivery) return products.filter((p) => p.sameDayDelivery);
    return products;
  }, [products, filters.sameDayDelivery]);

  const sortedProducts = useMemo(
    () => applySort(filteredProducts, sortOption),
    [filteredProducts, sortOption]
  );

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOption]);

  // Paginated chunk
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [sortedProducts, currentPage]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setCurrentPage(1);
  };

  if (dbProducts === undefined) {
    return (
      <CatalogLayout
        breadcrumbs={[
          { label: "Collections", href: "/collections" },
          { label: details.title },
        ]}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
          <p className="text-sm text-hive-text-muted font-bold font-sans">Loading collection...</p>
        </div>
      </CatalogLayout>
    );
  }

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

      {/* 4. Catalog Header */}
      <div id="collection-grid" className="scroll-mt-6">
        <CatalogHeader
          title={`${details.title} Collection`}
          description={details.editorialCopy}
          resultCount={sortedProducts.length}
          activeFilterCount={activeCount}
          accentColor={details.accentColor}
        />
      </div>

      {/* 5. Sidebar + Grid */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-12 w-full flex flex-col gap-4 sm:gap-6 py-4 sm:py-6">
        <CatalogToolbar
          activeFilterCount={activeCount}
          resultCount={sortedProducts.length}
          sortOption={sortOption}
          onChangeSort={setSortOption}
          onOpenMobileFilters={() => setDrawerOpen(true)}
          onClearFilters={resetFilters}
          accentColor={details.accentColor}
          categoryNames={selectedCategoryNames}
        />

        <div className="w-full flex gap-8 items-start">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-[300px] xl:w-[320px] flex-shrink-0">
            <CatalogFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Product Listing */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {paginatedProducts.length > 0 ? (
              <>
                <div className="relative z-0 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5 md:gap-6">
                  {paginatedProducts.map((product, idx) => (
                    <div
                      key={`${sortOption}-${currentPage}-${product.id}`}
                      className="relative z-0 animate-[collectionCardIn_0.5s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

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
              <CatalogEmptyState
                onClearFilters={resetFilters}
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
