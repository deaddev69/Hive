"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import { useSessionStore } from "@/context/SessionContext";
import { toQueryCoords } from "@/lib/distance";
import { ExperienceBlockRenderer } from "@/components/home/ExperienceBlockRenderer";

class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Generic block-shaped placeholders — deliberately NOT shaped like any specific block layout.
// The real homepage is fully CMS-driven (block count/order/renderer can change at any time), so
// a skeleton that guesses a specific shape (e.g. "1 banner + 5 categories + 8-card grid")
// guarantees a layout shift the moment real content — which may be a completely different mix of
// blocks — swaps in. Generic full-width bars/rows minimize that mismatch instead of eliminating
// content shift entirely (which would require per-block skeletons keyed to the CMS config).
function HomePageSkeleton() {
  return (
    <div className="flex flex-col items-center bg-white min-h-screen text-hive-text w-full select-none gap-10 pt-8 pb-20" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="animate-pulse bg-gray-200 rounded-2xl h-48 sm:h-64 w-full" />
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-black/[0.06] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="animate-pulse bg-gray-200 w-full aspect-[4/5] rounded-t-xl" />
            <div className="h-3 animate-pulse bg-gray-200 w-1/3 rounded-full mt-1" />
            <div className="h-4 animate-pulse bg-gray-200 w-5/6 rounded-full" />
            <div className="h-3 animate-pulse bg-gray-200 w-2/5 rounded-full" />
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="animate-pulse bg-gray-200 rounded-2xl h-40 w-full" />
      </div>
    </div>
  );
}

export function HomeClient() {
  const { latitude, longitude, city } = useLocation();
  const { user } = useSessionStore();

  // Fetch from Convex using unified Content API
  const homeData = useQuery(
    api.customerHome.resolveExperiencePayload,
    {
      slug: "homepage",
      city: city || undefined,
      // Rounded to the same ~111 m precision the server already collapses these
      // to, so shoppers in one cell share a cached execution instead of each
      // spawning their own. See toQueryCoords.
      ...toQueryCoords(latitude, longitude),
      userId: (user?._id as any) || undefined,
    }
  );

  const { blocks: experienceBlocks } = homeData ?? {};

  // Render loading skeleton
  if (homeData === undefined) {
    return <HomePageSkeleton />;
  }

  return (
    <ErrorBoundary fallback={<div className="p-4 bg-red-50 text-red-700 min-h-screen">Failed to load dynamic content. Please refresh.</div>}>
      <div className="flex flex-col items-center bg-white min-h-screen text-hive-text w-full select-none">

        {/* Visually hidden H1 for SEO compliance */}
        <h1 className="sr-only">Instant Clothes Delivery in Kochi (1-2 Hours)</h1>

        {/* ── DYNAMIC HOMEPAGE ENGINE ── */}
        {experienceBlocks?.map((block) => (
          <ExperienceBlockRenderer key={block.id} block={block} />
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
          @keyframes marqueeSlow {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .animate-marquee-slow {
            display: flex !important;
            width: max-content !important;
            animation: marqueeSlow 26s linear infinite !important;
            will-change: transform;
          }
          .animate-marquee-slow:hover,
          .animate-marquee-slow:active {
            animation-play-state: paused !important;
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-marquee-slow {
              animation: none !important;
              transform: none !important;
            }
            .banner-card {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
