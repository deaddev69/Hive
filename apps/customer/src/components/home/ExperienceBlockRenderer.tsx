"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { TrustStrip } from "@/components/trust/TrustStrip";
import { Sparkles, ArrowRight } from "lucide-react";
import { MoodBoardGrid } from "@/components/home/MoodBoardGrid";
import { calculateDisplayPricing } from "@/lib/pricing";
// Canonical public image URL builder, shared with the Convex backend so client
// and server agree on domain and transformation parameters.
import { getPublicUrl } from "../../../../../convex/media/urls";

/** Shown only when a merchandiser has left a banner slot without an image. */
const FALLBACK_BANNER = "https://placehold.co/800x400/FF0000/FFFFFF?text=MISSING+BANNER";

/** Tailwind's `sm` breakpoint — keep in sync with the aspect-ratio switch below. */
const HERO_DESKTOP_MEDIA = "(min-width: 640px)";

/**
 * Art-directed banner image.
 *
 * Renders one <picture> with a desktop <source> and a mobile fallback <img>, so
 * the browser downloads exactly one of the two variants. Both candidates keep
 * Next's optimizer output (srcSet/sizes) via getImageProps.
 *
 * Pass `priority` for the LCP banner only — it preloads the single chosen
 * candidate. Everything below the fold should leave it off and lazy-load.
 */
function HeroPicture({
  desktopSrc,
  mobileSrc,
  alt,
  priority = false,
  className = "object-cover object-center",
}: {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const common = { alt, fill: true, sizes: "100vw", priority, quality: 80 } as const;

  const { props: desktop } = getImageProps({ ...common, src: desktopSrc });
  const { props: mobile } = getImageProps({ ...common, src: mobileSrc });

  return (
    <picture>
      <source media={HERO_DESKTOP_MEDIA} srcSet={desktop.srcSet} sizes={desktop.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes through ...mobile */}
      <img
        {...mobile}
        className={`absolute inset-0 w-full h-full pointer-events-none transform transition-transform duration-700 ease-out group-hover:scale-[1.02] ${className}`}
      />
    </picture>
  );
}

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

// Helper to map DB product or ResolvedProduct DTO to ProductCardData interface
export function mapDbProduct(p: any) {
  const { price, compareAtPrice, discountPercent } = calculateDisplayPricing(p);

  return {
    id: p._id || p.id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || p.boutique?.boutiqueName || "Unknown Boutique",
    boutiqueId: p.boutiqueId,
    boutique: p.boutique,
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || p.images?.[0] || "",
    price,
    compareAtPrice,
    discountPercent,
    rating: p.rating || undefined,
    reviewCount: p.reviewCount || undefined,
    occasion: getProductOccasion(p),
    isVerifiedBoutique: p.boutique?.verified || false,
    isNewArrival: (p.createdAt && (Date.now() - p.createdAt < 14 * 24 * 60 * 60 * 1000)) || false,
    isTrending: p.featured || false,
    isBestSeller: p.featured || false,
    sameDayDelivery: p.sameDayEligible ?? true,
    videoAvailable: p.images?.length > 1,
    favorite: false,
    sizes: p.sizes || ["Free"],
    stockBySize: p.stockBySize || { Free: 5 },
    estimatedDistanceKm: p.distanceKm || p.estimatedDistanceKm,
    estimatedDurationMin: p.etaMinutes || p.estimatedDurationMin,
    estimatedEtaMinutes: p.etaMinutes || p.estimatedEtaMinutes,
    hiveScore: p.hiveScore,
    deliveryLabel: p.deliveryLabel,
  };
}

// ── HERO & EDITORIAL BANNER CAROUSEL ──────────────────────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function HeroBannerCarousel({ banners }: { banners: any[] }) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollToIdx = useCallback((idx: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const items = container.children;
    if (items[idx]) {
      const child = items[idx] as HTMLElement;
      container.scrollTo({
        left: child.offsetLeft,
        behavior: "smooth",
      });
      setActiveIdx(idx);
    }
  }, []);

  // Smooth horizontal auto-slide timer (4s interval)
  useEffect(() => {
    if (banners.length <= 1 || isPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % banners.length;
        if (scrollRef.current) {
          const container = scrollRef.current;
          const items = container.children;
          if (items[next]) {
            const child = items[next] as HTMLElement;
            container.scrollTo({
              left: child.offsetLeft,
              behavior: "smooth",
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
            className="banner-card group relative w-full aspect-[2/1] sm:aspect-[2.4/1] rounded-2xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 transform transition-all duration-500 cursor-pointer"
            onClick={() => {
              if (banners[0].targetUrl) router.push(banners[0].targetUrl);
            }}
          >
            {/*
              Art-directed hero, rendered as a real <picture> rather than two
              CSS-hidden <Image> elements.

              The previous markup showed one variant per breakpoint with
              `hidden sm:block` / `sm:hidden`, and marked BOTH `priority`. A
              CSS-hidden <img> is still downloaded by the browser, so every
              visitor fetched both variants — and `priority` added a preload for
              each on top, so the two competed against each other for bandwidth
              at the exact moment the LCP element needed it.

              <source media> is the only mechanism that actually prevents the
              unused fetch: the browser picks one candidate and never requests
              the other. getImageProps keeps Next's optimizer, srcSet and sizes
              on both candidates; `priority` is declared once, on the shared
              <img>, so there is exactly one preload for the one image shown.
            */}
            <HeroPicture
              desktopSrc={banners[0].desktopImage || banners[0].mobileImage || FALLBACK_BANNER}
              mobileSrc={banners[0].mobileImage || banners[0].desktopImage || FALLBACK_BANNER}
              alt={banners[0].title || "Hive campaign banner"}
              priority
            />
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
                src={banner.desktopImage || FALLBACK_BANNER}
                alt={banner.title || `Hive campaign banner ${idx + 1}`}
                fill
                // Eager, not `priority`. This grid is `hidden md:grid` and the
                // mobile carousel below is `md:hidden`, so marking the first
                // item of each `priority` emitted two preloads at every
                // viewport — one of them always for an image that breakpoint
                // never shows. Eager keeps the first banner out of the lazy
                // queue without competing against the real LCP element.
                loading={idx === 0 ? "eager" : "lazy"}
                // Only ever rendered at >=768px, where each cell is a third of
                // the container. The old `(max-width: 768px) 100vw` clause was
                // unreachable and only widened the candidate set.
                sizes="33vw"
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
                  src={banner.mobileImage || banner.desktopImage || FALLBACK_BANNER}
                  alt={banner.title || `Hive campaign banner ${idx + 1}`}
                  fill
                  // See the desktop grid above — eager rather than `priority`,
                  // so the two breakpoint variants stop preloading against each
                  // other. Only the first slide is eager; the rest of the
                  // carousel is off-screen and stays lazy.
                  loading={idx === 0 ? "eager" : "lazy"}
                  // Only ever rendered below 768px, always full width.
                  sizes="100vw"
                  className="object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="sheen-glow" />
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          {banners.length > 1 && (
            <div className="flex items-center justify-center pt-1">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToIdx(i)}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === activeIdx}
                  className="flex items-center justify-center w-11 h-11 -mx-0.5"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIdx ? "w-5 bg-hive-amber" : "w-1.5 bg-stone-300 hover:bg-stone-400"
                    }`}
                  />
                </button>
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
              className="flex gap-6 pb-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] justify-start -mx-6 px-6 lg:-mx-8 lg:px-8 scroll-pl-6 lg:scroll-pl-8"
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

  // 3. COLLECTIONS & PREMIUM CURATION (Product Grids, Carousels, MoodBoards, Premium Zara-Style Grids)
  if (block.blockType === "collection" || block.blockType === "premiumCuration") {
    // Mood Board
    if (block.renderer === "moodGrid" || block.renderer === "editorialGrid") {
      if (block.data.collection && block.data.products) {
        const displayCols = [ { ...block.data.collection, products: block.data.products.map(mapDbProduct) } ];
        return <MoodBoardGrid title={block.title} subtitle={block.subtitle} collections={displayCols} />;
      }
      return null;
    }

    let blockProducts = (block.data.products || [])
      .filter((p: any) => p.active !== false)
      .map(mapDbProduct);

    if (!blockProducts || blockProducts.length === 0) return null;

    const isCarousel = block.renderer === "productCarousel";
    const isTwoGrid = block.renderer === "twoProductGrid";
    const twoGridProducts = blockProducts.slice(0, block.config?.maxProducts || 2);
    // Premium Curation's full-bleed themed layout (background art, watermarks, generous padding)
    // is built to showcase a spread of products. Below a minimum count it reads as broken —
    // mostly empty decorative chrome around one floating card — so we fall back to the plain
    // grid renderer further below instead of forcing the full treatment on too little content.
    const PREMIUM_GRID_MIN_PRODUCTS = 3;
    const isPremiumGrid = block.renderer === "premiumGrid" && blockProducts.length >= PREMIUM_GRID_MIN_PRODUCTS;

    if (isPremiumGrid) {
      const productCount = blockProducts.length;
      const gridColsClass = productCount >= 5 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3";
      const sectionPaddingClass = productCount >= 5 ? "pt-10 pb-8 sm:pt-14 sm:pb-12" : "pt-8 pb-6 sm:pt-10 sm:pb-8";
      const bgImg = block.data?.bgImage || block.config?.bgImage || block.config?.desktopImage;
      const bgImgUrl = bgImg
        ? typeof bgImg === "string"
          ? bgImg
          // Full-bleed section background — "original" so it is not width-capped.
          : bgImg.url || (bgImg.objectKey ? getPublicUrl(bgImg, "original") : null)
        : null;

      const bgOverlayTheme = block.config?.bgOverlayTheme || "alabaster_studio";
      const isDarkTheme = ["dark", "midnight_obsidian", "indigo_watercolor", "dark_vignette_blur", "noir_champagne", "custom_veil_dark"].includes(bgOverlayTheme);
      const isLightBg = !isDarkTheme;
      const cardCtaText = block.config?.cardCtaText || "Take a closer look →";

      const badgeTitle = block.config?.badgeTitle?.trim();
      const blockTitle = block.title?.trim();
      const blockSubtitle = block.subtitle?.trim();
      const hasHeader = Boolean(badgeTitle || blockTitle || blockSubtitle);

      // Resolve luxury theme specific studio lighting, borders & accent colors
      const themeConfig = (() => {
        switch (bgOverlayTheme) {
          case "kerala_kasavu":
          case "organic_linen":
            return {
              bgClass: "bg-[#FAF9F5]",
              ambientGlow: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212, 175, 55, 0.08) 0%, rgba(250, 249, 245, 0) 100%)",
              borderClass: "border-y border-[#D4AF37]/30",
              accentColor: "text-amber-800",
              badgeBg: "bg-amber-100/60 text-amber-900 border border-amber-300/40",
            };
          case "noir_champagne":
          case "midnight_obsidian":
          case "dark":
          case "indigo_watercolor":
            return {
              bgClass: "bg-[#09090B]",
              ambientGlow: "radial-gradient(ellipse 70% 40% at 50% 20%, rgba(245, 194, 43, 0.08) 0%, rgba(9, 9, 11, 0) 100%)",
              borderClass: "border-y border-stone-850",
              accentColor: "text-[#F5C22B]",
              badgeBg: "bg-stone-900 text-[#F5C22B] border border-stone-800",
            };
          case "monsoon_sage":
            return {
              bgClass: "bg-gradient-to-b from-[#F4F6F4] via-[#F8FAF8] to-[#FFFFFF]",
              ambientGlow: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
              borderClass: "border-y border-emerald-900/10",
              accentColor: "text-emerald-900",
              badgeBg: "bg-emerald-50 text-emerald-900 border border-emerald-200/60",
            };
          case "rose_vermilion":
          case "rose_blush":
            return {
              bgClass: "bg-gradient-to-b from-[#FAF5F5] via-[#FDFBFB] to-[#FFFFFF]",
              ambientGlow: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(244, 63, 94, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
              borderClass: "border-y border-rose-200/50",
              accentColor: "text-rose-900",
              badgeBg: "bg-rose-50 text-rose-900 border border-rose-200/60",
            };
          case "custom_veil_dark":
          case "dark_vignette_blur":
            return {
              bgClass: "bg-[#0A0A0A]",
              ambientGlow: "none",
              borderClass: "border-y border-stone-800",
              accentColor: "text-[#F5C22B]",
              badgeBg: "bg-stone-900 text-[#F5C22B] border border-stone-800",
            };
          case "custom_veil_light":
          case "soft_veil_light":
            return {
              bgClass: "bg-stone-50",
              ambientGlow: "none",
              borderClass: "border-y border-stone-200",
              accentColor: "text-amber-800",
              badgeBg: "bg-white text-amber-900 border border-amber-200",
            };
          case "alabaster_studio":
          default:
            return {
              bgClass: "bg-gradient-to-b from-white via-[#FAF9F6] to-white",
              ambientGlow: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 194, 43, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
              borderClass: "border-y border-stone-200/60",
              accentColor: "text-amber-700",
              badgeBg: "bg-amber-50/80 text-amber-900 border border-amber-200/60",
            };
        }
      })();

      return (
        <section className={`relative w-full overflow-hidden ${sectionPaddingClass} ${themeConfig.bgClass} ${themeConfig.borderClass}`}>
          {/* Ambient Lighting & Glow Layer */}
          <div 
            className="absolute inset-0 pointer-events-none z-[1]" 
            style={{ background: themeConfig.ambientGlow }} 
          />

          {/* Top/Bottom Soft Feather Blend Transitions */}
          <div className={`absolute top-0 inset-x-0 h-8 md:h-12 z-[2] pointer-events-none ${
            isLightBg 
              ? "bg-gradient-to-b from-white via-white/40 to-transparent" 
              : "bg-gradient-to-b from-black/60 to-transparent"
          }`} />

          {/* Background Image with Dynamic Blending Veil */}
          {bgImgUrl && (
            <div className="absolute inset-0 w-full h-full z-0">
              <Image
                src={bgImgUrl}
                alt={blockTitle || "Premium Curation Background"}
                fill
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className={`absolute inset-0 ${
                isDarkTheme
                  ? "bg-black/70 backdrop-blur-[2px]"
                  : "bg-white/80 backdrop-blur-[1px]"
              }`} />
            </div>
          )}

          {/* Refined Kasavu Handloom Accent Hairline for kerala_kasavu theme */}
          {(bgOverlayTheme === "kerala_kasavu" || bgOverlayTheme === "organic_linen") && (
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent pointer-events-none z-[2]" />
          )}

          <div className={`relative z-10 max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col items-center gap-8 ${isLightBg ? "text-stone-900" : "text-white"}`}>
            {/* Luxury Header - Only rendered if at least one header field is provided */}
            {hasHeader && (
              <div className="flex flex-col items-center text-center max-w-2xl gap-1.5 pt-2">
                {badgeTitle && (
                  <span className={`text-[10px] tracking-[0.3em] font-bold uppercase ${themeConfig.accentColor}`}>
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
            <div className={`grid ${gridColsClass} gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 w-full mt-2`}>
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
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth scroll-pl-6 lg:scroll-pl-8">
              {blockProducts.map((product: any) => (
                <div key={product.id} className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : isTwoGrid ? (
            <div className={`flex flex-wrap gap-3 sm:gap-6 w-full ${twoGridProducts.length === 1 ? "justify-center" : ""}`}>
              {twoGridProducts.map((product: any) => (
                <div key={product.id} className="w-[145px] sm:w-[190px] lg:w-[210px] flex-shrink-0">
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

  // 4. SMART PRODUCT RAIL / RECENTLY VIEWED / RECOMMENDED / NEW ARRIVALS
  if (block.blockType === "smartRail" || block.blockType === "recentlyViewed" || block.blockType === "recommended" || block.blockType === "newArrivals") {
    const isSmartRail = block.blockType === "smartRail";
    const isRecommended = block.blockType === "recommended";
    const isNewArrivals = block.blockType === "newArrivals" || (isSmartRail && (block.config?.ruleType === "newArrivals" || !block.config?.ruleType));
    const isPriceCeiling = isSmartRail && block.config?.ruleType === "priceCeiling";
    const isCategoryAuto = isSmartRail && block.config?.ruleType === "categoryAuto";
    const isTwoGrid = block.renderer === "twoProductGrid";
    const isGrid = block.renderer === "productGrid" || block.renderer === "grid";
    const isCarousel = !isTwoGrid && !isGrid;
    const maxItems = block.config?.maxProducts || 8;
    // Set by BlockService when this section is actually ranked from the shopper's own view
    // history — as opposed to the generic recency-ranked fallback everyone else sees.
    const isPersonalized = block.data?.isPersonalized === true;

    const allProducts = (block.data?.products || [])
      .filter((p: any) => p.active !== false)
      .map(mapDbProduct);

    if (allProducts.length === 0) return null;

    const displayProducts = allProducts.slice(0, maxItems);
    const bgClass = (isNewArrivals || isSmartRail || isRecommended) ? "bg-white" : "bg-hive-cream";
    const isRecentlyViewedFallback = block.blockType === "recentlyViewed" && !isPersonalized;
    const tagText = isPriceCeiling
      ? "BUDGET FINDS"
      : isCategoryAuto
        ? "EXPLORE COLLECTION"
        : isNewArrivals
          ? "FRESH ARRIVALS"
          : isRecommended
            ? (isPersonalized ? "BASED ON WHAT YOU'VE VIEWED" : "TRENDING NOW")
            : (isPersonalized ? "PICK UP WHERE YOU LEFT OFF" : "ON THE MOODBOARD");

    const titleText = isRecentlyViewedFallback
      ? "What Everyone's Eyeing"
      : (block.title || (isPriceCeiling ? "Budget Finds" : (isNewArrivals ? "New on Hive" : (isRecommended ? "Recommended" : "Most Loved"))));
    
    const targetUrl = isPriceCeiling
      ? `/products?maxPrice=${block.config?.priceCeiling || 1500}`
      : isNewArrivals
        ? "/products?sort=newest"
        : "/products";
    
    return (
      <section className={`w-full ${bgClass} pt-2 pb-5 sm:pt-3 sm:pb-7 border-b border-hive-border/20`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-2.5 text-left">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
                {tagText}
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
                {titleText}
              </h2>
            </div>
            <Link
              href={targetUrl}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1 group pb-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {isCarousel ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth scroll-pl-6 lg:scroll-pl-8">
              {displayProducts.map((product: any) => (
                <div key={product.id} className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}

              {/* Trailing Minimalist End-Cap Card */}
              <div className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start flex flex-col justify-start group select-none">
                <Link
                  href={targetUrl}
                  className="w-full aspect-[3/4] rounded-2xl bg-hive-cream border border-stone-200/80 shadow-2xs relative overflow-hidden flex flex-col items-center justify-center p-4 text-center transition-all duration-300 group-hover:shadow-md group-hover:border-stone-400 group-hover:-translate-y-0.5 cursor-pointer"
                >
                  {/* Tactile Circular Button */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-stone-900 shadow-2xs border border-stone-200 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white group-hover:scale-105 transition-all duration-300 mb-3">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* Single Clean Text */}
                  <span className="text-xs sm:text-sm font-serif font-bold text-stone-900 group-hover:underline transition-colors block">
                    {isNewArrivals ? "See All Drops" : "See All Items"}
                  </span>
                </Link>
              </div>
            </div>
          ) : isTwoGrid ? (
            <div className={`flex flex-wrap gap-3 sm:gap-6 w-full ${displayProducts.length === 1 ? "justify-center" : ""}`}>
              {displayProducts.map((product: any) => (
                <div key={product.id} className="w-[145px] sm:w-[190px] lg:w-[210px] flex-shrink-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full">
              {displayProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
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
                  : item.imageUrl?.url || getPublicUrl(item.imageUrl, "card")
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

  if (process.env.NODE_ENV !== "production") {
    // Surfaces CMS misconfiguration (a blockType/renderer combo this component doesn't handle)
    // instead of silently dropping the block with no signal to whoever is editing the homepage.
    console.warn(
      `[ExperienceBlockRenderer] No renderer matched block "${block.blockKey || block.id}" (blockType="${block.blockType}", renderer="${block.renderer}"). It will not be shown.`
    );
  }
  return null;
}
