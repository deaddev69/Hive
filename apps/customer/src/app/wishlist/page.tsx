"use client";

import React, { useState, useEffect } from "react";
import { useWishlistStore } from "@/store/wishlist-store";
import { ProductCard } from "@/components/product/ProductCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-[#FAF8F4]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#1C1917] animate-spin" />
        <span className="text-xs text-[#78716C] font-semibold tracking-wide">Loading your favorites...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1C1917] antialiased selection:bg-[#F5A623]/20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-4 mb-10 pb-6 border-b border-[#1c1917]/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D97706]">
              Your Collection
            </span>
            <h1 className="text-3xl font-serif font-light text-[#1C1917] tracking-tight">
              My Wishlist
            </h1>
          </div>
          {items.length > 0 && (
            <span className="text-[10px] bg-white border border-[#1c1917]/[0.08] text-[#78716C] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {items.length} {items.length === 1 ? "Item" : "Items"} saved
            </span>
          )}
        </div>

        {/* Main content grid */}
        {items.length === 0 ? (
          /* Elegant Empty State */
          <div className="py-24 text-center space-y-6 max-w-sm mx-auto flex flex-col items-center animate-fadeIn">
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-light text-[#1C1917]">No Favorites Saved</h2>
              <p className="text-xs text-[#78716C] leading-relaxed max-w-[280px] mx-auto font-medium">
                Your wishlist is empty. Explore unique, hand-crafted pieces from India's finest independent local designers and save your favorites.
              </p>
            </div>
            <Link href="/products" className="mt-4">
              <button
                type="button"
                className="h-12 px-8 bg-[#1C1917] text-[#FAF8F4] hover:bg-[#1c1917]/90 active:scale-[0.98] transition-all rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4 text-[#F5A623]" />
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
                rating: item.rating || 4.8,
                reviewCount: item.reviewCount || 10,
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
