"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ProductCard } from "@/components/product/ProductCard";
import { mapDbProduct } from "@/lib/mapDbProduct";

export function GoingOutSection() {
  const goingOutCollections = useQuery(api.homepage.getCollectionsByType, { type: "going_out" });
  const collection = goingOutCollections?.[0];

  const collectionProducts = useQuery(
    api.homepage.getCollectionProducts,
    collection ? { collectionId: collection._id, limit: 4 } : "skip"
  );

  const fallbackProducts = useQuery(api.homepage.getFreshArrivals, { limit: 4 });
  const products = collectionProducts && collectionProducts.length > 0 ? collectionProducts : fallbackProducts;

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 select-none">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950 p-6 sm:p-10 border border-zinc-800 text-white shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Text & Call to Action */}
          <div className="md:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Immediate Intent Edit</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-white leading-tight">
              Going Out Today?
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Evening co-ords, statement mini dresses, luxury leather heels & accessories delivered to your doorstep in under 2 hours.
            </p>

            <div className="pt-2">
              <Link
                href="/shop?collection=going-out"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <span>Shop Evening Edits</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Product Grid with Official ProductCard */}
          <div className="md:col-span-7 grid grid-cols-2 gap-3 sm:gap-4">
            {products.slice(0, 4).map((p: any) => (
              <ProductCard key={p._id} product={mapDbProduct(p)} />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
