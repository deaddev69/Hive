"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function OccasionDressingSection() {
  const adminOccasions = useQuery(api.homepage.getCollectionsByType, { type: "occasion" });
  const occasions = adminOccasions || [];

  if (!adminOccasions || adminOccasions.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 select-none">
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            Shop By Event
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">
            What are you dressing for?
          </h2>
        </div>
        <Link
          href="/shop?mode=occasions"
          className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1"
        >
          <span>All Occasions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2x3 or 3x2 Editorial Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {occasions.slice(0, 6).map((occ, idx) => (
          <motion.div
            key={occ._id || idx}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="relative h-44 sm:h-52 rounded-3xl overflow-hidden group cursor-pointer shadow-sm bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-200/80 dark:border-zinc-800 p-5 flex flex-col justify-end"
          >
            <Link href={`/shop?occasion=${occ.slug || occ.title.toLowerCase().replace(/\s+/g, "-")}`} className="absolute inset-0 flex flex-col justify-end p-5">
              {occ.imageUrl ? (
                <>
                  <Image
                    src={occ.imageUrl}
                    alt={occ.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
                </>
              ) : null}
              
              <div className="relative z-10 space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {occ.title}
                </h3>
                {occ.subtitle && (
                  <p className="text-[10px] sm:text-xs text-zinc-300 line-clamp-1">
                    {occ.subtitle}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
