"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { formatCurrency } from "@hive/utils";

export function SeasonalCollectionSection() {
  const seasonalCollections = useQuery(api.homepage.getCollectionsByType, { type: "seasonal" });
  const activeSeasonal = seasonalCollections?.[0];

  const collectionProducts = useQuery(
    api.homepage.getCollectionProducts,
    activeSeasonal ? { collectionId: activeSeasonal._id, limit: 6 } : "skip"
  );

  const title = activeSeasonal?.title || "Wedding & Festive Curation '26";
  const subtitle = activeSeasonal?.subtitle || "Handcrafted Zari sarees, bridal organzas & designer sherwanis.";

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {collectionProducts.map((p: any) => (
            <motion.div
              key={p._id}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden group flex flex-col justify-between shadow-xs"
            >
              <Link href={`/product/${p.slug || p._id}`} className="block relative aspect-[4/5] bg-zinc-100 dark:bg-zinc-800">
                <Image
                  src={p.imageUrl || p.imageUrls?.[0] || "/placeholder.png"}
                  alt={p.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </Link>
              <div className="p-2.5 space-y-1">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {p.name}
                </h3>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white">
                  {formatCurrency(p.price)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
