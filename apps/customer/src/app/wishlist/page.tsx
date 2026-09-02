"use client";

import React, { useState, useEffect } from "react";
import { useWishlistStore } from "@/store/wishlist-store";
import { ProductCard } from "@/components/product/ProductCard";
import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-stone-900 animate-spin" />
        <span className="text-xs text-stone-500 font-semibold tracking-wide">Loading your favorites...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900 antialiased selection:bg-amber-100 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-left">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-3 mb-6 pb-4 border-b border-stone-200/80">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
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

        {/* Main content grid */}
        {items.length === 0 ? (
          /* Elegant Empty State with Gold Heart */
          <div className="py-8 sm:py-12 text-center space-y-4 max-w-sm mx-auto flex flex-col items-center select-none animate-[fadeIn_0.3s_ease-out]">
            {/* Ambient Gold Glow & Signature Heart */}
            <div className="relative w-16 h-16 flex items-center justify-center mb-0.5">
              <div className="absolute inset-0 rounded-full bg-[#F5C22B]/15 blur-lg pointer-events-none" />
              <div className="relative w-14 h-14 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-center shadow-2xs">
                <Heart className="w-7 h-7 fill-[#F5C22B] stroke-[#F5C22B]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">No Favorites Saved</h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-[280px] mx-auto font-normal">
                Your wishlist is empty. Explore curated styles from Kochi&apos;s finest boutiques and save the pieces you love.
              </p>
            </div>

            <Link href="/products" className="mt-1">
              <button
                type="button"
                className="h-10 px-5 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Explore Styles</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
              </button>
            </Link>
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
