"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { formatCurrency } from "@hive/utils";

export function FreshArrivalsSection() {
  const freshProducts = useQuery(api.homepage.getFreshArrivals, { limit: 8 });

  if (!freshProducts || freshProducts.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            New Arrivals
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">
            Fresh on Hive
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            New styles added today by verified boutique partners.
          </p>
        </div>
        <Link
          href="/shop?sort=newest"
          className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1"
        >
          <span>View All Fresh</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {freshProducts.map((p: any) => (
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
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-zinc-950 rounded-md text-[9px] font-black uppercase tracking-wider">
                NEW
              </div>
            </Link>

            <div className="p-3 space-y-1">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wide uppercase truncate">
                {p.boutiqueName || "Boutique"}
              </p>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {p.name}
              </h3>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                  {formatCurrency(p.price)}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  {p.sizes?.slice(0, 2).join(", ") || "Free"}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
