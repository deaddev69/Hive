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
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { ProductCardData } from "@/lib/mockProducts";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
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

// Map DB product → ProductCardData
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

export default function ProductsPage() {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-bold">Loading product directory...</p>
      </div>
    }>
      <ProductsCatalog />
    </React.Suspense>
  );
}

function ProductsCatalog() {
  const searchParams = useSearchParams();
  const browseAll = searchParams.get("browse") === "all";

  const { latitude, longitude } = useLocation();

  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTER_STATE);
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const categorySlugFromUrl = searchParams.get("category");

  // Fetch DB categories for resolving names in the toolbar summary
  const dbCategories = useQuery(api.categories.getCategories, { onlyActive: true });

  // When URL ?category=slug changes and categories load, pre-select the matching category
  useEffect(() => {
    if (!dbCategories) return;
    if (!categorySlugFromUrl) {
      // No category in URL — clear category filter but keep other filters
      setFilters((prev) => ({ ...prev, categories: [] }));
      return;
    }
    const match = dbCategories.find(
      (c) => c.slug === categorySlugFromUrl || c.name.toLowerCase().replace(/\s+/g, "-") === categorySlugFromUrl
    );
    if (match) {
      setFilters((prev) => ({ ...prev, categories: [match._id] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlugFromUrl, dbCategories]);

  // Resolve selected category names for the results summary pill
  const selectedCategoryNames = useMemo(() => {
    if (!dbCategories || filters.categories.length === 0) return [];
    return filters.categories
      .map((id) => dbCategories.find((c) => c._id === id)?.name)
      .filter(Boolean) as string[];
  }, [dbCategories, filters.categories]);

  // Build query args — backend does the filtering
  const queryArgs = useMemo(() => {
    const args: Record<string, any> = {};
    if (!browseAll && latitude !== null && longitude !== null) {
      args.userLat = latitude;
      args.userLng = longitude;
    }
    if (filters.categories.length > 0) {
      args.categoryIds = filters.categories as Id<"categories">[];
    }
    if (filters.minPrice > PRICE_MIN) {
      args.minPrice = filters.minPrice;
    }
    if (filters.maxPrice < PRICE_MAX) {
      args.maxPrice = filters.maxPrice;
    }
    return args;
  }, [browseAll, latitude, longitude, filters]);

  const dbProducts = useQuery(api.products.getActiveProducts, queryArgs);

  const activeFilterCount = countActiveFilters(filters);

  // Map + sort — no client-side category/price filtering (done by backend)
  const products = useMemo(() => (dbProducts || []).map(mapDbProduct), [dbProducts]);

  // Client-side same-day filter (lightweight, not worth a backend trip)
  const filteredProducts = useMemo(() => {
    if (filters.sameDayDelivery) {
      return products.filter((p) => p.sameDayDelivery);
    }
    return products;
  }, [products, filters.sameDayDelivery]);

  const sortedProducts = useMemo(
    () => applySort(filteredProducts, sortOption),
    [filteredProducts, sortOption]
  );

  // Reset to page 1 whenever filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOption]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [sortedProducts, currentPage]);

  const clearFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setCurrentPage(1);
  };

  if (dbProducts === undefined) {
    return (
      <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
          <p className="text-sm text-hive-text-muted font-bold">Loading product directory...</p>
        </div>
      </CatalogLayout>
    );
  }

  return (
    <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
      {/* Page header */}
      <div className="relative w-full">
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

      {/* Browse-all banner */}
      {browseAll && (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full mt-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-amber-200 text-amber-800 rounded-full w-5 h-5 font-extrabold text-[10px]">!</span>
            Showing all products — some may not be deliverable to your area.
          </div>
        </div>
      )}

      {/* Body: sidebar + grid */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 w-full flex flex-col gap-4 sm:gap-6 py-4 sm:py-6">
        {/* Toolbar */}
        <CatalogToolbar
          activeFilterCount={activeFilterCount}
          resultCount={sortedProducts.length}
          sortOption={sortOption}
          onChangeSort={setSortOption}
          onOpenMobileFilters={() => setDrawerOpen(true)}
          onClearFilters={clearFilters}
          accentColor="#C9A84C"
          categoryNames={selectedCategoryNames}
        />

        <div className="w-full flex gap-8 items-start">
          {/* Desktop sidebar */}
          <div className="hidden lg:block w-[300px] xl:w-[320px] flex-shrink-0">
            <CatalogFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Product grid */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {paginatedProducts.length > 0 ? (
              <>
                <div className="relative z-0 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5 md:gap-6">
                  {paginatedProducts.map((product, idx) => (
                    <div
                      key={`${sortOption}-${currentPage}-${product.id}`}
                      className="relative z-0 animate-[cardIn_0.45s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
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
                  accentColor="#C9A84C"
                />
              </>
            ) : (
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
