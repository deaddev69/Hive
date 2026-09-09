"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { MobileFilterDrawer } from "@/components/catalog/MobileFilterDrawer";
import { getCategoryContent, resolveCategoryContent } from "@/lib/content/categoryContent";
import { CategorySEOBlock } from "@/components/seo/CategorySEOBlock";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { CatalogPagination } from "@/components/catalog/CatalogPagination";
import { CatalogEmptyState } from "@/components/catalog/CatalogEmptyState";
import { CategoryPillRail } from "@/components/catalog/CategoryPillRail";
import { ProductCard } from "@/components/product/ProductCard";
import { QuickViewModal } from "@/components/product/QuickViewModal";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toQueryCoords } from "@/lib/distance";
import { LoadingState } from "@hive/ui";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocation } from "@/context/LocationContext";
import {
  CatalogFilterState,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
  PRICE_MIN,
  PRICE_MAX,
} from "@/lib/catalogFilters";
import { ProductSortOption, DEFAULT_SORT } from "@/lib/catalogSort";

const PAGE_SIZE = 12;

// getProductOccasion, mapDbProduct and applySort used to live here, operating on
// the whole catalogue after it was fetched. They now run server-side over the
// full candidate set in convex/shared/catalog.ts, which is what lets the grid
// receive one ordered page instead of everything.

export function ProductsClient({ initialCategorySlug }: { initialCategorySlug?: string }) {
  return (
    <React.Suspense fallback={<LoadingState message="Discovering catalog items..." variant="full" />}>
      <ProductsCatalog initialCategorySlug={initialCategorySlug} />
    </React.Suspense>
  );
}

function ProductsCatalog({ initialCategorySlug }: { initialCategorySlug?: string }) {
  const searchParams = useSearchParams();
  const browseAllFromUrl = searchParams.get("browse") === "all";
  const boutiqueIdFromUrl = searchParams.get("boutiqueId");

  const { latitude, longitude, browseAllProducts, setDrawerOpen: setLocationDrawerOpen } = useLocation();
  const router = useRouter();

  // Bypass delivery-radius filtering if user clicked "Browse Products Anyway"
  // OR if the URL carries ?browse=all
  const browseAll = browseAllFromUrl || browseAllProducts;

  const [filters, setFilters] = useState<CatalogFilterState>(DEFAULT_FILTER_STATE);
  const [sortOption, setSortOption] = useState<ProductSortOption>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewModal, setQuickViewModal] = useState<{ open: boolean, productId: string | null }>({ open: false, productId: null });

  const categorySlugFromUrl = initialCategorySlug || searchParams.get("category");

  // Fetch DB categories for resolving names in the toolbar summary
  const dbCategories = useQuery(api.categories.getCategories, { onlyActive: true });

  // Fetch DB approved boutiques to resolve boutiqueName when boutiqueId is in query params
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques) ?? [];

  const activeBoutique = useMemo(() => {
    if (!boutiqueIdFromUrl) return null;
    return dbBoutiques.find((b) => b._id === boutiqueIdFromUrl);
  }, [dbBoutiques, boutiqueIdFromUrl]);

  // Resolve ?category=<slug> against the database by exact slug, and nothing else.
  //
  // There is deliberately no alias table and no name-derived fallback here. Both
  // used to exist ("women" -> "womens-ethnic", "bags" -> "handbags") and were the
  // reason a mistyped or retired slug silently rendered the entire catalogue: no
  // branch matched, no category filter was applied, and the grid looked like a
  // working "all products" page rather than a broken link. A category that needs
  // a particular URL sets that URL in its own `slug` field in admin.
  const categoryResolution = useMemo<
    | { status: "none" }
    | { status: "pending" }
    | { status: "resolved"; id: Id<"categories">; name: string }
    | { status: "unknown"; slug: string }
  >(() => {
    if (!categorySlugFromUrl) return { status: "none" };
    if (dbCategories === undefined) return { status: "pending" };
    const wanted = categorySlugFromUrl.trim().toLowerCase();
    const match = dbCategories.find((c) => c.slug.toLowerCase() === wanted);
    return match
      ? { status: "resolved", id: match._id as Id<"categories">, name: match.name }
      : { status: "unknown", slug: categorySlugFromUrl };
  }, [categorySlugFromUrl, dbCategories]);

  useEffect(() => {
    if (categoryResolution.status === "pending") return;
    setFilters((prev) => ({
      ...prev,
      categories:
        categoryResolution.status === "resolved" ? [categoryResolution.id] : [],
    }));
  }, [categoryResolution]);

  const seoCategory = useMemo(() => {
    if (categoryResolution.status !== "resolved" || !dbCategories) return null;
    const match = dbCategories.find((c) => c._id === categoryResolution.id);
    return match
      ? {
          name: match.name,
          slug: match.slug,
          seoIntro: (match as any).seoIntro ?? null,
          seoDescription: (match as any).seoDescription ?? null,
        }
      : null;
  }, [categoryResolution, dbCategories]);

  // Resolve selected category names for the results summary pill
  const selectedCategoryNames = useMemo(() => {
    if (!dbCategories || filters.categories.length === 0) return [];
    return filters.categories
      .map((id) => dbCategories.find((c) => c._id === id)?.name)
      .filter(Boolean) as string[];
  }, [dbCategories, filters.categories]);

  // Build query args — the backend does all filtering, ordering and paging.
  const queryArgs = useMemo(() => {
    const args: Record<string, any> = {
      page: currentPage,
      pageSize: PAGE_SIZE,
      sort: sortOption,
    };
    if (!browseAll) {
      // Rounded to the ~111 m precision the server already uses, so this query
      // is cacheable across shoppers in the same cell. See toQueryCoords.
      Object.assign(args, toQueryCoords(latitude, longitude));
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
    if (filters.occasions.length > 0) {
      args.occasions = filters.occasions;
    }
    if (filters.newArrivals) {
      args.newArrivals = true;
    }
    if (boutiqueIdFromUrl) {
      args.boutiqueId = boutiqueIdFromUrl as Id<"boutiques">;
    }
    return args;
  }, [browseAll, latitude, longitude, filters, boutiqueIdFromUrl, currentPage, sortOption]);

  // A URL that names a category must never fall through to an unfiltered grid.
  // While the slug is still resolving, and permanently if it resolves to
  // nothing, the catalogue query is skipped rather than run without a category.
  const catalogQueryArgs =
    categoryResolution.status === "pending" || categoryResolution.status === "unknown"
      ? "skip"
      : queryArgs;

  const catalogPage = useQuery(api.products.getCatalogPage, catalogQueryArgs);

  const activeFilterCount = countActiveFilters(filters);

  // Filtering, ordering and paging all happen in getCatalogPage now, over the
  // full candidate set — so the ordering stays global and page 2 continues
  // page 1, while only one page of cards crosses the wire. The cards arrive
  // grid-ready; mapDbProduct is no longer needed on this path.
  const paginatedProducts = catalogPage?.products ?? [];
  const resultCount = catalogPage?.totalCount ?? 0;
  const totalPages = catalogPage?.totalPages ?? 1;

  // Reset to page 1 whenever filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOption]);

  // The server clamps an out-of-range page to the last real one. Mirror that
  // back into local state so the page control highlights the page actually
  // being shown.
  useEffect(() => {
    if (catalogPage && catalogPage.page !== currentPage) {
      setCurrentPage(catalogPage.page);
    }
  }, [catalogPage, currentPage]);

  // Automatically select 'nearby' sort option when user location is available
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setSortOption("nearby");
    } else {
      setSortOption("trending");
    }
  }, [latitude, longitude]);

  const clearFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setCurrentPage(1);
  };

  // The URL named a category that no longer exists. Say so, instead of quietly
  // rendering every product in the catalogue as if the link had worked.
  if (categoryResolution.status === "unknown") {
    return (
      <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 w-full">
          <CategoryPillRail />
          <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
            <h1 className="text-xl font-serif font-extrabold text-hive-dark">
              We couldn&apos;t find that category
            </h1>
            <p className="text-sm text-hive-text-muted max-w-sm leading-relaxed">
              &ldquo;{categoryResolution.slug}&rdquo; isn&apos;t one of our categories any
              more. Pick one above, or browse everything.
            </p>
            <Link
              href="/products?browse=all"
              className="mt-2 inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              Browse all products
            </Link>
          </div>
        </div>
      </CatalogLayout>
    );
  }

  if (catalogPage === undefined) {
    return (
      <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
        <LoadingState message="Discovering catalog items..." variant="full" />
      </CatalogLayout>
    );
  }

  return (
    <CatalogLayout breadcrumbs={[{ label: "All Products" }]}>
      {/* Minimal Category Heading */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 w-full mt-2">
        <h1 className="text-base font-bold text-slate-900 tracking-tight my-1 px-1">
          {activeBoutique ? activeBoutique.boutiqueName : (selectedCategoryNames.length > 0 ? selectedCategoryNames.join(", ") : "All Products")}
        </h1>
      </div>

      <CategoryPillRail />

      {/* Designer exclusive collections banner */}
      {boutiqueIdFromUrl && (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full mt-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-amber-200 text-amber-800 rounded-full w-5 h-5 font-extrabold text-[10px]">✓</span>
              <span>Showing exclusive collections from <strong className="font-extrabold">{activeBoutique?.boutiqueName || "Designer"}</strong></span>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete("boutiqueId");
                router.push(`${window.location.pathname}?${params.toString()}`);
              }}
              className="text-hive-amber hover:text-hive-gold font-extrabold transition-colors uppercase tracking-wider text-[10px]"
            >
              [Clear Filter]
            </button>
          </div>
        </div>
      )}

      {/* Browse-all banner */}
      {browseAll && (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full mt-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-amber-200 text-amber-800 rounded-full w-5 h-5 font-extrabold text-[10px]">!</span>
            Showing all products — some may not be deliverable to your area.
          </div>
        </div>
      )}

      {/* Body: sidebar + grid (Tight margins above the fold) */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 w-full flex flex-col mt-2 mb-3 gap-3">
        {/* Toolbar */}
        <CatalogToolbar
          activeFilterCount={activeFilterCount}
          resultCount={resultCount}
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
                <div className="relative z-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                  {paginatedProducts.map((product, idx) => (
                    <div
                      key={`${sortOption}-${currentPage}-${product.id}`}
                      className="relative z-0 animate-[cardIn_0.45s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <ProductCard 
                        product={product} 
                        onQuickView={(id) => setQuickViewModal({ open: true, productId: id })} 
                      />
                    </div>
                  ))}
                </div>

                <CatalogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  resultCount={resultCount}
                  pageSize={PAGE_SIZE}
                  accentColor="#C9A84C"
                />
              </>
            ) : (
              <CatalogEmptyState
                onClearFilters={clearFilters}
                accentColor="#C9A84C"
                // With no filters set and a location in hand, filters cannot be why the grid is
                // empty — no boutique reaches this shopper. Offering to reset filters there
                // would point at the wrong cause.
                reason={
                  activeFilterCount === 0 && !browseAll && latitude !== null && longitude !== null
                    ? "location"
                    : "filters"
                }
                onChangeLocation={() => setLocationDrawerOpen(true)}
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

      <MobileFilterDrawer
        filters={filters}
        onChange={setFilters}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {quickViewModal.open && quickViewModal.productId && (
        <QuickViewModal
          isOpen={quickViewModal.open}
          onClose={() => setQuickViewModal({ open: false, productId: null })}
          productSlug={quickViewModal.productId}
          // Seeded from the current page rather than the whole catalogue —
          // quick view can only be opened from a card that is on screen.
          initialProduct={paginatedProducts.find((p) => p.slug === quickViewModal.productId)}
        />
      )}

      {/*
        SEO block for a category page. A resolved category always gets one:
        hand-written copy where it exists, then the category's own admin-editable
        text, then a generated block. A slug with no category behind it (the
        editorial landing pages) still falls back to the hand-written map.
      */}
      {categoryResolution.status === "resolved" && seoCategory && (
        <CategorySEOBlock content={resolveCategoryContent(seoCategory)} />
      )}
      {categoryResolution.status === "none" && initialCategorySlug && (
        <CategorySEOBlock content={getCategoryContent(initialCategorySlug)} />
      )}
    </CatalogLayout>
  );
}
