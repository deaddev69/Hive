"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { History, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { formatCurrency } from "@hive/utils";

export function RecentlyViewedSection() {
  const { user } = useSessionStore();
  const userId = user?._id;

  const recentlyViewed = useQuery(
    api.homepage.getRecentlyViewed,
    userId ? { userId: userId as any, limit: 6 } : "skip"
  );

  const fallbackFresh = useQuery(api.homepage.getFreshArrivals, { limit: 6 });
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {products.map((p: any) => (
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
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wide uppercase truncate">
                {p.boutiqueName || "Boutique"}
              </p>
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
    </section>
  );
}
