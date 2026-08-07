"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ProductCard } from "@/components/product/ProductCard";
import { mapDbProduct } from "@/lib/mapDbProduct";

export function SeasonalCollectionSection() {
  const seasonalCollections = useQuery(api.homepage.getCollectionsByType, { type: "seasonal" });
  const activeSeasonal = seasonalCollections?.[0];

  const collectionProducts = useQuery(
    api.homepage.getCollectionProducts,
    activeSeasonal ? { collectionId: activeSeasonal._id, limit: 8 } : "skip"
  );

  const title = activeSeasonal?.title || "Wedding & Festive Curation '26";
  const subtitle = activeSeasonal?.subtitle || "Handcrafted Zari sarees, bridal organzas & designer sherwanis.";

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 select-none">
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            Seasonal Highlight
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {subtitle}
          </p>
        </div>
        <Link
          href={`/shop?collection=${activeSeasonal?.slug || "seasonal"}`}
          className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1"
        >
          <span>Explore Seasonal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {collectionProducts && collectionProducts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {collectionProducts.map((p: any) => (
            <ProductCard key={p._id} product={mapDbProduct(p)} />
          ))}
        </div>
      )}
    </section>
  );
}
