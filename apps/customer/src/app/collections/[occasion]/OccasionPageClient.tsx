"use client";

import React, { useState } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { OccasionRail } from "@/components/home/OccasionRail";
import { mockProducts } from "@/lib/mockProducts";
import { Collection } from "@/lib/mockCollections";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface OccasionPageClientProps {
  collection: Collection;
}

export function OccasionPageClient({ collection }: OccasionPageClientProps) {
  const [selectedOccasion, setSelectedOccasion] = useState(collection.label);

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Collections", href: "/collections" },
        { label: collection.title },
      ]}
    >
      {/* ── Collection Hero Banner ── */}
      <div className="relative w-full overflow-hidden">
        <div className="relative h-[280px] md:h-[360px] w-full">
          <img
            src={collection.imageUrl}
            alt={collection.title}
            className="object-cover w-full h-full"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-hive-dark/80 via-hive-dark/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-hive-dark/60 via-transparent to-transparent" />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end pb-8 px-6 lg:px-8 max-w-[1440px] mx-auto w-full">
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-semibold uppercase tracking-widest mb-4 transition-colors group self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Collections
            </Link>

            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none">{collection.icon}</span>
                  <span className="text-[10px] font-extrabold text-hive-gold uppercase tracking-[0.2em]">
                    Boutique Collection
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl font-serif font-extrabold text-white tracking-tight leading-tight">
                  {collection.title}
                </h1>
                <p className="text-sm text-white/70 max-w-md leading-relaxed">
                  {collection.longDescription}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-3xl font-serif font-extrabold text-hive-gold">
                  {collection.productCount}
                </span>
                <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                  Pieces
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Occasion Rail ── */}
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
        onResetFilter={() => setSelectedOccasion(collection.label)}
      />
    </CatalogLayout>
  );
}
