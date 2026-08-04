"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const FALLBACK_MOODS = [
  {
    _id: "mood-1",
    title: "Feeling Cute",
    emoji: "✨",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
    slug: "feeling-cute",
  },
  {
    _id: "mood-2",
    title: "Boss Mode",
    emoji: "💼",
    imageUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=600&q=80",
    slug: "boss-mode",
  },
  {
    _id: "mood-3",
    title: "Minimal Luxe",
    emoji: "🌿",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
    slug: "minimal-luxe",
  },
  {
    _id: "mood-4",
    title: "Coffee Date",
    emoji: "☕",
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80",
    slug: "coffee-date",
  },
  {
    _id: "mood-5",
    title: "Vacation Glow",
    emoji: "🌴",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
    slug: "vacation-glow",
  },
  {
    _id: "mood-6",
    title: "Wedding Guest",
    emoji: "💍",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    slug: "wedding-guest",
  },
];

export function MoodDressingSection() {
  const adminMoods = useQuery(api.homepage.getCollectionsByType, { type: "mood" });
  const moods = adminMoods && adminMoods.length > 0 ? adminMoods : FALLBACK_MOODS;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
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
            className="flex-shrink-0 w-44 sm:w-52 h-64 rounded-3xl overflow-hidden relative group cursor-pointer shadow-md bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 snap-start"
          >
            <Link href={`/shop?mood=${mood.slug || mood.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <Image
                src={mood.imageUrl || FALLBACK_MOODS[idx % FALLBACK_MOODS.length].imageUrl}
                alt={mood.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
              
              <div className="absolute bottom-0 inset-x-0 p-4 space-y-1">
                <span className="text-xl block">{mood.emoji || "✨"}</span>
                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {mood.title}
                </h3>
                <span className="text-[10px] font-semibold text-zinc-300 group-hover:text-amber-300 transition-colors flex items-center gap-1">
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
