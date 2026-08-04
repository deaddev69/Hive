"use client";

import React from "react";
import { History } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { ProductCard } from "@/components/product/ProductCard";
import { mapDbProduct } from "@/lib/mapDbProduct";

export function RecentlyViewedSection() {
  const { user } = useSessionStore();
  const userId = user?._id;

  const recentlyViewed = useQuery(
    api.homepage.getRecentlyViewed,
    userId ? { userId: userId as any, limit: 8 } : "skip"
  );

  const fallbackFresh = useQuery(api.homepage.getFreshArrivals, { limit: 8 });
  const products = recentlyViewed && recentlyViewed.length > 0 ? recentlyViewed : fallbackFresh;

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            Personalized For You
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Recently Viewed & Recommended</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p: any) => (
          <ProductCard key={p._id} product={mapDbProduct(p)} />
        ))}
      </div>
    </section>
  );
}
