import React from "react";
import Link from "next/link";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CollectionCard } from "@/components/catalog/CollectionCard";
import { mockCollections } from "@/lib/mockCollections";
import { ArrowRight, Grid2x2, LayoutGrid } from "lucide-react";

export const metadata = {
  title: "Style Boards — Hive by TailorBee",
  description:
    "Browse curated boutique fashion style boards for every occasion — weddings, festivals, workwear, and more. Delivered same-day in Kochi.",
};

export default function CollectionsPage() {
  const featured = mockCollections.filter((c) => c.isFeatured);
  const rest = mockCollections.filter((c) => !c.isFeatured);

  return (
    <CatalogLayout>
      {/* ── Page Header ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#FFFDF5] via-white to-[#FFF3CC]/30 border-b border-hive-border/60 py-14 lg:py-20">
        {/* Faint honeycomb background */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.07]">
          <svg className="w-full h-full" aria-hidden="true">
            <defs>
              <pattern
                id="collections-hc"
                patternUnits="userSpaceOnUse"
                width="52"
                height="90"
              >
                <path
                  fill="none"
                  stroke="#F5A623"
                  strokeWidth="1.5"
                  d="m0,15 26-15 26,15v30l-26,15-26-15z M26,60v30"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#collections-hc)" />
          </svg>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full flex flex-col gap-4">
          <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-[10px] font-extrabold text-hive-amber bg-hive-gold/10 border border-hive-gold/25 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-gold animate-pulse" />
            BOUTIQUE STYLE BOARDS
          </span>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-hive-dark tracking-tight leading-tight">
                Curated for Every
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-hive-amber to-hive-gold">
                  Occasion.
                </span>
              </h1>
              <p className="text-base text-hive-text-muted max-w-lg leading-relaxed">
                Eight hand-picked style boards from verified local boutiques.
                Each piece tells a story of craft, culture, and care.
              </p>
            </div>

            <Link
              href="/products"
              className="self-start sm:self-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hive-amber hover:text-hive-gold transition-colors group"
            >
              All Products
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Quick stats strip */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-hive-border/50 mt-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-hive-gold" />
              <span className="text-xs font-bold text-hive-dark">
                {mockCollections.length} Style Boards
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Grid2x2 className="w-4 h-4 text-hive-gold" />
              <span className="text-xs font-bold text-hive-dark">
                {mockCollections.reduce((s, c) => s + c.productCount, 0)}+ Pieces
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Collection Grid ── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full py-12 flex flex-col gap-12">
        {/* Featured row */}
        {featured.length > 0 && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-hive-amber uppercase tracking-widest">
                Featured Style Boards
              </span>
              <div className="flex-1 h-px bg-hive-border/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {featured.map((col) => (
                <CollectionCard key={col.slug} collection={col} />
              ))}
            </div>
          </div>
        )}

        {/* All collections row */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-hive-amber uppercase tracking-widest">
              All Style Boards
            </span>
            <div className="flex-1 h-px bg-hive-border/50" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {rest.map((col) => (
              <CollectionCard key={col.slug} collection={col} />
            ))}
          </div>
        </div>
      </div>
    </CatalogLayout>
  );
}
