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
  let rawPrice = p.price || 0;
  let rawCompare = p.compareAtPrice;
  if (rawPrice >= 10000) rawPrice = Math.round(rawPrice / 100);
  if (rawCompare && rawCompare >= 10000) rawCompare = Math.round(rawCompare / 100);

  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  let price = hasDiscount ? p.discountPrice! : rawPrice;
  if (hasDiscount && price >= 10000) price = Math.round(price / 100);
  const compareAtPrice = hasDiscount ? rawPrice : undefined;

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
          {banners.length === 0 ? null : banners.length === 1 ? (
                // Single Full-Bleed Graphic Image Banner
                <div
                  className="banner-card group relative w-full aspect-[2/1] sm:aspect-[16/6] md:aspect-[21/7] rounded-2xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 transform transition-all duration-500 cursor-pointer"
                  onClick={() => {
                    if (banners[0].targetUrl) router.push(banners[0].targetUrl);
                  }}
                >
                  {/* Desktop Image */}
                  <div className="hidden sm:block absolute inset-0 w-full h-full">
                    <Image
                      src={banners[0].desktopImage || banners[0].mobileImage || "https://placehold.co/800x400/FF0000/FFFFFF?text=MISSING+BANNER"}
                      alt={banners[0].title || "Editorial Banner"}
                      fill
                      sizes="100vw"
                      className="object-cover pointer-events-none transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                    />
                  </div>
                  {/* Mobile Image */}
                  <div className="sm:hidden absolute inset-0 w-full h-full">
                    <Image
                      src={banners[0].mobileImage || banners[0].desktopImage || "https://placehold.co/800x400/FF0000/FFFFFF?text=MISSING+BANNER"}
                      alt={banners[0].title || "Editorial Banner"}
                      fill
                      sizes="100vw"
                      className="object-cover pointer-events-none transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                    />
                  </div>
                  <div className="sheen-glow" />
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
                          src={banner.desktopImage || "https://placehold.co/800x400/FF0000/FFFFFF?text=MISSING+BANNER"}
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
                            src={banner.mobileImage || banner.desktopImage || "https://placehold.co/800x400/FF0000/FFFFFF?text=MISSING+BANNER"}
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
    const isTwoGrid = block.renderer === "twoProductGrid";
    const isPremiumGrid = block.renderer === "premiumGrid";

    if (isPremiumGrid) {
      return (
        <section className="w-full bg-[#111111] text-white py-12 md:py-16">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col items-center gap-10">
            <div className="flex flex-col items-center text-center max-w-2xl gap-3">
              <span className="text-[10px] tracking-[0.25em] text-white/50 uppercase font-bold">Premium Segment</span>
              <h2 className="text-3xl md:text-5xl font-serif font-light tracking-tight">
                {block.title || block.data.collection?.name}
              </h2>
              {block.subtitle && <p className="text-sm md:text-base text-white/60 font-light mt-2">{block.subtitle}</p>}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-16 w-full">
              {blockProducts.slice(0, block.config?.maxProducts || 6).map((product: any) => (
                <div key={product.id} className="premium-card-wrapper scale-100 transition-transform duration-700 hover:scale-[1.02]">
                  <ProductCard product={product} hidePrice={true} />
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <button 
                onClick={() => {
                  if(block.data.collection?.slug) {
                    router.push(`/collections/${block.data.collection.slug}`);
                  }
                }}
                className="px-8 py-3 bg-white text-black text-xs uppercase tracking-widest font-bold hover:bg-white/90 transition-colors"
              >
                Discover Collection
              </button>
            </div>
          </div>
        </section>
      );
    }

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
          ) : isTwoGrid ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-3xl mx-auto">
              {blockProducts.slice(0, block.config?.maxProducts || 2).map((product: any) => (
                <ProductCard key={product.id} product={product} />
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

  // 4. RECENTLY VIEWED / RECOMMENDED / NEW ARRIVALS
  if (block.blockType === "recentlyViewed" || block.blockType === "recommended" || block.blockType === "newArrivals") {
    const mostLovedProducts = (block.data.products || [])
      .filter((p: any) => p.active !== false && p.stock !== 0)
      .map(mapDbProduct);
      
    if (mostLovedProducts.length === 0) return null;
    
    const isRecommended = block.blockType === "recommended";
    const isNewArrivals = block.blockType === "newArrivals";
    const bgClass = isNewArrivals ? "bg-white" : (isRecommended ? "bg-white" : "bg-[#FAF6F0]");
    const tagText = isNewArrivals ? "FRESH ARRIVALS" : (isRecommended ? "CURATED FOR YOU" : "CUSTOMER FAVORITES");
    
    return (
      <section className={`w-full ${bgClass} py-6 border-b border-hive-border/20`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
              {tagText}
            </span>
            <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
              {block.title || (isNewArrivals ? "New on Hive" : (isRecommended ? "Recommended" : "Most Loved"))}
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

  // 6. PINTEREST VIBE GRID (3D POP-OUT CARD ARCHITECTURE - MATCHING REFERENCE)
  if (block.blockType === "vibeGrid") {
    const items = block.config?.items || [];
    if (items.length === 0) return null;

    return (
      <section className="w-full bg-white py-12 border-b border-hive-border/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col gap-1 mb-2">
            <span className="text-[11px] font-bold text-amber-600 tracking-widest uppercase">
              VIBE & MOOD NAVIGATION
            </span>
            {block.title && (
              <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-hive-dark uppercase tracking-tight">
                {block.title}
              </h2>
            )}
            {block.subtitle && (
              <p className="text-xs sm:text-sm text-slate-500">{block.subtitle}</p>
            )}
          </div>

          {/* Grid Layout matching reference spacing */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 pt-20 pb-6">
            {items.map((item: any, idx: number) => {
              // Curated studio gradients matching reference (Silver/Grey, Denim Blue, Warm Nude/Beige, etc.)
              const gradients = [
                "from-stone-300 via-stone-200 to-slate-300",
                "from-blue-600 via-blue-700 to-slate-800",
                "from-stone-300 via-amber-100 to-stone-200",
                "from-emerald-800 via-teal-900 to-slate-900",
                "from-rose-800 via-stone-800 to-zinc-900",
                "from-slate-800 via-slate-900 to-slate-950",
              ];
              const bgClass = item.backgroundColor || gradients[idx % gradients.length];

              const imgUrl = item.imageUrl
                ? typeof item.imageUrl === "string"
                  ? item.imageUrl
                  : item.imageUrl?.url || `https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/${item.imageUrl.objectKey}`
                : null;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (item.targetUrl) router.push(item.targetUrl);
                  }}
                  className="relative pt-16 group cursor-pointer w-full select-none"
                >
                  {/* 3D Backdrop Card (Nearly square studio background with rounded-[32px]) */}
                  <div
                    className={`relative aspect-[1/1.15] rounded-[32px] bg-gradient-to-br ${bgClass} flex flex-col justify-end p-4 shadow-lg group-hover:shadow-2xl transition-all duration-500 transform group-hover:-translate-y-2 overflow-visible`}
                  >
                    {/* 3D Pop-out Model Cutout Image (Extends WAY above top border into pt-16 space) */}
                    {imgUrl && (
                      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-visible">
                        <img
                          src={imgUrl}
                          alt={item.brandName || "Vibe"}
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[125%] sm:w-[130%] h-[145%] sm:h-[150%] object-contain object-bottom drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)] z-10 transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-1.5"
                        />
                      </div>
                    )}

                    {/* Subtle dark gradient overlay at the bottom for crisp white text contrast */}
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent rounded-b-[32px] z-10 pointer-events-none" />

                    {/* High-Fashion White Typography Overlay (NO Black Pills/Boxes!) */}
                    <div className="relative z-20 text-center pb-2 flex flex-col items-center justify-end">
                      {item.brandName && (
                        <h3 className="text-white font-serif font-black text-lg sm:text-2xl tracking-wider uppercase leading-tight drop-shadow-lg truncate w-full">
                          {item.brandName}
                        </h3>
                      )}
                      {item.offerText && (
                        <p className="text-white/95 font-sans font-extrabold text-xs sm:text-sm tracking-widest uppercase mt-0.5 drop-shadow-md">
                          {item.offerText}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return null;
}
