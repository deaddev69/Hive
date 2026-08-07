"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function MoodDressingSection() {
  const adminMoods = useQuery(api.homepage.getCollectionsByType, { type: "mood" });
  const moods = adminMoods || [];

  if (!adminMoods || adminMoods.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2.5 select-none">
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            Express Your Mood
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">
            How are you dressing today?
          </h2>
        </div>
        <Link
          href="/shop?mode=moods"
          className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors flex items-center gap-1"
        >
          <span>All Moods</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal Touch Snap Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x snap-mandatory">
        {moods.map((mood, idx) => (
          <motion.div
            key={mood._id || idx}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-shrink-0 w-44 sm:w-52 h-64 rounded-3xl overflow-hidden relative group cursor-pointer shadow-md bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-200/80 dark:border-zinc-800 snap-start flex flex-col justify-between p-5"
          >
            <Link href={`/shop?mood=${mood.slug || mood.title.toLowerCase().replace(/\s+/g, "-")}`} className="absolute inset-0 flex flex-col justify-between p-5">
              {mood.imageUrl ? (
                <>
                  <Image
                    src={mood.imageUrl}
                    alt={mood.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                </>
              ) : null}
              
              <div className="relative z-10">
                <span className="text-3xl block p-2 bg-amber-500/10 border border-amber-500/20 backdrop-blur-md rounded-2xl w-fit">
                  {mood.emoji || "✨"}
                </span>
              </div>

              <div className="relative z-10 space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {mood.title}
                </h3>
                <span className="text-[10px] font-semibold text-amber-400 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                  <span>Explore Outfits</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
