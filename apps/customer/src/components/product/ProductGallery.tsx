"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@hive/ui";

export interface ProductGalleryProps {
  images: string[];
  videoUrl?: string;
  productName: string;
}

type MediaItem = 
  | { type: "image"; url: string; index: number }
  | { type: "video"; url: string };

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images = [],
  videoUrl,
  productName,
}) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);

  // Parse images and videoUrl into a unified media list
  const mediaList: MediaItem[] = React.useMemo(() => {
    const list: MediaItem[] = images.map((url, index) => ({
      type: "image",
      url,
      index,
    }));
    if (videoUrl) {
      list.push({ type: "video", url: videoUrl });
    }
    return list;
  }, [images, videoUrl]);

  // Set initial selected media
  useEffect(() => {
    if (mediaList.length > 0) {
      setSelectedMedia(mediaList[0] ?? null);
    } else {
      setSelectedMedia(null);
    }
  }, [mediaList]);

  // Sync mobile scroll position to set active index
  const handleMobileScroll = () => {
    const container = mobileScrollRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width === 0) return;

    const index = Math.round(scrollLeft / width);
    if (mediaList[index] && selectedMedia !== mediaList[index]) {
      setSelectedMedia(mediaList[index]);
    }
  };

  // Scroll mobile container when thumbnail is clicked
  const handleThumbnailClick = (item: MediaItem) => {
    setSelectedMedia(item);
    
    // Find index of item in list
    const index = mediaList.findIndex(
      (m) =>
        (m.type === "image" && item.type === "image" && m.index === item.index) ||
        (m.type === "video" && item.type === "video")
    );

    if (index !== -1 && mobileScrollRef.current) {
      const width = mobileScrollRef.current.clientWidth;
      mobileScrollRef.current.scrollTo({
        left: index * width,
        behavior: "smooth",
      });
    }
  };

  // Desktop Zoom on Hover calculations
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedMedia?.type === "video") return; // No zoom on video

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomStyle({
      transform: "scale(1.75)",
      transformOrigin: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transform: "scale(1)",
      transformOrigin: "center center",
    });
  };

  // ── EMPTY STATE ──
  if (mediaList.length === 0) {
    return (
      <div className="w-full aspect-[3/4] rounded-[32px] bg-hive-cream/20 border border-dashed border-hive-border/60 flex flex-col items-center justify-center text-center p-6 select-none relative overflow-hidden">
        {/* Decorative honeycomb backdrop */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.03]">
          <svg className="w-full h-full" aria-hidden="true">
            <defs>
              <pattern id="gallery-empty-hc" patternUnits="userSpaceOnUse" width="40" height="70">
                <path fill="none" stroke="#C9A84C" strokeWidth="1" d="m0,10 20-10 20,10v20l-20,10-20-10z" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gallery-empty-hc)" />
          </svg>
        </div>
        <div className="w-16 h-16 rounded-full bg-hive-gold/10 border border-hive-gold/30 flex items-center justify-center text-hive-amber mb-4 animate-pulse">
          <ImageIcon className="w-7 h-7" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-serif font-extrabold text-hive-dark">
          No Preview Imagery
        </h3>
        <p className="text-xs text-hive-text-muted mt-1 max-w-[200px] leading-relaxed">
          Detailed visuals for this unique boutique design are being cataloged.
        </p>
      </div>
    );
  }

  const activeIndex = selectedMedia?.type === "image" ? selectedMedia.index : mediaList.length - 1;

  return (
    <div className="w-full flex flex-col md:flex-row gap-6">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Desktop Layout: Left Thumbnail Rail                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col gap-3 flex-shrink-0 w-24 sticky top-[100px] h-fit">
        {mediaList.map((item, idx) => {
          const isSelected =
            (item.type === "image" && selectedMedia?.type === "image" && item.index === selectedMedia.index) ||
            (item.type === "video" && selectedMedia?.type === "video");

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedMedia(item)}
              className={cn(
                "relative aspect-[3/4] w-full rounded-2xl overflow-hidden border-2 bg-hive-cream/20 transition-all duration-300 ease-in-out group outline-none",
                isSelected
                  ? "border-hive-amber shadow-md scale-[1.03]"
                  : "border-hive-border/40 hover:border-hive-amber/50 hover:bg-hive-comb/10"
              )}
            >
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full relative flex flex-col items-center justify-center bg-hive-dark/5">
                  <img
                    src={images[0]}
                    alt="Video preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <div className="w-8 h-8 rounded-full bg-hive-amber text-white flex items-center justify-center shadow z-10 transition-transform duration-300 group-hover:scale-110">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Desktop Layout: Center Hero Display Viewport                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block flex-1 min-w-0">
        <div
          ref={mainImageRef}
          className="relative w-full aspect-[3/4] rounded-[32px] overflow-hidden border border-hive-border/40 bg-hive-cream/10 shadow-sm transition-all duration-300 select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {selectedMedia?.type === "image" ? (
            <img
              src={selectedMedia.url}
              alt={productName}
              style={zoomStyle}
              className="w-full h-full object-cover origin-center transition-transform duration-150 ease-out pointer-events-none"
            />
          ) : (
            selectedMedia?.type === "video" && (
              <div className="w-full h-full bg-black relative">
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Mobile Layout: Swipeable horizontal gallery                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden w-full relative">
        {/* Swipe container */}
        <div
          ref={mobileScrollRef}
          onScroll={handleMobileScroll}
          className="w-full aspect-[3/4] rounded-[28px] overflow-x-auto snap-x snap-mandatory flex scrollbar-none border border-hive-border/40 bg-hive-cream/10 shadow-sm"
          style={{ scrollBehavior: "smooth" }}
        >
          {mediaList.map((item, idx) => (
            <div
              key={idx}
              className="w-full h-full flex-shrink-0 snap-start snap-always relative overflow-hidden"
            >
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt={`${productName} slide ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              ) : (
                <div className="w-full h-full bg-black relative">
                  <video
                    src={item.url}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Swipe Indicator Badge overlay */}
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white text-[10px] font-extrabold tracking-widest z-10">
          {activeIndex + 1} / {mediaList.length}
        </div>

        {/* Thumbnail Strip Below (Mobile Only) */}
        {mediaList.length > 1 && (
          <div className="flex justify-center gap-2.5 mt-4 overflow-x-auto py-1 scrollbar-none">
            {mediaList.map((item, idx) => {
              const isSelected =
                (item.type === "image" && selectedMedia?.type === "image" && item.index === selectedMedia.index) ||
                (item.type === "video" && selectedMedia?.type === "video");

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleThumbnailClick(item)}
                  className={cn(
                    "relative aspect-[3/4] w-14 rounded-xl overflow-hidden border-2 bg-hive-cream/20 flex-shrink-0 transition-all duration-200 outline-none",
                    isSelected ? "border-hive-amber scale-105 shadow-sm" : "border-hive-border/60"
                  )}
                >
                  {item.type === "image" ? (
                    <img src={item.url} alt="mobile thumb" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center bg-hive-dark/10">
                      <Play className="w-3.5 h-3.5 text-hive-amber fill-current" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const ProductGallerySkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col md:flex-row gap-6 animate-pulse">
      {/* Left Thumbnail Rail Skeleton (Desktop) */}
      <div className="hidden md:flex flex-col gap-3 flex-shrink-0 w-24">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-[3/4] w-full rounded-2xl bg-hive-comb/15 border border-hive-border/30"
          />
        ))}
      </div>

      {/* Main Image Viewport Skeleton */}
      <div className="flex-1 w-full aspect-[3/4] rounded-[32px] bg-hive-comb/15 border border-hive-border/30 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[galleryShimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      <style>{`
        @keyframes galleryShimmer {
          to { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
