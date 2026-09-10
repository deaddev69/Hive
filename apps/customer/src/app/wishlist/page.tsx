"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useWishlistStore } from "@/store/wishlist-store";
import { useLocation } from "@/context/LocationContext";
import { ProductCard } from "@/components/product/ProductCard";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);
  const { latitude, longitude } = useLocation();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch curated inspiration using Hive's canonical discovery query.
  // Skipped when wishlist already contains saved items.
  const catalogPage = useQuery(
    api.products.getCatalogPage,
    hydrated && items.length === 0
      ? {
          userLat: latitude ?? undefined,
          userLng: longitude ?? undefined,
          pageSize: 4,
          page: 1,
          sort: "trending",
        }
      : "skip"
  );

  const curatedProducts = catalogPage?.products ?? [];

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-stone-900 animate-spin" />
        <span className="text-xs text-stone-500 font-semibold tracking-wide">Loading your favorites...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900 antialiased selection:bg-stone-200 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-left">
        
        {/* Header section */}
        <div
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-3 mb-6 ${
            items.length > 0 ? "pb-4 border-b border-stone-200/80" : "pb-1"
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-hive-text-muted">
              Your Collection
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
              My Wishlist
            </h1>
          </div>
          {items.length > 0 && (
            <span className="text-[10px] bg-white border border-stone-200 text-stone-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {items.length} {items.length === 1 ? "Item" : "Items"} saved
            </span>
          )}
        </div>

        {/* Main content */}
        {items.length === 0 ? (
          /* Editorial Fashion Empty State */
          <div className="animate-[fadeIn_0.3s_ease-out]">
            {/* Editorial Hero Visual & Copy */}
            <div className="py-1 sm:py-3 text-center max-w-lg mx-auto flex flex-col items-center select-none">
              {/* Editorial Artwork */}
              <div className="relative w-full max-w-[320px] sm:max-w-[380px] md:max-w-[410px] aspect-[1024/682] mx-auto mb-3 sm:mb-4">
                <Image
                  src="/brand/wishlist-editorial-v2.png"
                  alt="Hive Wishlist - Good Style Takes Time"
                  fill
                  priority
                  unoptimized
                  className="object-contain mix-blend-multiply pointer-events-none"
                />
              </div>

              {/* Headline & Body Copy */}
              <div className="space-y-1.5 text-center max-w-[340px] sm:max-w-[380px] mx-auto px-2">
                <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight leading-tight">
                  Save what you love
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed font-normal">
                  Your wishlist is empty. Explore curated styles from Kochi&apos;s finest boutiques and save the pieces you love.
                </p>
              </div>

              {/* Primary Action Button */}
              <Link href="/products" className="mt-3.5 sm:mt-4">
                <button
                  type="button"
                  className="h-10 sm:h-11 px-6 sm:px-7 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-full text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Explore Styles</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
                </button>
              </Link>
            </div>

            {/* Inspiration Rail: Curated for you */}
            {curatedProducts.length > 0 && (
              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-100 text-left">
                <div className="flex items-end justify-between mb-3 sm:mb-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-hive-text-muted">
                      Some Inspiration
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                      Curated for you
                    </h3>
                  </div>
                  <Link
                    href="/products"
                    className="text-xs font-medium text-stone-600 hover:text-stone-950 flex items-center gap-1 transition-colors group pb-0.5"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-stone-400 group-hover:text-stone-950" />
                  </Link>
                </div>

                {/* Product Rail: swipeable on mobile, 4-column grid on desktop */}
                <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-4 md:gap-5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 snap-x">
                  {curatedProducts.map((prod) => (
                    <div key={prod.slug} className="w-[155px] sm:w-auto shrink-0 snap-start">
                      <ProductCard product={prod as any} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {items.map((item) => {
              // Adapt WishlistProduct to ProductCardData schema expectations
              const cardProduct = {
                id: item.id || item.slug,
                slug: item.slug,
                name: item.name,
                price: item.price,
                compareAtPrice: item.compareAtPrice,
                imageUrl: item.imageUrl,
                boutiqueName: item.boutiqueName,
                rating: item.rating || undefined,
                reviewCount: item.reviewCount || undefined,
                sizes: item.sizes || ["Free"],
                stockBySize: item.stockBySize || { Free: 5 },
                favorite: true,
              };

              return (
                <ProductCard key={item.slug} product={cardProduct} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

