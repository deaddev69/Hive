"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { TrustStrip } from "@/components/trust/TrustStrip";
import { Sparkles } from "lucide-react";
import { MoodBoardGrid } from "@/components/home/MoodBoardGrid";

// Helper to deduce occasion from product tags/description
function getProductOccasion(product: any): string {
  const catName = (product.categoryName || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  
  if (name.includes("wedding") || desc.includes("wedding") || name.includes("lehenga") || catName.includes("lehengas")) {
    return "wedding";
  }
  if (name.includes("festival") || desc.includes("festival") || name.includes("saree") || catName.includes("sarees")) {
    return "festival";
  }
  if (name.includes("co-ord") || name.includes("coord") || catName.includes("coords") || catName.includes("co-ord")) {
    return "coords";
  }
  if (name.includes("kurta") || name.includes("kurti") || catName.includes("kurtis")) {
    return "ethnic";
  }
  if (name.includes("party") || desc.includes("party")) {
    return "party";
  }
  if (name.includes("date") || desc.includes("date") || name.includes("dress") || catName.includes("dresses")) {
    return "date";
  }
  if (name.includes("work") || name.includes("office")) {
    return "workwear";
  }
  return "casual";
}

// Helper to map DB product to ProductCardData interface
export function mapDbProduct(p: any) {
  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    boutiqueId: p.boutiqueId,
    boutique: p.boutique,
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || p.images?.[0] || "",
    price,
    compareAtPrice,
    rating: p.rating || 4.8,
    reviewCount: p.reviewCount || 12,
    occasion: getProductOccasion(p),
    isVerifiedBoutique: p.boutique?.verified || false,
    isNewArrival: Date.now() - p.createdAt < 7 * 24 * 60 * 60 * 1000,
    isTrending: p.featured,
    isBestSeller: p.featured,
    sameDayDelivery: p.sameDayEligible,
    videoAvailable: p.images?.length > 1,
    favorite: false,
    sizes: p.sizes || ["Free"],
    stockBySize: p.stockBySize || { Free: 5 },
    estimatedDistanceKm: p.estimatedDistanceKm,
    estimatedDurationMin: p.estimatedDurationMin,
    estimatedEtaMinutes: p.estimatedEtaMinutes,
    hiveScore: p.hiveScore,
  };
}

export function ExperienceBlockRenderer({ block }: { block: any }) {
  const router = useRouter();
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // 1. EDITORIAL BANNERS (Hero & Banners)
  if (block.blockType === "hero" || block.blockType === "banner") {
    const banners = block.data.banners || [];
    return (
      <section className="w-full bg-white pt-2 pb-1">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {banners.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[16/10] rounded-xl bg-slate-100 animate-pulse flex items-center justify-center border border-hive-border/30">
                  <Sparkles className="w-6 h-6 text-hive-amber/20 animate-spin" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-3 gap-6 w-full">
                {banners.slice(0, 3).map((banner: any, idx: number) => (
                  <div
                    key={banner._id || idx}
                    className="banner-card group relative aspect-[16/10] rounded-xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 transform transition-all duration-500 cursor-pointer"
                    style={{ animationDelay: `${idx * 150}ms` }}
                    onClick={() => {
                      if (banner.targetUrl) router.push(banner.targetUrl);
                    }}
                  >
                    <Image
                      src={banner.desktopImage || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80"}
                      alt={banner.title || "Banner"}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="sheen-glow" />
                  </div>
                ))}
              </div>
              <div className="md:hidden flex flex-col w-full pb-1">
                <div
                  ref={mobileScrollRef}
                  className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-0 -mx-6 px-6"
                >
                  {banners.map((banner: any, idx: number) => (
                    <div
                      key={banner._id || idx}
                      className="banner-card flex-shrink-0 w-full snap-center group relative aspect-[16/10] rounded-xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 transform transition-all duration-500 cursor-pointer"
                      style={{ animationDelay: `${idx * 150}ms` }}
                      onClick={() => {
                        if (banner.targetUrl) router.push(banner.targetUrl);
                      }}
                    >
                      <Image
                        src={banner.mobileImage || banner.desktopImage || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80"}
                        alt={banner.title || "Banner"}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="sheen-glow" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  // 2. CATEGORY BUBBLES
  if (block.blockType === "category") {
    const categories = block.data.categories || [];
    if (categories.length === 0) return null;
    return (
      <section className="w-full bg-white pt-2 pb-2 border-b border-hive-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-3 text-left">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
              {block.title || "Shop by Category"}
            </h2>
            {block.subtitle && <p className="text-xs text-slate-500">{block.subtitle}</p>}
          </div>
          <div className="relative group/rail w-full">
            <div
              ref={categoryScrollRef}
              className="flex gap-6 pb-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] justify-start -mx-6 px-6 sm:mx-0 sm:px-0 pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8"
            >
              {categories.map((subcat: any) => (
                <button
                  key={subcat._id}
                  onClick={() => router.push(`/collections/${subcat.slug}`)}
                  className="flex flex-col items-center gap-3 w-24 sm:w-28 flex-shrink-0 group cursor-pointer"
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-hive-border/40 bg-slate-50 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-md">
                    <Image
                      src={subcat.homepageImageUrl || subcat.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80"}
                      alt={subcat.name}
                      fill
                      sizes="96px"
                      className="object-cover pointer-events-none"
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-white text-center leading-tight truncate w-full">
                    {subcat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. COLLECTIONS (Product Grids, Carousels, MoodBoards)
  if (block.blockType === "collection") {
    // Mood Board
    if (block.renderer === "moodGrid" || block.renderer === "editorialGrid") {
      if (block.data.collection && block.data.products) {
        const displayCols = [ { ...block.data.collection, products: block.data.products.map(mapDbProduct) } ];
        return <MoodBoardGrid title={block.title} subtitle={block.subtitle} collections={displayCols} />;
      }
      return null;
    }

    let blockProducts = (block.data.products || [])
      .filter((p: any) => p.active !== false && p.stock !== 0)
      .map(mapDbProduct);

    if (!blockProducts || blockProducts.length === 0) return null;

    const isCarousel = block.renderer === "productCarousel";

    return (
      <section className={`w-full bg-white py-6 border-b border-hive-border/20 ${block.config?.theme === "dark" ? "bg-slate-900 text-white" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
          <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => {
            if(block.data.collection?.slug) {
              router.push(`/collections/${block.data.collection.slug}`);
            }
          }}>
            <h2 className={`text-2xl font-serif font-semibold uppercase tracking-wide group-hover:underline ${block.config?.theme === "dark" ? "text-white" : "text-hive-dark"}`}>
              {block.title || block.data.collection?.name}
            </h2>
            {block.subtitle && <p className={`text-sm ${block.config?.theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{block.subtitle}</p>}
          </div>

          {isCarousel ? (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8">
              {blockProducts.map((product: any) => (
                <div key={product.id} className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full">
              {blockProducts.slice(0, block.config?.maxProducts || 12).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // 4. RECENTLY VIEWED / MOST LOVED
  if (block.blockType === "recentlyViewed") {
    const mostLovedProducts = (block.data.products || [])
      .filter((p: any) => p.active !== false && p.stock !== 0)
      .map(mapDbProduct);
      
    if (mostLovedProducts.length === 0) return null;
    return (
      <section className="w-full bg-[#FAF6F0] py-6 border-b border-hive-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
              CUSTOMER FAVORITES
            </span>
            <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
              {block.title || "Most Loved"}
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8">
            {mostLovedProducts.map((product: any) => (
              <div key={product.id} className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 5. TRUST STRIP
  if (block.blockType === "trust") {
    return <TrustStrip />;
  }

  return null;
}
