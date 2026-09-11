"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { PartnerShowcaseCard, Marquee } from "@hive/ui";
import { Sparkles, ArrowRight } from "lucide-react";

export function PartnerShowcaseSection() {
  const showcase = useQuery(api.about.getPartnerShowcase);

  // If loading, render null to prevent layout flicker
  if (showcase === undefined) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-hive-gold/30 border-t-hive-gold animate-spin" />
      </div>
    );
  }

  // Tri-state rule: If explicitly empty or no active brands, suppress section entirely
  if (showcase.isExplicitlyEmpty || showcase.brands.length === 0) {
    return null;
  }

  const { brands } = showcase;

  return (
    <section className="relative w-full py-16 sm:py-24 overflow-hidden bg-hive-dark text-hive-cream rounded-3xl border border-white/10 shadow-2xl my-16 sm:my-20">
      {/* Editorial Decorative Ambience */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-hive-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 mb-10 sm:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-hive-gold text-[11px] font-semibold uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-hive-gold" />
              <span>Partner Brands &amp; Designers</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-hive-cream leading-tight">
              The Labels Shaping Kochi&apos;s Style
            </h2>
            <p className="text-sm sm:text-base text-hive-cream/70 max-w-xl font-medium leading-relaxed">
              Curated collections from Kochi&apos;s finest independent fashion houses, designer studios, and homegrown labels — delivered to your doorstep in 90 minutes.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-hive-gold hover:text-hive-cream transition-colors group shrink-0"
          >
            <span>Explore All Collections</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Marquee Track */}
      <div className="w-full">
        <Marquee speedSeconds={38} pauseOnHover={true} gap="1.5rem" maskGradients={true}>
          {brands.map((brand: any) => (
            <Link
              key={brand._id}
              href={`/shop/${brand.slug || brand._id}`}
              className="block outline-none focus-visible:ring-2 focus-visible:ring-hive-gold rounded-2xl sm:rounded-3xl"
              tabIndex={0}
              aria-label={`View collection by ${brand.name}`}
            >
              <PartnerShowcaseCard brand={brand} />
            </Link>
          ))}
        </Marquee>
      </div>

      {/* Footer Sub-Note */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-hive-cream/50 font-medium">
        <p className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live catalog updated directly from brand studios in Kochi &amp; Ernakulam.</span>
        </p>
        <p className="text-[11px] text-hive-cream/50">
          90-Min Direct Courier Fulfillment
        </p>
      </div>
    </section>
  );
}
