"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowRight, Grid2x2, LayoutGrid, Sparkles } from "lucide-react";
import { CollectionCard } from "@/components/catalog/CollectionCard";

export function CollectionsIndexClient() {
  const collections = useQuery(api.customerHome.getAllCollections);

  if (collections === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-hive-dark">
        <Sparkles className="w-8 h-8 text-hive-amber animate-spin" />
        <p className="font-serif italic text-lg text-hive-text-muted animate-pulse">
          Loading edits...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#FFFDF5] via-white to-[#FFF3CC]/30 border-b border-hive-border/60 py-14 lg:py-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full flex flex-col gap-4">
          <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-[10px] font-extrabold text-hive-amber bg-hive-gold/10 border border-hive-gold/25 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-gold animate-pulse" />
            BOUTIQUE CURATED EDITS
          </span>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-hive-dark tracking-tight leading-tight">
                Curated for Every
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-hive-amber to-hive-gold">
                  Occasion.
                </span>
              </h1>
              <p className="text-base text-hive-text-muted max-w-lg leading-relaxed">
                Hand-picked fashion edits from verified local boutiques.
                Each piece tells a story of craft, culture, and care.
              </p>
            </div>

            <Link
              href="/products"
              className="self-start sm:self-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hive-amber hover:text-hive-gold transition-colors group"
            >
              All Products
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-6 pt-2 border-t border-hive-border/50 mt-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-hive-gold" />
              <span className="text-xs font-bold text-hive-dark">
                {collections.length} Curated Edits
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Grid2x2 className="w-4 h-4 text-hive-gold" />
              <span className="text-xs font-bold text-hive-dark">
                Dynamic Inventory
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full py-12 flex flex-col gap-12">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collections.map((collection: any) => (
              <div key={collection._id} className="h-full">
                {/* Fallback mock-like object until CollectionCard is fully typed */}
                <CollectionCard 
                  collection={{
                    ...collection,
                    id: collection._id,
                    title: collection.name,
                    productCount: 12,
                    isFeatured: false,
                    imageUrl: collection.coverImage || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
                    tags: ["Curated"],
                  } as any} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
