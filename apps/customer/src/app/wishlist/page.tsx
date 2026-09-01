"use client";

import React, { useState, useEffect } from "react";
import { useWishlistStore } from "@/store/wishlist-store";
import { ProductCard } from "@/components/product/ProductCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@hive/ui";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-hive-cream">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-hive-dark animate-spin" />
        <span className="text-xs text-hive-text-muted font-semibold tracking-wide">Loading your favorites...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hive-cream text-hive-dark antialiased selection:bg-hive-gold/20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-4 mb-10 pb-6 border-b border-hive-dark/[0.08]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-hive-amber">
              Your Collection
            </span>
            <h1 className="text-3xl font-serif font-light text-hive-dark tracking-tight">
              My Wishlist
            </h1>
          </div>
          {items.length > 0 && (
            <span className="text-[10px] bg-white border border-hive-dark/[0.08] text-hive-text-muted font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {items.length} {items.length === 1 ? "Item" : "Items"} saved
            </span>
          )}
        </div>

        {/* Main content grid */}
        {items.length === 0 ? (
          /* Elegant Empty State */
          <div className="py-24 text-center space-y-6 max-w-sm mx-auto flex flex-col items-center animate-fadeIn">
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-light text-hive-dark">No Favorites Saved</h2>
              <p className="text-xs text-hive-text-muted leading-relaxed max-w-[280px] mx-auto font-medium">
                Your wishlist is empty. Explore unique, hand-crafted pieces from India's finest independent local designers and save your favorites.
              </p>
            </div>
            <Link href="/products" className="mt-4">
              <Button variant="dark" size="lg" className="text-[10px] uppercase tracking-widest rounded-lg">
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4 text-hive-gold" />
              </Button>
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
