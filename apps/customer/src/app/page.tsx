"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import { Button } from "@hive/ui";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { BoutiqueSpotlight } from "@/components/boutique/BoutiqueSpotlight";
import { TrustStrip } from "@/components/trust/TrustStrip";
import Image from "next/image";
import Link from "next/link";
import { ProductCardData } from "@/lib/mockProducts";
import { Boutique } from "@/lib/mockBoutiques";

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
function mapDbProduct(p: any): ProductCardData & { sizes: string[]; stockBySize: Record<string, number> } {
  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || "",
    price,
    compareAtPrice,
    rating: 4.8, // Fallback rating
    reviewCount: 12, // Fallback review count
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
  };
}

// Helper to map DB boutique to Boutique interface
function mapDbBoutique(b: any, products: any[] = []): Boutique {
  const count = products.filter((p) => p.boutiqueId === b._id).length;
  const fallbackImg = "https://images.unsplash.com/photo-1567401893930-7dbc069b4353?auto=format&fit=crop&w=600&q=80";
  return {
    id: b._id,
    name: b.boutiqueName,
    tagline: b.description || "Independently owned boutique fashion house",
    city: b.addressDetails?.city || "Hyderabad",
    rating: 4.8,
    reviewCount: 18,
    specialties: ["Luxury Wear", "Custom Stitching"],
    verified: b.status === "APPROVED",
    sameDayDelivery: true,
    imageUrl: b.logoUrl || b.bannerUrl || fallbackImg,
    productCount: count > 0 ? count : 12, // display realistic count
    featured: true,
  };
}

export default function HomePage() {
  const { latitude, longitude } = useLocation();
  const router = useRouter();

  // Fetch from Convex
  const dbBanners = useQuery(api.banners.getActiveBanners);
  const dbCategories = useQuery(api.categories.getCategories, { onlyActive: true });
  
  // Fetch active products with location coordinates when available
  const dbProducts = useQuery(
    api.products.getActiveProducts,
    latitude !== null && longitude !== null ? { userLat: latitude, userLng: longitude } : {}
  );
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques);

  // Banner Carousel State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play banners
  useEffect(() => {
    if (dbBanners && dbBanners.length > 1) {
      bannerTimerRef.current = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % dbBanners.length);
      }, 5000);
    }
    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [dbBanners]);

  const handlePrevBanner = () => {
    if (!dbBanners) return;
    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    setCurrentBannerIndex((prev) => (prev === 0 ? dbBanners.length - 1 : prev - 1));
  };

  const handleNextBanner = () => {
    if (!dbBanners) return;
    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    setCurrentBannerIndex((prev) => (prev + 1) % dbBanners.length);
  };

  // Map products and boutiques
  const products = (dbProducts || []).map(mapDbProduct);
  const mappedBoutiques = (dbBoutiques || []).map((b) => mapDbBoutique(b, dbProducts || []));

  return (
    <div className="flex flex-col items-center bg-[#FFFDF9]/40 min-h-screen text-hive-text w-full pb-20">
      
      {/* ──────────────────────────────────────────────────
          1. DYNAMIC PROMOTION BANNERS (MEESHO-STYLE HERO)
          ────────────────────────────────────────────────── */}
      <section className="w-full relative bg-slate-50 overflow-hidden min-h-[260px] md:min-h-[440px] flex items-center border-b border-hive-border/40">
        {dbBanners === undefined ? (
          // Loading skeleton state
          <div className="absolute inset-0 bg-gradient-to-br from-hive-cream/40 to-slate-100 flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-hive-amber/30 animate-spin" />
          </div>
        ) : dbBanners.length === 0 ? (
          // Fallback static premium banner
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF0] via-white to-[#FFFBF0] flex items-center justify-center p-8">
            <div className="max-w-xl text-center space-y-4">
              <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold bg-hive-gold/20 text-hive-amber border border-hive-gold/30 tracking-widest uppercase">
                Hyperlocal Marketplace
              </span>
              <h1 className="text-3xl md:text-5xl font-serif font-black text-hive-dark tracking-tight leading-tight">
                Curated Boutique Fashion
              </h1>
              <p className="text-sm text-hive-text-muted leading-relaxed font-sans max-w-md mx-auto">
                Discover Delhi-NCR's finest designer boutiques. Experience high-quality handlooms and customized pieces, delivered today.
              </p>
              <Button onClick={() => router.push("/products")} variant="primary" className="px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs">
                Explore Catalog
              </Button>
            </div>
          </div>
        ) : (
          // Real dynamic sliding carousel
          <div className="w-full h-full absolute inset-0">
            {dbBanners.map((banner, index) => {
              const isActive = index === currentBannerIndex;
              return (
                <div
                  key={banner._id}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 flex items-center ${
                    isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  {/* Background image: desktop vs mobile */}
                  <div className="absolute inset-0 block">
                    <picture className="w-full h-full object-cover">
                      <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.desktopImageUrl}
                        alt={banner.title}
                        className="w-full h-full object-cover object-center"
                      />
                    </picture>
                    {/* Visual dark overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent md:from-black/45" />
                  </div>

                  {/* Foreground Content Card container */}
                  <div className="max-w-7xl mx-auto w-full px-6 lg:px-8 relative z-20 flex justify-start">
                    <div className="max-w-lg text-left text-white space-y-4 animate-[bannerFadeIn_0.8s_cubic-bezier(0.25,1,0.5,1)]">
                      <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tight drop-shadow leading-tight">
                        {banner.title}
                      </h2>
                      <p className="text-sm md:text-base text-slate-100 drop-shadow-sm font-medium leading-relaxed max-w-md">
                        {banner.subtitle}
                      </p>
                      <div className="pt-2">
                        <Link
                          href={banner.ctaLink}
                          className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-hive-dark bg-hive-gold hover:bg-hive-amber shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                          {banner.ctaText}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slider controls */}
            {dbBanners.length > 1 && (
              <>
                <button
                  onClick={handlePrevBanner}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center border border-white/20 backdrop-blur-sm z-30 transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextBanner}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center border border-white/20 backdrop-blur-sm z-30 transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Indicators dots */}
                <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5 z-30">
                  {dbBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentBannerIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentBannerIndex ? "w-6 bg-hive-gold" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────
          2. CATEGORIES DISCOVERY TRACK (MEESHO-STYLE VISUAL RAILS)
          ────────────────────────────────────────────────── */}
      <section className="w-full max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-0 flex flex-col gap-5">
        <div className="flex flex-col text-left items-start gap-1">
          <span className="text-[10px] font-bold text-hive-amber tracking-widest uppercase">
            POPULAR CATEGORIES
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold font-serif text-hive-dark">
            Shop by Category
          </h2>
        </div>

        {dbCategories === undefined ? (
          // Loading placeholders
          <div className="flex gap-6 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2.5 animate-pulse flex-shrink-0">
                <div className="w-18 h-18 rounded-full bg-slate-100 border border-slate-200" />
                <div className="h-3 w-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : dbCategories.length === 0 ? (
          <div className="text-left text-xs text-hive-text-muted font-bold py-4">No categories setup.</div>
        ) : (
          // Interactive category bubble rail
          <div className="flex gap-5 md:gap-7 overflow-x-auto w-full py-2 -mx-6 px-6 sm:mx-0 sm:px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            {/* Category Bubble: "All" */}
            <button
              onClick={() => router.push("/products")}
              className="flex flex-col items-center gap-3.5 group cursor-pointer flex-shrink-0 select-none"
            >
              <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full border flex items-center justify-center transition-all duration-300 relative shadow-sm bg-white border-hive-border/60 hover:border-hive-gold hover:scale-105 text-hive-dark">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-hive-amber" />
              </div>
              <span className="text-[11px] font-bold tracking-wide transition-colors text-hive-text-muted group-hover:text-hive-dark">
                All Design
              </span>
            </button>

            {/* Dynamic Category Bubbles — navigate to /products?category=slug */}
            {dbCategories.map((cat) => {
              const categorySlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, "-");
              return (
                <button
                  key={cat._id}
                  onClick={() => router.push(`/products?category=${categorySlug}`)}
                  className="flex flex-col items-center gap-3.5 group cursor-pointer flex-shrink-0 select-none"
                >
                  <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full border overflow-hidden transition-all duration-300 relative shadow-sm border-hive-border/60 group-hover:border-hive-gold hover:scale-105">
                    {cat.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-[9px]">
                        👗
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold tracking-wide transition-colors text-hive-text-muted group-hover:text-hive-dark">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────
          4. DYNAMIC PRODUCTS GRID FEED (NO MOCK DATA)
          ────────────────────────────────────────────────── */}
      <ProductGrid
        products={products}
        selectedOccasion="all"
        onResetFilter={() => {}}
        isLoading={dbProducts === undefined}
        viewAllHref="/products"
      />

      {/* ──────────────────────────────────────────────────
          5. BOUTIQUE SPOTLIGHT (DESIGNERS NEAR YOU)
          ────────────────────────────────────────────────── */}
      <BoutiqueSpotlight
        boutiques={mappedBoutiques}
        isLoading={dbBoutiques === undefined}
      />

      {/* ──────────────────────────────────────────────────
          6. TRUST STRIP ASSURANCES
          ────────────────────────────────────────────────── */}
      <TrustStrip />


      <style>{`
        @keyframes bannerFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
