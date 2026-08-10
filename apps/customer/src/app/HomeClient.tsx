"use client";
 
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import { calculateDistanceKm } from "@/lib/distance";
import { Button, cn } from "@hive/ui";
import { Search, ArrowRight, Sparkles, MapPin, ChevronLeft, ChevronRight, Store, User, ShieldCheck, Truck, Zap } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { TrustStrip } from "@/components/trust/TrustStrip";
import Image from "next/image";
import Link from "next/link";
import { ProductCardData } from "@/lib/mockProducts";
import { ProductCard } from "@/components/product/ProductCard";
import { mockCollections } from "@/lib/mockCollections";
import { BoutiqueCard } from "@/components/boutique/BoutiqueCard";
import { ExperienceBlockRenderer } from "@/components/home/ExperienceBlockRenderer";





class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
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

export function HomeClient() {
  const { latitude, longitude, locality, city, serviceableBoutiqueCount } = useLocation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const urgencyBannerDetails = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const userLocation = locality || city || "Kochi";

    // Boutique active delivery hours (9:00 AM to 8:00 PM)
    if (currentHour >= 9 && currentHour < 20) {
      return {
        tag: "90-MINUTE DELIVERY",
        text: `Designer looks hand-delivered from top boutiques to ${userLocation} in under 90 minutes`,
        isToday: true,
      };
    } else {
      return {
        tag: "NEXT-DAY DISPATCH",
        text: `Order now for priority morning delivery to ${userLocation}`,
        isToday: false,
      };
    }
  }, [locality, city]);

  // Fetch from Convex using unified Content API
  const homeData = useQuery(
    api.customerHome.resolveExperiencePayload,
    {
      slug: "homepage",
      city: city || undefined,
      userLat: latitude !== null ? latitude : undefined,
      userLng: longitude !== null ? longitude : undefined,
    }
  );

  const { experience, blocks: experienceBlocks } = homeData ?? {};

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

    // We can extract total banners by finding the hero block
    const heroBlock = experienceBlocks?.find(b => b.blockType === "hero");
    const campaigns = heroBlock?.data?.campaigns || [];
    const totalBanners = campaigns.length === 0 ? 3 : campaigns.length;

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
  }, [experienceBlocks, isCarouselPaused]);

  // Helper to resolve campaign redirection path
  const getBannerHref = (targetType: string, targetValue: string) => {
    switch (targetType) {
      case "collection":
        return `/collections/${targetValue}`;
      case "category":
        return `/products/${targetValue}`;
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
      img: "",
      cta: "Shop Now",
      href: "/collections/wedding",
    },
    {
      title: "Designer Sarees",
      subtitle: "Pure silk & georgette drapes",
      img: "",
      cta: "Explore",
      href: "/products/sarees",
    },
    {
      title: "Handwoven Silk",
      subtitle: "Curated local designer staples",
      img: "",
      cta: "Shop Collection",
      href: "/products",
    },
  ];

  // Product mapping logic is now handled in the render loop on a per-block basis

  // Render loading skeleton
  if (homeData === undefined) {
    return <HomePageSkeleton />;
  }

  return (
    <ErrorBoundary fallback={<div className="p-4 bg-red-50 text-red-700 min-h-screen">Failed to load dynamic content. Please refresh.</div>}>
      <div className="flex flex-col items-center bg-white min-h-screen text-hive-text w-full select-none">
        
        {/* Visually hidden H1 for SEO compliance */}
      <h1 className="sr-only">Instant Clothes Delivery in Kochi (1-2 Hours)</h1>

      {/* Luxury Editorial Ticker Banner (Marquee) */}
      <div className="w-full overflow-hidden bg-[#F5C22B] py-2 border-b border-[#E0B120]/80 whitespace-nowrap select-none shadow-2xs relative leading-none min-h-[34px] sm:min-h-[38px] flex items-center">
        <div className="inline-block animate-marquee text-[10.5px] sm:text-xs font-semibold text-stone-900 tracking-wide">
          <span className="mx-3 font-extrabold uppercase tracking-widest text-stone-950">{urgencyBannerDetails.tag}</span>
          <span className="text-stone-700 mx-1.5">◆</span>
          <span className="pr-8 font-medium text-stone-900">{urgencyBannerDetails.text}</span>
          <span className="text-stone-700 mx-1.5">◆</span>
          
          <span className="mx-3 font-extrabold uppercase tracking-widest text-stone-950" aria-hidden="true">{urgencyBannerDetails.tag}</span>
          <span className="text-stone-700 mx-1.5" aria-hidden="true">◆</span>
          <span className="pr-8 font-medium text-stone-900" aria-hidden="true">{urgencyBannerDetails.text}</span>
          <span className="text-stone-700 mx-1.5" aria-hidden="true">◆</span>

          <span className="mx-3 font-extrabold uppercase tracking-widest text-stone-950" aria-hidden="true">{urgencyBannerDetails.tag}</span>
          <span className="text-stone-700 mx-1.5" aria-hidden="true">◆</span>
          <span className="pr-8 font-medium text-stone-900" aria-hidden="true">{urgencyBannerDetails.text}</span>
          <span className="text-stone-700 mx-1.5" aria-hidden="true">◆</span>

          <span className="mx-3 font-extrabold uppercase tracking-widest text-stone-950" aria-hidden="true">{urgencyBannerDetails.tag}</span>
          <span className="text-stone-700 mx-1.5" aria-hidden="true">◆</span>
          <span className="pr-8 font-medium text-stone-900" aria-hidden="true">{urgencyBannerDetails.text}</span>
        </div>
      </div>

      {/* ── DYNAMIC HOMEPAGE ENGINE ── */}
      {experienceBlocks?.map((block) => (
        <ExperienceBlockRenderer key={block._id || block.id} block={block} />
      ))}



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
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-25%, 0, 0); }
        }
        .animate-marquee {
          animation: marquee 16s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      </div>
    </ErrorBoundary>
  );
}
