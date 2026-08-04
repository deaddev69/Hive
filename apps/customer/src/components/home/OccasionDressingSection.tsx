"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const FALLBACK_OCCASIONS = [
  {
    _id: "occ-1",
    title: "Office & Workwear",
    subtitle: "Tailored blazers, linen trousers & crisp shirts",
    imageUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=800&q=80",
    slug: "office",
  },
  {
    _id: "occ-2",
    title: "Brunch & Cafe",
    subtitle: "Floaty sundresses, pastel sets & tote bags",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    slug: "brunch",
  },
  {
    _id: "occ-3",
    title: "Date Night",
    subtitle: "Silk slips, bodycon dresses & statement jewelry",
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80",
    slug: "date-night",
  },
  {
    _id: "occ-4",
    title: "Wedding Guest",
    subtitle: "Zari sarees, embroidered lehengas & dupattas",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    slug: "wedding-guest",
  },
  {
    _id: "occ-5",
    title: "College & Campus",
    subtitle: "Comfy kurtis, denims & oversized shirts",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    slug: "college",
  },
  {
    _id: "occ-6",
    title: "Vacation & Resort",
    subtitle: "Breezy kaftans, beach co-ords & sunglasses",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80",
    slug: "vacation",
  },
];

export function OccasionDressingSection() {
  const adminOccasions = useQuery(api.homepage.getCollectionsByType, { type: "occasion" });
  const occasions = adminOccasions && adminOccasions.length > 0 ? adminOccasions : FALLBACK_OCCASIONS;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
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
            className="relative h-44 sm:h-52 rounded-3xl overflow-hidden group cursor-pointer shadow-sm bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800"
          >
            <Link href={`/shop?occasion=${occ.slug || occ.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <Image
                src={occ.imageUrl || FALLBACK_OCCASIONS[idx % FALLBACK_OCCASIONS.length].imageUrl}
                alt={occ.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
              
              <div className="absolute bottom-0 inset-x-0 p-4 space-y-1">
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
