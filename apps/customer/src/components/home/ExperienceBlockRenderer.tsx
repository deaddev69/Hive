"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
  // DB stores all prices in PAISE — always divide by 100 for display in Rupees
  let rawPrice = (p.price || 0) / 100;
  let rawCompare = p.compareAtPrice ? p.compareAtPrice / 100 : undefined;

  const hasDiscount = p.discountPrice !== undefined && p.discountPrice !== null && p.discountPrice < p.price;
  let price = hasDiscount ? p.discountPrice! / 100 : rawPrice;
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

// ── HERO & EDITORIAL BANNER CAROUSEL ──────────────────────────────────────────
function HeroBannerCarousel({ banners }: { banners: any[] }) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToIdx = useCallback((idx: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const items = container.children;
    if (items[idx]) {
      const child = items[idx] as HTMLElement;
      child.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      setActiveIdx(idx);
    }
  }, []);

  // Smooth horizontal auto-slide timer (4s interval)
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % banners.length;
        if (scrollRef.current) {
          const container = scrollRef.current;
          const items = container.children;
          if (items[next]) {
            const child = items[next] as HTMLElement;
            child.scrollIntoView({
              behavior: "smooth",
              inline: "center",
              block: "nearest",
            });
          }
        }
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.clientWidth;
    if (itemWidth > 0) {
      const newIdx = Math.round(scrollLeft / itemWidth);
      if (newIdx >= 0 && newIdx < banners.length && newIdx !== activeIdx) {
        setActiveIdx(newIdx);
      }
    }
  };

  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <section className="w-full bg-white pt-1 pb-0.5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div
            className="banner-card group relative w-full aspect-[2/1] sm:aspect-none sm:h-[220px] md:h-[250px] lg:h-[270px] rounded-2xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 transform transition-all duration-500 cursor-pointer"
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
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white pt-1 pb-1">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-3 gap-6 w-full">
          {banners.slice(0, 3).map((banner: any, idx: number) => (
            <div
              key={banner._id || idx}
              className="banner-card group relative aspect-[16/8] md:h-[180px] lg:h-[200px] rounded-xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 transform transition-all duration-500 cursor-pointer"
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

        {/* Mobile Horizontal Auto-Slide Carousel */}
        <div 
          className="md:hidden flex flex-col w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-0 -mx-6 px-6 scroll-smooth"
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

          {/* Dots Indicator */}
          {banners.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToIdx(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIdx ? "w-5 bg-[#E8890C]" : "w-1.5 bg-stone-300 hover:bg-stone-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ExperienceBlockRenderer({ block }: { block: any }) {
  const router = useRouter();
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // 1. EDITORIAL BANNERS (Hero & Banners)
  if (block.blockType === "hero" || block.blockType === "banner") {
    const banners = block.data.banners || [];
    return <HeroBannerCarousel banners={banners} />;
  }

  // 2. CATEGORY BUBBLES
  if (block.blockType === "category") {
    const categories = block.data.categories || [];
    if (categories.length === 0) return null;
    return (
      <section className="w-full bg-white py-4 sm:py-6 border-b border-hive-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-2 text-left">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-serif font-semibold text-hive-dark tracking-wide">
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
      const bgImg = block.data?.bgImage || block.config?.bgImage || block.config?.desktopImage;
      const bgImgUrl = bgImg
        ? typeof bgImg === "string"
          ? bgImg
          : bgImg.url || (bgImg.objectKey ? `https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/${bgImg.objectKey}` : null)
        : null;

      const bgOverlayTheme = block.config?.bgOverlayTheme || "light";
      const isLightBg = bgOverlayTheme === "light";
      const cardCtaText = block.config?.cardCtaText || "Take a closer look →";

      const badgeTitle = block.config?.badgeTitle?.trim();
      const blockTitle = block.title?.trim();
      const blockSubtitle = block.subtitle?.trim();
      const hasHeader = Boolean(badgeTitle || blockTitle || blockSubtitle);

      return (
        <section className={`relative w-full overflow-hidden pt-10 pb-8 sm:pt-14 sm:pb-12 ${isLightBg ? "bg-[#FAF7F2]" : "bg-[#111111]"}`}>
          {/* Top Soft Feather Gradient Blend Layer for Seamless Section Transition */}
          <div className={`absolute top-0 inset-x-0 h-10 md:h-16 z-[2] pointer-events-none ${
            isLightBg 
              ? "bg-gradient-to-b from-white via-white/50 to-transparent" 
              : "bg-gradient-to-b from-slate-900/80 via-black/40 to-transparent"
          }`} />

          {/* Background Image / Pattern Overlay */}
          {bgImgUrl && (
            <div className="absolute inset-0 w-full h-full z-0">
              <Image
                src={bgImgUrl}
                alt={blockTitle || "Premium Curation Background"}
                fill
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className={`absolute inset-0 ${isLightBg ? "bg-[#FAF7F2]/30" : "bg-black/55 backdrop-blur-[1px]"}`} />
            </div>
          )}

          {/* Left Jaipur Kalka Paisley Block-Print Watermark */}
          <div className="absolute top-0 left-0 w-32 sm:w-52 h-52 pointer-events-none z-[1] opacity-35 select-none overflow-hidden">
            <svg className="w-full h-full text-amber-900/60" viewBox="0 0 120 140" fill="none" stroke="currentColor">
              {/* Outer Scalloped Paisley Contour */}
              <path
                d="M25 125 C 10 95, 20 50, 60 20 C 85 2, 105 20, 85 45 C 65 70, 35 75, 42 105 C 48 128, 75 120, 65 135 Z"
                fill="currentColor"
                fillOpacity="0.06"
                strokeWidth="1.2"
              />
              {/* Inner Paisley Body */}
              <path
                d="M32 115 C 20 90, 28 52, 60 28 C 78 12, 92 26, 78 45 C 62 65, 38 68, 44 94 C 48 112, 65 108, 58 120 Z"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              {/* Central Lotus Flower Core */}
              <circle cx="58" cy="42" r="8" fill="currentColor" fillOpacity="0.12" strokeWidth="1" />
              <circle cx="58" cy="42" r="3" fill="currentColor" fillOpacity="0.25" />
              {/* Lotus Petals */}
              <path d="M58 30 C 56 34, 56 38, 58 42 C 60 38, 60 34, 58 30 Z" fill="currentColor" fillOpacity="0.2" />
              <path d="M58 42 C 62 40, 66 40, 70 42 C 66 44, 62 44, 58 42 Z" fill="currentColor" fillOpacity="0.2" />
              <path d="M58 42 C 56 46, 56 50, 58 54 C 60 50, 60 46, 58 42 Z" fill="currentColor" fillOpacity="0.2" />
              <path d="M46 42 C 50 40, 54 40, 58 42 C 54 44, 50 44, 46 42 Z" fill="currentColor" fillOpacity="0.2" />
              {/* Scalloped Dot Micro-Borders */}
              <circle cx="28" cy="100" r="1.5" fill="currentColor" />
              <circle cx="24" cy="85" r="1.5" fill="currentColor" />
              <circle cx="26" cy="70" r="1.5" fill="currentColor" />
              <circle cx="34" cy="55" r="1.5" fill="currentColor" />
              <circle cx="46" cy="40" r="1.5" fill="currentColor" />
              <circle cx="62" cy="28" r="1.5" fill="currentColor" />
              <circle cx="75" cy="24" r="1.5" fill="currentColor" />
              {/* Curling Tendril Vines & Leaf Buds */}
              <path d="M42 105 C 30 115, 18 108, 12 95 C 8 85, 15 78, 22 84" strokeWidth="1" strokeLinecap="round" />
              <circle cx="12" cy="95" r="2" fill="currentColor" />
              <circle cx="22" cy="84" r="1.5" fill="currentColor" />
            </svg>
          </div>

          {/* Right Mughal Floral Vignette Block-Print Watermark */}
          <div className="absolute top-0 right-0 w-32 sm:w-52 h-52 pointer-events-none z-[1] opacity-35 select-none overflow-hidden">
            <svg className="w-full h-full text-amber-900/60" viewBox="0 0 120 140" fill="none" stroke="currentColor">
              {/* Central Mughal Floral Blossom */}
              <circle cx="65" cy="45" r="14" fill="currentColor" fillOpacity="0.08" strokeWidth="1.2" />
              <circle cx="65" cy="45" r="6" fill="currentColor" fillOpacity="0.2" strokeWidth="0.8" />
              <circle cx="65" cy="45" r="2" fill="currentColor" />
              {/* 8 Radiating Floral Petals */}
              <path d="M65 27 C 62 33, 62 39, 65 45 C 68 39, 68 33, 65 27 Z" fill="currentColor" fillOpacity="0.18" />
              <path d="M65 45 C 71 42, 77 42, 83 45 C 77 48, 71 48, 65 45 Z" fill="currentColor" fillOpacity="0.18" />
              <path d="M65 45 C 62 51, 62 57, 65 63 C 68 57, 68 51, 65 45 Z" fill="currentColor" fillOpacity="0.18" />
              <path d="M47 45 C 53 42, 59 42, 65 45 C 59 48, 53 48, 47 45 Z" fill="currentColor" fillOpacity="0.18" />
              {/* Corner Botanical Vines & Leaves */}
              <path d="M65 63 C 75 80, 90 95, 105 105" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M78 74 C 88 72, 96 78, 92 86 C 84 88, 78 80, 78 74 Z" fill="currentColor" fillOpacity="0.15" strokeWidth="0.8" />
              <path d="M88 88 C 98 86, 106 92, 102 100 C 94 102, 88 94, 88 88 Z" fill="currentColor" fillOpacity="0.15" strokeWidth="0.8" />
              {/* Micro-Pistil Dots */}
              <circle cx="65" cy="23" r="1.5" fill="currentColor" />
              <circle cx="87" cy="45" r="1.5" fill="currentColor" />
              <circle cx="65" cy="67" r="1.5" fill="currentColor" />
              <circle cx="43" cy="45" r="1.5" fill="currentColor" />
            </svg>
          </div>

          <div className={`relative z-10 max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col items-center gap-8 ${isLightBg ? "text-amber-950" : "text-white"}`}>
            {/* Luxury Header - Only rendered if at least one header field is provided */}
            {hasHeader && (
              <div className="flex flex-col items-center text-center max-w-2xl gap-1.5 pt-2">
                {badgeTitle && (
                  <span className={`text-[10px] tracking-[0.3em] font-bold uppercase ${isLightBg ? "text-amber-800" : "text-amber-400"}`}>
                    {badgeTitle}
                  </span>
                )}
                
                {blockTitle && (
                  <h2 className={`text-3xl md:text-5xl lg:text-6xl font-cormorant font-normal tracking-tight ${isLightBg ? "text-stone-900" : "text-white"} leading-[1.15] drop-shadow-xs`}>
                    {blockTitle}
                  </h2>
                )}
                
                {blockSubtitle && (
                  <p className={`text-sm md:text-base lg:text-lg font-cormorant italic mt-1 ${isLightBg ? "text-stone-600" : "text-stone-300"} font-normal leading-relaxed`}>
                    {blockSubtitle}
                  </p>
                )}
              </div>
            )}

            {/* Floating Borderless Standalone Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 w-full mt-2">
              {blockProducts.slice(0, block.config?.maxProducts || 6).map((product: any) => (
                <div key={product.id} className="premium-card-wrapper scale-100 transition-transform duration-500 hover:-translate-y-1 bg-transparent p-0 border-none shadow-none">
                  <ProductCard 
                    product={product} 
                    hidePrice={true} 
                    hideQuickView={true} 
                    darkTheme={!isLightBg}
                    customCtaText={cardCtaText}
                    premiumMode={true}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className={`w-full bg-white pt-5 pb-1 sm:pt-8 sm:pb-2 border-b border-hive-border/20 ${block.config?.theme === "dark" ? "bg-slate-900 text-white" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-2 sm:gap-2.5 text-left">
          <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => {
            if(block.data.collection?.slug) {
              router.push(`/collections/${block.data.collection.slug}`);
            }
          }}>
            <h2 className={`text-2xl font-serif font-semibold tracking-wide group-hover:underline ${block.config?.theme === "dark" ? "text-white" : "text-hive-dark"}`}>
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
      <section className={`w-full ${bgClass} pt-1 pb-4 sm:pt-1.5 sm:pb-6 border-b border-hive-border/20`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-2 sm:gap-2.5 text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
              {tagText}
            </span>
            <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
              {block.title || (isNewArrivals ? "New on Hive" : (isRecommended ? "Recommended" : "Most Loved"))}
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-0 -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8">
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

  // 6. PINTEREST VIBE GRID (PURE TRANSPARENT CUTOUT ARCHITECTURE - NO BACKGROUND BOX)
  if (block.blockType === "vibeGrid") {
    const items = block.config?.items || [];
    if (items.length === 0) return null;

    return (
      <section className="w-full bg-white pt-1 pb-0 sm:pt-1.5 sm:pb-0.5 border-b border-hive-border/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {block.title && (
            <h2 className="text-lg sm:text-xl font-serif font-medium text-slate-800 tracking-normal mb-0.5">
              {block.title}
            </h2>
          )}
          {block.subtitle && (
            <p className="text-xs text-slate-500 mb-1">{block.subtitle}</p>
          )}

          {/* Pure Cutout Layout: Mobile Edge-to-Edge Swipe Rail / Desktop Flex Row */}
          <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible gap-4 sm:gap-6 mt-1 mb-0 pb-1 -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-pl-6">
            {items.map((item: any, idx: number) => {
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
                  className="relative group cursor-pointer flex flex-col items-center justify-start select-none w-28 sm:w-32 md:w-36 flex-shrink-0 snap-start transition-transform duration-300 transform group-hover:-translate-y-1"
                >
                  {/* Standalone Model Cutout Image (Dynamic Height, Zero White Space Gap) */}
                  {imgUrl && (
                    <div className="relative w-full h-auto flex items-start justify-center overflow-visible">
                      <img
                        src={imgUrl}
                        alt={item.brandName || "Vibe Cutout"}
                        className="w-full h-auto max-h-56 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {/* Clean Typography Underlay */}
                  <div className="text-center mt-1.5 flex flex-col items-center justify-center w-full">
                    {item.brandName && (
                      <h3 className="text-slate-900 font-serif font-bold text-xs sm:text-sm tracking-wider uppercase leading-tight truncate w-full">
                        {item.brandName}
                      </h3>
                    )}
                    {item.offerText && (
                      <span className="text-amber-600 font-sans font-extrabold text-[9px] sm:text-[10px] tracking-widest uppercase mt-0.5">
                        {item.offerText}
                      </span>
                    )}
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
