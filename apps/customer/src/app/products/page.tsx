"use client";

import React, { useState } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { OccasionRail } from "@/components/home/OccasionRail";
import { ProductGrid } from "@/components/product/ProductGrid";
import { mockProducts } from "@/lib/mockProducts";
import { SlidersHorizontal, Package } from "lucide-react";

export default function ProductsPage() {
  const [selectedOccasion, setSelectedOccasion] = useState("all");

  return (
    <CatalogLayout
      breadcrumbs={[{ label: "All Products" }]}
    >
      {/* ── Page Header ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-white via-[#FFFDF5] to-[#FFF3CC]/20 border-b border-hive-border/60 py-12 lg:py-16">
        {/* Faint honeycomb */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.06]">
          <svg className="w-full h-full" aria-hidden="true">
            <defs>
              <pattern
                id="products-hc"
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
            <rect width="100%" height="100%" fill="url(#products-hc)" />
          </svg>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full flex flex-col gap-5">
          <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-[10px] font-extrabold text-hive-amber bg-hive-gold/10 border border-hive-gold/25 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />
            BOUTIQUE MARKETPLACE
          </span>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl md:text-4xl font-serif font-extrabold text-hive-dark tracking-tight">
                All Products
              </h1>
              <p className="text-sm text-hive-text-muted max-w-md leading-relaxed">
                Every piece, every occasion — handpicked from verified boutiques
                near you.
              </p>
            </div>

            <div className="flex items-center gap-5 pb-1">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-hive-gold" />
                <span className="text-xs font-bold text-hive-dark">
                  {mockProducts.length} Products
                </span>
              </div>
              <div className="flex items-center gap-2 text-hive-text-muted">
                <SlidersHorizontal className="w-4 h-4 text-hive-gold" />
                <span className="text-xs font-medium">Filter by Occasion</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Occasion Filter Rail ── */}
      <div className="border-b border-hive-border/60 bg-white/80 backdrop-blur-sm sticky top-[64px] z-20">
        <OccasionRail
          selectedOccasion={selectedOccasion}
          onOccasionChange={setSelectedOccasion}
        />
      </div>

      {/* ── Product Grid ── */}
      <ProductGrid
        products={mockProducts}
        selectedOccasion={selectedOccasion}
        onResetFilter={() => setSelectedOccasion("all")}
      />
    </CatalogLayout>
  );
}
