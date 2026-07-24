"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGridSkeleton } from "@/components/product/ProductGridSkeleton";
import { Button } from "@hive/ui";
import { Search, AlertCircle, ShoppingBag, MapPin, ArrowRight, X } from "lucide-react";
import { ProductCardData } from "@/lib/mockProducts";

// Helper to deduce occasion from product tags/description
function getProductOccasion(product: any): string {
  const catName = (product.categoryName || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  
  if (name.includes("wedding") || desc.includes("wedding") || name.includes("lehenga") || catName.includes("lehengas")) {
    return "wedding";
  }
  if (name.includes("festival") || desc.includes("festival") || name.includes("saree") || catName.includes("sarees")) {
    return "festival";
  }
  if (name.includes("co-ord") || name.includes("coord") || catName.includes("coords") || catName.includes("co-ord")) {
    return "coords";
  }
  if (name.includes("kurta") || name.includes("kurti") || catName.includes("kurtis")) {
    return "ethnic";
  }
  if (name.includes("party") || desc.includes("party")) {
    return "party";
  }
  if (name.includes("date") || desc.includes("date") || name.includes("dress") || catName.includes("dresses")) {
    return "date";
  }
  if (name.includes("work") || name.includes("office")) {
    return "workwear";
  }
  return "casual";
}

// Helper to map DB product to ProductCardData interface
function mapDbProduct(p: any): ProductCardData & { sizes: string[]; stockBySize: Record<string, number>; boutiqueId?: string; boutique?: any } {
  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    boutiqueId: p.boutiqueId,
    boutique: p.boutique,
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || "",
    price,
    compareAtPrice,
    rating: 4.8, // Fallback rating
    reviewCount: 12, // Fallback review count
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
    estimatedDistanceKm: p.estimatedDistanceKm,
    estimatedDurationMin: p.estimatedDurationMin,
    estimatedEtaMinutes: p.estimatedEtaMinutes,
    hiveScore: p.hiveScore,
  };
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 bg-hive-cream/10">
          <Search className="w-8 h-8 animate-pulse text-hive-amber" />
          <p className="text-sm text-hive-text-muted font-bold">Initializing search...</p>
        </div>
      }
    >
      <SearchContent />
    </React.Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const { latitude, longitude, city, pincode } = useLocation();

  // Local state for debounced search typing
  const [searchTerm, setSearchTerm] = useState(q);
  // Option to browse anyway (skips location filtering)
  const [browseAnyway, setBrowseAnyway] = useState(false);

  // Sync state with URL parameter (e.g. search triggered from Navbar)
  useEffect(() => {
    setSearchTerm(q);
  }, [q]);

  // Debounce the url parameter update
  useEffect(() => {
    if (searchTerm === q) return;

    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        router.push("/search");
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm, q, router]);

  const searchProductsAction = useAction(api.products.searchProducts);
  const [searchResult, setSearchResult] = useState<{ products: any[]; totalMatchedCount: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const popularProductsData = useQuery(api.products.getMostLovedProducts, {
    userLat: browseAnyway ? undefined : (latitude ?? undefined),
    userLng: browseAnyway ? undefined : (longitude ?? undefined),
    limit: 12,
  });

  useEffect(() => {
    if (!q) {
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    searchProductsAction({
      searchTerm: q,
      userLat: browseAnyway ? undefined : (latitude ?? undefined),
      userLng: browseAnyway ? undefined : (longitude ?? undefined),
    })
      .then((res) => {
        setSearchResult(res);
      })
      .catch((err) => {
        console.error("Search failed:", err);
        setSearchResult({ products: [], totalMatchedCount: 0 });
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [q, browseAnyway, latitude, longitude, searchProductsAction]);

  const isFallback = searchResult !== null && searchResult.products.length === 0;

  const isLoading = isSearching || (q && !searchResult) || (isFallback && !popularProductsData);

  const products = useMemo(() => {
    if (!searchResult) return [];
    if (searchResult.products.length === 0) {
      return (popularProductsData || []).map(mapDbProduct);
    }
    return searchResult.products.map(mapDbProduct);
  }, [searchResult, popularProductsData]);

  const hiddenCount = useMemo(() => {
    if (!searchResult) return 0;
    return searchResult.totalMatchedCount - searchResult.products.length;
  }, [searchResult]);

  const handleClear = () => {
    setSearchTerm("");
    router.push("/search");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFDF9]/40 pb-20">
      
      {/* 1. Header with search query state */}
      <div className="relative w-full border-b border-hive-border/40 bg-white/40 dark:bg-hive-dark/40 backdrop-blur-sm">
        {/* Honeycomb visual background */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.04]">
          <svg className="w-full h-full" aria-hidden="true">
            <defs>
              <pattern id="search-hc" patternUnits="userSpaceOnUse" width="52" height="90">
                <path fill="none" stroke="#F5A623" strokeWidth="1.5"
                  d="m0,15 26-15 26,15v30l-26,15-26-15z M26,60v30" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#search-hc)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 md:py-14 flex flex-col items-center gap-6">
          <div className="flex flex-col text-center gap-2">
            <span className="text-[10px] font-extrabold text-hive-amber tracking-widest uppercase">
              Global Catalog Search
            </span>
            <h1 className="text-3xl md:text-4xl font-serif font-black text-hive-dark tracking-tight leading-tight">
              {q ? `Search Results for "${q}"` : "Search Products"}
            </h1>
            <p className="text-xs text-hive-text-muted font-medium max-w-md">
              Find premium handlooms, sarees, kurtis, and designer wear from verified local designers and brands.
            </p>
          </div>

          {/* Large Search Box in page */}
          <div className="w-full max-w-xl relative">
             <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-12 rounded-xl bg-white border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm font-medium text-slate-800 placeholder-slate-400 transition-all duration-200"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-hive-text-muted hover:text-hive-dark p-1 hover:bg-hive-cream/80 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Search Results section */}
      <div className="max-w-7xl w-full mx-auto px-6 lg:px-8 py-8 flex-grow flex flex-col gap-6">
        
        {/* If no query, guide user to type */}
        {!q ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 border border-dashed border-hive-border/60 rounded-[32px] bg-white/40 text-center max-w-md mx-auto w-full">
            <div className="p-4 rounded-full bg-hive-comb/20 border border-hive-border/40 text-hive-amber mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-serif text-hive-dark">
              Type to start searching
            </h3>
            <p className="text-xs text-hive-text-muted mt-2 leading-relaxed">
              Search for terms like "saree", "silk", "kurta", or name of designer labels near you.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push("/")}
              className="mt-6 font-extrabold uppercase tracking-wider text-xs py-3 px-6"
            >
              Go to Home Page
            </Button>
          </div>
        ) : isLoading ? (
          // Loading Skeletons
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-baseline border-b border-hive-border/40 pb-4">
              <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-full" />
              <div className="h-4 w-24 bg-slate-150 animate-pulse rounded-full" />
            </div>
            <ProductGridSkeleton />
          </div>
        ) : products.length > 0 ? (
          <>
            {/* Conditional header: regular search summary OR compact fallback banner */}
            {isFallback ? (
              <div className="bg-amber-50/80 border border-amber-200/60 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-[slideIn_0.3s_ease] mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center bg-amber-200 text-amber-800 rounded-full w-5 h-5 font-extrabold text-[10px]">!</span>
                  <span>
                    No exact matches found for <strong className="font-extrabold">"{q}"</strong>. Check out some popular styles below instead:
                  </span>
                </div>
                <button
                  onClick={handleClear}
                  className="text-xs font-extrabold uppercase tracking-wider text-amber-800 hover:text-amber-900 border border-amber-300 rounded-xl px-3.5 py-1.5 bg-white shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all self-end sm:self-auto"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <>
                {/* Header info bar */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-hive-border/40 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold font-serif text-hive-dark">
                      {products.length} {products.length === 1 ? "Product" : "Products"} Found
                    </h2>
                    {city && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                        <MapPin className="w-3 h-3 text-hive-gold" />
                        Delivering to {city}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-hive-text-muted">
                    Showing matching items
                  </span>
                </div>

                {/* Location Filter Banner if items are hidden */}
                {hiddenCount > 0 && !browseAnyway && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-[slideIn_0.3s_ease]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center bg-amber-200 text-amber-800 rounded-full w-5 h-5 font-extrabold text-[10px]">!</span>
                      <span>
                        We found {searchResult?.totalMatchedCount || 0} matches, but {hiddenCount} products are outside your partner delivery radius.
                      </span>
                    </div>
                    <button
                      onClick={() => setBrowseAnyway(true)}
                      className="text-xs font-extrabold uppercase tracking-wider text-hive-amber hover:text-hive-gold border border-hive-gold/30 hover:border-hive-gold rounded-xl px-3.5 py-1.5 bg-white shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      Browse anyway
                    </button>
                  </div>
                )}

                {/* browseAnyway toggle reset banner if they are bypassing location */}
                {browseAnyway && city && (
                  <div className="bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-2xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-[slideIn_0.3s_ease]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 rounded-full w-5 h-5 font-extrabold text-[10px]">✓</span>
                      <span>
                        Showing all {products.length} matches (including non-deliverable items).
                      </span>
                    </div>
                    <button
                      onClick={() => setBrowseAnyway(false)}
                      className="text-xs font-extrabold uppercase tracking-wider text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl px-3.5 py-1.5 bg-white shadow-sm transition-all"
                    >
                      Filter by my location
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Search Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 animate-in fade-in duration-300">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-[cardIn_0.5s_cubic-bezier(0.215,0.61,0.355,1)_forwards] opacity-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard product={product} isRecommendation={isFallback} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto w-full">
            <p className="text-sm text-hive-text-muted">No products available at the moment.</p>
          </div>
        )}
      </div>

      {/* Embedded entrance styles */}
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
