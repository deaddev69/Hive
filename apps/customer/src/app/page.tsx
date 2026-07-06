"use client";
 
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import { calculateDistanceKm } from "@/lib/distance";
import { Button, cn } from "@hive/ui";
import { Search, ArrowRight, Sparkles, MapPin, ChevronLeft, ChevronRight, Store, User, ShieldCheck, Truck } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { TrustStrip } from "@/components/trust/TrustStrip";
import Image from "next/image";
import Link from "next/link";
import { ProductCardData } from "@/lib/mockProducts";
import { ProductCard } from "@/components/product/ProductCard";
import { mockCollections } from "@/lib/mockCollections";
import { BoutiqueCard } from "@/components/boutique/BoutiqueCard";



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
function mapDbProduct(p: any): ProductCardData & { sizes: string[]; stockBySize: Record<string, number>; boutiqueId?: string; boutique?: any } {
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
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || "",
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

function HomePageSkeleton() {
  return (
    <div className="flex flex-col items-center bg-white min-h-screen text-hive-text w-full select-none gap-8 pt-8">
      {/* Banner skeleton: full-width rounded rect, h-48, animate-pulse */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-48 w-full" />
      </div>

      {/* Row of 5 category circle skeletons */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex gap-6 justify-center overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-16 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        ))}
      </div>

      {/* Grid of 8 product card skeletons */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 pb-20">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-black/[0.06] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-full aspect-[4/5] rounded-t-xl" />
            <div className="h-3 animate-pulse bg-gray-200 dark:bg-gray-700 w-1/3 rounded-full mt-1" />
            <div className="h-4 animate-pulse bg-gray-200 dark:bg-gray-700 w-5/6 rounded-full" />
            <div className="h-3 animate-pulse bg-gray-200 dark:bg-gray-700 w-2/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { latitude, longitude, city, serviceableBoutiqueCount } = useLocation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Fetch from Convex using consolidated query
  const homeData = useQuery(
    api.customerHome.getCustomerHomeData,
    {
      city: city || undefined,
      userLat: latitude !== null ? latitude : undefined,
      userLng: longitude !== null ? longitude : undefined,
    }
  );

  const {
    banners: dbBanners,
    config: homepageConfig,
    products: dbProducts,
    boutiques: dbBoutiques,
    categories: dbCategories,
    mostLoved: dbMostLoved,
    newArrivals: dbNewArrivals,
  } = homeData ?? {};

  // Campaign Banners scroll state for mobile
  const [activeMobileIdx, setActiveMobileIdx] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isCategoryHovered, setIsCategoryHovered] = useState(false);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(true);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const { scrollLeft, clientWidth } = categoryScrollRef.current;
      const scrollAmount = clientWidth * 0.6;
      categoryScrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleMobileScroll = () => {
    if (mobileScrollRef.current) {
      const { scrollLeft, clientWidth } = mobileScrollRef.current;
      if (clientWidth > 0) {
        const idx = Math.round(scrollLeft / clientWidth);
        setActiveMobileIdx(idx);
      }
    }
  };

  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (isCarouselPaused) return;

    const totalBanners = dbBanners === undefined || dbBanners.length === 0
      ? staticFallbackCampaigns.length
      : dbBanners.length;

    if (totalBanners <= 1) return;

    const interval = setInterval(() => {
      if (mobileScrollRef.current) {
        const { scrollLeft, clientWidth } = mobileScrollRef.current;
        if (clientWidth > 0) {
          const currentIdx = Math.round(scrollLeft / clientWidth);
          const nextIdx = (currentIdx + 1) % totalBanners;
          mobileScrollRef.current.scrollTo({
            left: nextIdx * clientWidth,
            behavior: "smooth",
          });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [dbBanners, isCarouselPaused]);

  // Helper to resolve campaign redirection path
  const getBannerHref = (targetType: string, targetValue: string) => {
    switch (targetType) {
      case "collection":
        return `/collections/${targetValue}`;
      case "category":
        return `/products?category=${targetValue}`;
      case "product":
        // If targetValue is a boutiqueId, redirect to boutique catalog filter. Otherwise product PDP.
        if (targetValue.match(/^[a-z0-9]+$/i) && targetValue.length > 10) {
          return `/products?boutiqueId=${targetValue}`;
        }
        return `/products/${targetValue}`;
      case "search":
        return `/search?q=${encodeURIComponent(targetValue)}`;
      default:
        return "/products";
    }
  };

  // Static fashion fallback campaigns if DB is empty
  const staticFallbackCampaigns = [
    {
      title: "Wedding Season",
      subtitle: "Up to 30% OFF • Designer Guestwear",
      img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
      cta: "Shop Now",
      href: "/collections/wedding",
    },
    {
      title: "Designer Sarees",
      subtitle: "Pure silk & georgette drapes",
      img: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80",
      cta: "Explore",
      href: "/products?category=sarees",
    },
    {
      title: "Handwoven Silk",
      subtitle: "Curated local designer staples",
      img: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
      cta: "Shop Collection",
      href: "/products",
    },
  ];

  // Map products and filter out out-of-stock items
  const products = useMemo(() => {
    return (dbProducts || [])
      .filter((p) => {
        const stock = p.stockBySize || {};
        return Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0) > 0;
      })
      .map(mapDbProduct);
  }, [dbProducts]);

  const mostLovedProducts = useMemo(() => {
    return (dbMostLoved || [])
      .filter((p) => {
        const stock = p.stockBySize || {};
        return Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0) > 0;
      })
      .map(mapDbProduct);
  }, [dbMostLoved]);

  const newArrivalsProducts = useMemo(() => {
    return (dbNewArrivals || [])
      .filter((p) => {
        const stock = p.stockBySize || {};
        return Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0) > 0;
      })
      .map(mapDbProduct)
      .slice(0, 8);
  }, [dbNewArrivals]);

  const homepageSubcategories = useMemo(() => {
    return (dbCategories || [])
      .filter((c) => c.parentId && c.showOnHomepage)
      .sort((a, b) => (a.homepageOrder ?? 0) - (b.homepageOrder ?? 0));
  }, [dbCategories]);


  // Pause categories auto-scroll temporarily after mouse-leave or touch-end interaction



  // Sort approved boutiques using combined weight + distance
  const sortedBoutiques = useMemo(() => {
    if (!dbBoutiques) return [];
    return dbBoutiques
      .map((b) => {
        const bLat = b.latitude ?? b.addressDetails?.lat;
        const bLng = b.longitude ?? b.addressDetails?.lng;
        let distance = null;
        if (latitude !== null && longitude !== null && bLat !== undefined && bLng !== undefined) {
          distance = calculateDistanceKm(latitude, longitude, bLat, bLng);
        }

        let tierWeight = 0;
        if (b.trustTier === "Elite") tierWeight = 4;
        else if (b.trustTier === "Gold") tierWeight = 3;
        else if (b.trustTier === "Silver") tierWeight = 2;
        else if (b.trustTier === "Bronze") tierWeight = 1;

        return {
          ...b,
          distance,
          tierWeight,
        };
      })
      .sort((a, b) => {
        if (b.tierWeight !== a.tierWeight) {
          return b.tierWeight - a.tierWeight;
        }
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [dbBoutiques, latitude, longitude]);

  // Filter and map boutiques to frontend Boutique shape with Proximity/ETA
  const mappedBoutiques = useMemo(() => {
    const withDetails = sortedBoutiques
      .filter((b) => {
        // Exclude boutiques that have 0 active, approved products
        if (b.activeApprovedProductCount !== undefined && b.activeApprovedProductCount <= 0) {
          return false;
        }
        // If user location is set, filter to only show boutiques where distance <= deliveryRadiusKm (default 15km)
        if (latitude !== null && longitude !== null && b.distance !== null) {
          return b.distance <= (b.deliveryRadiusKm ?? 15);
        }
        return true;
      })
      .map((b) => {
        let etaMinutes = null;
        if (b.distance !== null) {
          const durationMin = (b.distance / 25) * 60; // 25 km/h driving speed approximation
          etaMinutes = Math.round(durationMin + (b.averagePrepTime ?? 30));
        }
        return {
          ...b,
          etaMinutes,
        };
      });

    // Identify top 5 closest deliverable boutiques to flag as "Nearby"
    const sortedByDistance = [...withDetails]
      .filter((b) => b.distance !== null)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    
    const top5Ids = new Set(sortedByDistance.slice(0, 5).map((b) => b._id));

    return withDetails.map((b) => {
      const distanceText = b.distance !== null ? `${b.distance.toFixed(1)} km away` : null;
      const etaText = b.etaMinutes !== null ? `${b.etaMinutes} min delivery` : null;
      return {
        id: b._id,
        name: b.boutiqueName,
        tagline: b.description || "Designer Boutique",
        city: b.addressDetails?.city || "Kochi",
        rating: b.hiveScore ? Number((b.hiveScore / 20).toFixed(1)) : 4.8,
        reviewCount: b.totalOrders || 12,
        specialties: b.merchantType ? [b.merchantType] : ["Fashion"],
        verified: b.status === "APPROVED" || b.merchantTier === "Elite" || b.merchantTier === "Gold",
        sameDayDelivery: b.deliveryRadiusKm !== undefined ? b.deliveryRadiusKm <= 15 : true,
        imageUrl: b.logoUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80",
        productCount: b.activeApprovedProductCount || 0,
        featured: b.merchantTier === "Elite" || b.merchantTier === "Gold",
        distanceText,
        etaText,
        isNearby: top5Ids.has(b._id),
        distance: b.distance,
        etaMinutes: b.etaMinutes,
      };
    });
  }, [sortedBoutiques, latitude, longitude]);

  // Render loading skeleton
  if (homeData === undefined) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="flex flex-col items-center bg-white min-h-screen text-hive-text w-full select-none">
      
      {/* ── 1. HYPERLOCAL CAMPAIGN SHOWCASE GRID (AT TOP) ── */}
      <section className="w-full bg-white pt-6 pb-2">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {dbBanners === undefined ? (
            // Skeleton loading
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[16/10] rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center border border-hive-border/30">
                  <Sparkles className="w-6 h-6 text-hive-amber/20 animate-spin" />
                </div>
              ))}
            </div>
          ) : dbBanners.length === 0 ? (
            // Falling back to 3 premium static campaign cards
            <>
              {/* Desktop Fallback */}
              <div className="hidden md:grid grid-cols-3 gap-6 w-full">
                {staticFallbackCampaigns.map((banner, idx) => (
                  <Link
                    key={idx}
                    href={banner.href}
                    className="banner-card group relative aspect-[16/10] rounded-3xl overflow-hidden border border-hive-border/40 shadow-sm hover:shadow-md cursor-pointer block bg-slate-50 transform hover:-translate-y-0.5 transition-all duration-500"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <img
                      src={banner.img}
                      alt={banner.title}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="sheen-glow" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent z-10" />
                    <div className="absolute inset-0 p-6 flex flex-col justify-end text-left z-20 text-white space-y-1 select-none">
                      <h3 className="text-lg md:text-xl font-serif font-bold tracking-tight leading-tight">
                        {banner.title}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-200">
                        {banner.subtitle}
                      </p>
                      <div className="pt-2 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-hive-gold group-hover:text-white transition-colors">
                        <span>{banner.cta}</span>
                        <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Mobile Fallback */}
              <div className="md:hidden flex flex-col gap-4 w-full">
                <div
                  ref={mobileScrollRef}
                  onScroll={handleMobileScroll}
                  onTouchStart={() => setIsCarouselPaused(true)}
                  onTouchEnd={() => setTimeout(() => setIsCarouselPaused(false), 2000)}
                  onMouseDown={() => setIsCarouselPaused(true)}
                  onMouseUp={() => setTimeout(() => setIsCarouselPaused(false), 2000)}
                  onMouseLeave={() => setIsCarouselPaused(false)}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-6 px-6"
                >
                  {staticFallbackCampaigns.map((banner, idx) => (
                    <Link
                      key={idx}
                      href={banner.href}
                      className="banner-card flex-shrink-0 w-full snap-center group relative aspect-[4/5] rounded-3xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 block transform hover:-translate-y-0.5 transition-all duration-500"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <img
                        src={banner.img}
                        alt={banner.title}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="sheen-glow" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-end text-left z-20 text-white space-y-1 select-none">
                        <h3 className="text-xl font-serif font-bold tracking-tight leading-tight">
                          {banner.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-200">
                          {banner.subtitle}
                        </p>
                        <div className="pt-2 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-hive-gold">
                          <span>{banner.cta}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 py-1">
                  {staticFallbackCampaigns.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (mobileScrollRef.current) {
                          const width = mobileScrollRef.current.clientWidth;
                          mobileScrollRef.current.scrollTo({
                            left: idx * width,
                            behavior: "smooth"
                          });
                        }
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === activeMobileIdx ? "w-8 bg-hive-amber" : "w-2 bg-slate-350"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Render dynamic campaign cards
            <>
              {/* Desktop Grid (3 columns) */}
              <div className="hidden md:grid grid-cols-3 gap-6 w-full">
                {dbBanners.slice(0, 3).map((banner, idx) => (
                  <Link
                    key={banner._id}
                    href={getBannerHref(banner.targetType, banner.targetValue)}
                    className="banner-card group relative aspect-[16/10] rounded-3xl overflow-hidden border border-hive-border/40 shadow-sm hover:shadow-md cursor-pointer block bg-slate-50 transform hover:-translate-y-0.5 transition-all duration-500"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <img
                      src={banner.desktopImageUrl}
                      alt={banner.title}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="sheen-glow" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent z-10" />
                    <div className="absolute inset-0 p-6 flex flex-col justify-end text-left z-20 text-white space-y-1 select-none">
                      <h3 className="text-lg md:text-xl font-serif font-black tracking-tight leading-tight">
                        {banner.title}
                      </h3>
                      {banner.subtitle && (
                        <p className="text-[11px] font-medium text-slate-200">
                          {banner.subtitle}
                        </p>
                      )}
                      <div className="pt-2 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-hive-gold group-hover:text-white transition-colors">
                        <span>{banner.ctaText}</span>
                        <ArrowRight className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Mobile Carousel Swipe */}
              <div className="md:hidden flex flex-col gap-4 w-full">
                <div
                  ref={mobileScrollRef}
                  onScroll={handleMobileScroll}
                  onTouchStart={() => setIsCarouselPaused(true)}
                  onTouchEnd={() => setTimeout(() => setIsCarouselPaused(false), 2000)}
                  onMouseDown={() => setIsCarouselPaused(true)}
                  onMouseUp={() => setTimeout(() => setIsCarouselPaused(false), 2000)}
                  onMouseLeave={() => setIsCarouselPaused(false)}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-6 px-6"
                >
                  {dbBanners.map((banner, idx) => (
                    <Link
                      key={banner._id}
                      href={getBannerHref(banner.targetType, banner.targetValue)}
                      className="banner-card flex-shrink-0 w-full snap-center group relative aspect-[4/5] rounded-3xl overflow-hidden border border-hive-border/40 shadow-sm bg-slate-50 block transform hover:-translate-y-0.5 transition-all duration-500"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <img
                        src={banner.mobileImageUrl || banner.desktopImageUrl}
                        alt={banner.title}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none transform group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="sheen-glow" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-end text-left z-20 text-white space-y-1 select-none">
                        <h3 className="text-xl font-serif font-black tracking-tight leading-tight">
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className="text-xs font-medium text-slate-200">
                            {banner.subtitle}
                          </p>
                        )}
                        <div className="pt-2 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-hive-gold">
                          <span>{banner.ctaText}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                
                {dbBanners.length > 1 && (
                  <div className="flex justify-center gap-1.5 py-1">
                    {dbBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (mobileScrollRef.current) {
                            const width = mobileScrollRef.current.clientWidth;
                            mobileScrollRef.current.scrollTo({
                              left: idx * width,
                              behavior: "smooth"
                            });
                          }
                        }}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === activeMobileIdx ? "w-8 bg-hive-amber" : "w-2 bg-slate-350"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── 3. SHOP BY CATEGORY (circular cards, children only) ── */}
      {homepageSubcategories.length > 0 && (
        <section className="w-full bg-white pt-8 pb-4 border-b border-hive-border/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
                DISCOVER BY STYLE
              </span>
              <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
                Shop by Category
              </h2>
            </div>
            
            <div className="relative group/rail w-full">
              {/* Left Scroll Arrow */}
              {homepageSubcategories.length > 6 && (
                <button
                  onClick={() => scrollCategories("left")}
                  className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-white/90 border border-hive-border/40 shadow-md text-hive-text hover:bg-hive-amber hover:text-white transition-all duration-300 opacity-0 group-hover/rail:opacity-100 cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Right Scroll Arrow */}
              {homepageSubcategories.length > 6 && (
                <button
                  onClick={() => scrollCategories("right")}
                  className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-white/90 border border-hive-border/40 shadow-md text-hive-text hover:bg-hive-amber hover:text-white transition-all duration-300 opacity-0 group-hover/rail:opacity-100 cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              <div
                ref={categoryScrollRef}
                className="flex gap-6 pb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] justify-start -mx-6 px-6 sm:mx-0 sm:px-0 pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8"
                onMouseEnter={() => setIsCategoryHovered(true)}
                onMouseLeave={() => setIsCategoryHovered(false)}
                onTouchStart={() => setIsCategoryHovered(true)}
                onTouchEnd={() => setIsCategoryHovered(false)}
              >
                {homepageSubcategories.map((subcat) => (
                  <button
                    key={subcat._id}
                    onClick={() => router.push(`/products?category=${subcat.slug}`)}
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
      )}




      {/* ── 4. CURATED FOR KOCHI (denser 6-column grid) ── */}
      {products.length > 0 && (homepageConfig?.enableTrendingSection !== false) && (
        <section className="w-full bg-white pt-6 pb-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
                CURATED FOR KOCHI
              </span>
              <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
                {homepageConfig?.trendingSectionTitle || 'Curated for Kochi'}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full">
              {products.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}


      {/* ── 5. NEW ARRIVALS (Sorted by creationTime desc, take 8) ── */}
      {newArrivalsProducts.length > 0 && (
        <section className="w-full bg-white py-10 border-b border-hive-border/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
                JUST IN
              </span>
              <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
                New Finds
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8">
              {newArrivalsProducts.map((product) => (
                <div key={product.id} className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 5.5 MOST LOVED (Performance-based / curated sorting, compact cards) ── */}
      {mostLovedProducts.length > 0 && (
        <section className="w-full bg-[#FAF6F0] py-10 border-b border-hive-border/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-6 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-hive-amber tracking-widest uppercase">
                CUSTOMER FAVORITES
              </span>
              <h2 className="text-2xl font-serif font-semibold text-hive-dark uppercase tracking-wide">
                Most Loved
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth pl-6 lg:pl-8 scroll-pl-6 lg:scroll-pl-8">
              {mostLovedProducts.map((product) => (
                <div key={product.id} className="w-[140px] sm:w-[190px] flex-shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. ALL COLLECTIONS ── */}
      <section className="w-full bg-white py-10 border-b border-hive-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-left">
          <h3 className="text-xs font-extrabold text-hive-amber tracking-widest uppercase mb-4 border-b border-hive-border/40 pb-2">
            All Collections
          </h3>
          <ProductGrid
            products={products}
            selectedOccasion="all"
            onResetFilter={() => {}}
            isLoading={dbProducts === undefined}
            viewAllHref="/products"
          />
        </div>
      </section>

      {/* ── 7. SELL ON HIVE CTA (WARM IVORY TRANSITION) ── */}
      <section className="w-full bg-[#FAF6F0] py-8 border-t border-hive-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-white border border-hive-border/40 p-6 md:p-10 shadow-sm group/cta">
            {/* Subtle background glow/gradients */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-hive-amber/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Content */}
              <div className="lg:col-span-8 space-y-4 text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111827]/5 border border-[#111827]/10 text-xs font-bold text-hive-dark uppercase tracking-widest">
                  <Store className="w-3.5 h-3.5 text-hive-amber" /> Sell on Hive
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-hive-dark tracking-tight leading-tight">
                  Sell Fashion Locally. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-hive-amber to-[#F59E0B]">
                    Deliver in Hours.
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-hive-text-muted max-w-xl leading-relaxed font-sans font-medium">
                  Join Kerala's hyperlocal fashion marketplace. From independent designers to local labels, Hive helps partners reach nearby customers with delivery in hours.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#111827]/5 border border-[#111827]/10 text-[#111827]">
                      <User className="w-4 h-4 text-hive-amber" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-hive-dark">Sell Locally</h4>
                      <p className="text-[10px] text-hive-text-muted">Reach nearby customers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#111827]/5 border border-[#111827]/10 text-[#111827]">
                      <Truck className="w-4 h-4 text-hive-amber animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-hive-dark">Deliver Today</h4>
                      <p className="text-[10px] text-hive-text-muted">Fulfillment in hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#111827]/5 border border-[#111827]/10 text-[#111827]">
                      <Store className="w-4 h-4 text-hive-amber" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-hive-dark">Get Paid Weekly</h4>
                      <p className="text-[10px] text-hive-text-muted">Reliable payouts</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Content: Editorial Image Spread Collage */}
              <div className="lg:col-span-4 flex flex-col items-center lg:items-end justify-center gap-6 relative">
                <div className="relative flex items-center justify-center w-full max-w-[280px] aspect-square">
                  {/* Image 1: Kurti */}
                  <div className="absolute top-2 left-2 w-24 h-28 rounded-2xl overflow-hidden border border-white shadow-md transform -rotate-6 transition-all duration-500 group-hover/cta:rotate-3 group-hover/cta:scale-105 z-20">
                    <img
                      src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80"
                      alt="Kurti Design"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-[#111827]/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-widest uppercase">
                      Kurti
                    </div>
                  </div>
                  {/* Image 2: Men's Wear */}
                  <div className="absolute bottom-2 right-2 w-24 h-24 rounded-2xl overflow-hidden border border-white shadow-lg transform rotate-3 transition-all duration-500 group-hover/cta:-rotate-6 group-hover/cta:scale-105 z-30">
                    <img
                      src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80"
                      alt="Men's Fashion"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-[#111827]/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-widest uppercase">
                      Men
                    </div>
                  </div>
                  {/* Image 3: Dress */}
                  <div className="absolute top-4 right-4 w-20 h-20 rounded-2xl overflow-hidden border border-white shadow-sm transform rotate-6 transition-all duration-500 group-hover/cta:-rotate-3 group-hover/cta:scale-105 z-10">
                    <img
                      src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80"
                      alt="Dress"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-[#111827]/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-widest uppercase">
                      Dress
                    </div>
                  </div>
                  {/* Image 4: Jewellery */}
                  <div className="absolute bottom-6 left-4 w-16 h-16 rounded-2xl overflow-hidden border border-white shadow-md transform -rotate-12 transition-all duration-500 group-hover/cta:rotate-6 group-hover/cta:scale-105 z-40">
                    <img
                      src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80"
                      alt="Jewellery"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-[#111827]/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-widest uppercase">
                      Jewellery
                    </div>
                  </div>
                  
                  {/* Subtle Delivery Status tag overlay */}
                  <div className="absolute -bottom-2 left-6 z-50 bg-[#111827] text-white py-2 px-3.5 rounded-xl shadow-md border border-white/10 flex flex-col items-start gap-0.5 text-left pointer-events-none transform -rotate-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#F59E0B]">Delivered In Hours</span>
                    <span className="text-[10px] font-bold font-sans">Kakkanad ➔ Edappally</span>
                    <span className="text-[9px] text-slate-400 font-semibold font-mono">in 1h 42m</span>
                  </div>
                </div>
                
                <Link href="/become-seller" className="w-full">
                  <button className="w-full inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#111827] hover:bg-[#111827]/90 text-white font-extrabold text-xs uppercase tracking-widest rounded-full shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group-hover/cta:translate-x-1 cursor-pointer">
                    <span>Start Selling</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-1" />
                  </button>
                </Link>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* ── THE HIVE DIFFERENCE (TRUST STRIP) ── */}
      <TrustStrip />

      <style>{`
        .banner-card {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .sheen-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            95deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-20deg) translateX(-150%);
          transition: transform 0.8s ease-out;
          pointer-events: none;
          z-index: 15;
        }
        .group:hover .sheen-glow {
          transform: skewX(-20deg) translateX(150%);
        }

      `}</style>
    </div>
  );
}
