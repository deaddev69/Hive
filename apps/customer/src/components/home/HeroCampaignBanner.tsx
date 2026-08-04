"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const FALLBACK_CAMPAIGNS = [
  {
    _id: "fallback-1",
    title: "Monsoon Handloom Edit '26",
    subtitle: "Breathable Kerala linens, hand-dyed organzas & rainy day silhouettes curated by local boutiques.",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80",
    ctaText: "Explore Monsoon Edit",
    ctaUrl: "/shop?collection=monsoon",
    priority: 10,
  },
  {
    _id: "fallback-2",
    title: "Kochi Festive & Wedding Luxe",
    subtitle: "Handcrafted Zari sarees, bridal lehengas & evening co-ords delivered in under 2 hours.",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1400&q=80",
    ctaText: "Shop Wedding Collection",
    ctaUrl: "/shop?collection=wedding",
    priority: 9,
  },
  {
    _id: "fallback-3",
    title: "Minimalist Linen & Co-ords",
    subtitle: "Effortless, elevated everyday luxury from verified designer studios.",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80",
    ctaText: "Discover Minimalist",
    ctaUrl: "/shop?collection=minimalist",
    priority: 8,
  },
];

export function HeroCampaignBanner() {
  const adminCampaigns = useQuery(api.homepage.getActiveHeroCampaigns);
  const campaigns = adminCampaigns && adminCampaigns.length > 0 ? adminCampaigns : FALLBACK_CAMPAIGNS;

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (campaigns.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [campaigns.length]);

  const current = campaigns[currentIndex] || FALLBACK_CAMPAIGNS[0];

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 select-none">
      <div className="relative h-[420px] sm:h-[480px] md:h-[520px] rounded-3xl overflow-hidden shadow-xl bg-zinc-950 group">
        
        {/* Animated Background Image Carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current._id || currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={current.imageUrl}
              alt={current.title}
              fill
              priority
              className="object-cover object-center"
            />
            {/* Editorial Multi-layered Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent hidden sm:block" />
          </motion.div>
        </AnimatePresence>

        {/* Campaign Editorial Overlay Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-12 text-white max-w-2xl">
          <motion.div
            key={`text-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-full text-amber-300 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hive Exclusive Drop</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              {current.title}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-none">
              {current.subtitle}
            </p>

            <div className="pt-2">
              <Link
                href={current.ctaUrl || "/shop"}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
              >
                <span>{current.ctaText || "Explore Drop"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Carousel Navigation Controls */}
        {campaigns.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev === 0 ? campaigns.length - 1 : prev - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % campaigns.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Indicators */}
            <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
              {campaigns.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex ? "w-6 bg-amber-400" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
