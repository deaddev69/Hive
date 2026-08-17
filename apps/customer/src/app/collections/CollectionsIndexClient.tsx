"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowRight, Sparkles, Store, ShieldCheck, Timer, Compass, Heart } from "lucide-react";
import { CollectionCard } from "@/components/catalog/CollectionCard";

const CURATED_LOOKBOOKS_PRESETS = [
  {
    id: "preset-kasavu",
    slug: "kasavu-heritage",
    title: "Kasavu & Festive Heritage",
    description: "Handloom kasavu sarees, golden border drapes, and traditional designer sets.",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    productCount: 18,
    category: "festive",
    isFeatured: true,
  },
  {
    id: "preset-wedding",
    slug: "wedding-guest-luxe",
    title: "Wedding Guest & Bridal Luxe",
    description: "Opulent lehengas, embroidered anarkalis, and statement occasionwear.",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
    productCount: 24,
    category: "wedding",
    isFeatured: true,
  },
  {
    id: "preset-linen",
    slug: "monsoon-linen-drapes",
    title: "Monsoon Linen & Cottons",
    description: "Breathable pure linen kurtis, relaxed co-ord sets, and everyday elegance.",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
    productCount: 15,
    category: "casual",
  },
  {
    id: "preset-evening",
    slug: "evening-glam-cocktails",
    title: "Evening Glam & Party Fits",
    description: "Contemporary silhouettes, satin slip dresses, and bespoke festive tops.",
    imageUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
    productCount: 14,
    category: "evening",
  },
  {
    id: "preset-chikankari",
    slug: "handcrafted-chikankari",
    title: "Chikankari & Pastel Kurtis",
    description: "Delicate needlework, soft hues, and airy fabrics from artisan boutiques.",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
    productCount: 20,
    category: "casual",
  },
  {
    id: "preset-silk",
    slug: "pure-silk-handlooms",
    title: "Handloom Silks & Brocades",
    description: "Rich Kanchipuram, Banarasi, and pure silk treasures curated for celebrations.",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    productCount: 16,
    category: "wedding",
  },
];

const FALLBACK_IMAGES: Record<string, string> = {
  "todays-edit": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
  "fresh-on-hive": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
  "trending-in-kochi": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
  "going-out-today": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80",
  "wedding-season": "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
  "quiet-luxury": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
  "linen-love": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80",
};

const CATEGORY_TABS = [
  { id: "all", label: "All Lookbooks" },
  { id: "festive", label: "Festive & Kasavu" },
  { id: "wedding", label: "Wedding & Guestwear" },
  { id: "evening", label: "Party & Evening" },
  { id: "casual", label: "Everyday Linen" },
];

export function CollectionsIndexClient() {
  const rawCollections = useQuery(api.customerHome.getAllCollections);
  const [activeCategory, setActiveCategory] = useState("all");

  const allLookbooks = useMemo(() => {
    if (!rawCollections) return [];

    const dbMapped = rawCollections.map((c: any) => ({
      id: c._id,
      slug: c.slug,
      title: c.name,
      description: c.description || "Hand-picked capsule edit from verified Kerala boutiques.",
      imageUrl: c.coverImage || FALLBACK_IMAGES[c.slug] || CURATED_LOOKBOOKS_PRESETS[0].imageUrl,
      productCount: typeof c.productCount === "number" && c.productCount > 0 ? c.productCount : 12,
      category: c.slug.includes("wedding") ? "wedding" : c.slug.includes("trending") || c.slug.includes("todays") ? "festive" : "all",
      isFeatured: c.slug === "todays-edit" || c.slug === "trending-in-kochi",
    }));

    // Combine DB collections with high-quality curated lookbooks presets without duplicating slugs
    const existingSlugs = new Set(dbMapped.map((c: any) => c.slug));
    const supplemental = CURATED_LOOKBOOKS_PRESETS.filter((p) => !existingSlugs.has(p.slug));

    return [...dbMapped, ...supplemental];
  }, [rawCollections]);

  const filteredLookbooks = useMemo(() => {
    if (activeCategory === "all") return allLookbooks;
    return allLookbooks.filter((c: any) => c.category === activeCategory || c.category === "all");
  }, [allLookbooks, activeCategory]);

  const featuredSpotlight = useMemo(() => {
    return allLookbooks.find((c: any) => c.isFeatured) || allLookbooks[0];
  }, [allLookbooks]);

  const remainingLookbooks = useMemo(() => {
    if (!featuredSpotlight) return filteredLookbooks;
    // In "all" tab, don't repeat the hero spotlight in the main grid
    if (activeCategory === "all") {
      return filteredLookbooks.filter((c: any) => c.id !== featuredSpotlight.id);
    }
    return filteredLookbooks;
  }, [filteredLookbooks, featuredSpotlight, activeCategory]);

  if (rawCollections === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-stone-900">
        <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="font-serif italic text-lg text-stone-500 animate-pulse">
          Curating boutique lookbooks...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAF9F6] min-h-screen pb-20">
      {/* ── Magazine-Style Editorial Hero ─────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-stone-100/90 via-[#FAF8F5] to-[#FAF9F6] border-b border-stone-200/60 pt-8 pb-10 md:pt-14 md:pb-14">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 w-full flex flex-col gap-4 text-left">
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9.5px] font-extrabold text-amber-900 bg-amber-400/20 border border-amber-400/40 uppercase tracking-[0.25em]">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Curated Lookbooks
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col gap-2 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-stone-950 tracking-tight leading-[1.15]">
                Curated Fashion for <br className="hidden sm:inline" />
                <span className="italic font-normal text-amber-700">Every Occasion.</span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
                Capsule wardrobes, festive drops, and designer edits curated directly from verified local boutiques across Kochi.
              </p>
            </div>

            <Link
              href="/products"
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-xs font-bold text-stone-900 shadow-2xs transition-all group"
            >
              <span>Explore All Products</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-1 group-hover:text-stone-900 transition-all" />
            </Link>
          </div>

          {/* Value Props Strip */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-4 border-t border-stone-200/60 mt-2 text-[11px] font-semibold text-stone-600">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-600" />
              <span>90-Min Delivery in Kochi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Direct Boutique Catalogs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>100% Authentic Quality</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Container ───────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 w-full pt-8 space-y-8">
        
        {/* ── Lead Featured Lookbook Banner (Panoramic Spotlight) ──────── */}
        {featuredSpotlight && activeCategory === "all" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
            <CollectionCard
              collection={featuredSpotlight}
              variant="featured"
            />
          </div>
        )}

        {/* ── Category Filter Rail ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none border-b border-stone-200/70 pt-2">
          <div className="flex items-center gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeCategory === tab.id
                    ? "bg-stone-950 text-white shadow-xs"
                    : "bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-bold text-stone-400 shrink-0 hidden sm:block">
            {filteredLookbooks.length} Lookbooks
          </span>
        </div>

        {/* ── Curated Lookbooks Grid ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {remainingLookbooks.map((lookbook: any, idx: number) => (
            <div
              key={lookbook.id}
              className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
              style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
            >
              <CollectionCard collection={lookbook} />
            </div>
          ))}
        </div>

        {/* ── Empty State Fallback ────────────────────────────────────── */}
        {remainingLookbooks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-white rounded-3xl border border-stone-200/80 p-8 shadow-xs">
            <Compass className="w-8 h-8 text-stone-400" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No lookbooks found in this category
            </h3>
            <p className="text-xs text-stone-500 max-w-sm">
              Try selecting "All Lookbooks" to view our complete curation of Kerala boutique styles.
            </p>
            <button
              onClick={() => setActiveCategory("all")}
              className="mt-2 px-5 py-2 rounded-full bg-stone-950 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              View All Lookbooks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
