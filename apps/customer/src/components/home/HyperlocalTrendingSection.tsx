"use client";

import React from "react";
import Link from "next/link";
import { Zap, MapPin, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ProductCard } from "@/components/product/ProductCard";
import { mapDbProduct } from "@/lib/mapDbProduct";

export function HyperlocalTrendingSection() {
  const trendingCollections = useQuery(api.homepage.getCollectionsByType, { type: "trending" });
  const firstCollection = trendingCollections?.[0];

  const collectionProducts = useQuery(
    api.homepage.getCollectionProducts,
    firstCollection ? { collectionId: firstCollection._id, limit: 8 } : "skip"
  );

  const fallbackFresh = useQuery(api.homepage.getFreshArrivals, { limit: 8 });
  const products = collectionProducts && collectionProducts.length > 0 ? collectionProducts : fallbackFresh;

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 select-none">
      <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-3xl p-5 sm:p-7 shadow-lg">

        {/* Section Header with Kochi Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
              <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
              <span>⚡ Express Delivery in Kochi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
              <span>Trending in Kochi</span>
              <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            </h2>
            <p className="text-xs text-zinc-400">
              Most requested styles across Panampilly Nagar, Edappally & Kakkanad.
            </p>
          </div>

          <Link
            href="/shop?sort=trending"
            className="self-start sm:self-auto px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>View All Kochi Trends</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4-Column Responsive Grid with Official ProductCard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((p: any) => (
            <ProductCard key={p._id} product={mapDbProduct(p)} />
          ))}
        </div>

      </div>
    </section>
  );
}
