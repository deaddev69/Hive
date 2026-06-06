"use client";

import React, { useState } from "react";
import { Play, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@hive/ui";

export interface ProductGalleryProps {
  images: string[];
  videoUrl?: string;
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  videoUrl,
  productName,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
    transform: "scale(1)",
    transformOrigin: "center center",
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transform: "scale(1.8)",
      transformOrigin: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transform: "scale(1)",
      transformOrigin: "center center",
    });
  };

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-4">
      {/* ── Left Sticky Side Panel: Vertical Thumbnails (Desktop Only) ── */}
      {images.length > 1 && (
        <div className="hidden md:flex flex-col gap-3 flex-shrink-0 w-20 sticky top-[100px] h-fit">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative aspect-[3/4] w-full rounded-xl overflow-hidden border-2 bg-hive-cream/20 transition-all duration-200 hover:border-hive-amber/60",
                activeIndex === idx ? "border-hive-amber shadow-md" : "border-hive-border/60"
              )}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          {videoUrl && (
            <button
              type="button"
              onClick={() => setIsVideoOpen(true)}
              className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border-2 border-hive-border/60 bg-hive-dark/5 flex flex-col items-center justify-center gap-1 hover:border-hive-amber/60 transition-colors"
              aria-label="Play video"
            >
              <img
                src={images[0]}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <Play className="w-5 h-5 text-hive-amber relative z-10" fill="currentColor" />
              <span className="text-[9px] font-extrabold text-hive-dark tracking-wide uppercase relative z-10">
                VIDEO
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Right Column: Large Main Image Viewport ── */}
      <div className="flex-1 min-w-0 relative">
        {/* Main image container */}
        <div
          className="relative w-full aspect-[3/4] rounded-[32px] overflow-hidden border border-hive-border/40 bg-hive-cream/10 cursor-zoom-in"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={images[activeIndex]}
            alt={productName}
            className="w-full h-full object-cover transition-transform duration-150 ease-out select-none pointer-events-none"
            style={zoomStyle}
          />

          {/* Video Play Badge (Overlay, Desktop) */}
          {videoUrl && (
            <button
              type="button"
              onClick={() => setIsVideoOpen(true)}
              className="absolute bottom-5 left-5 bg-hive-dark/85 backdrop-blur-md border border-hive-gold/20 text-hive-gold text-xs font-extrabold px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-md hover:bg-hive-dark transition-all active:scale-95 z-20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Play Video
            </button>
          )}

          {/* Left/Right desktop buttons (only show if more than 1 image) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm border border-hive-border/30 flex items-center justify-center shadow-sm text-hive-dark transition-colors md:flex hidden z-20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm border border-hive-border/30 flex items-center justify-center shadow-sm text-hive-dark transition-colors md:flex hidden z-20"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>

        {/* Mobile Swipe Indicators / Image list dot indicators */}
        {images.length > 1 && (
          <div className="flex md:hidden items-center justify-center gap-1.5 mt-3">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeIndex === idx ? "w-6 bg-hive-amber" : "w-1.5 bg-hive-border/80"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
            {videoUrl && (
              <button
                type="button"
                onClick={() => setIsVideoOpen(true)}
                className={cn(
                  "w-5 py-0.5 rounded bg-hive-comb/40 border border-hive-border/60 text-[8px] font-extrabold text-hive-amber flex items-center justify-center"
                )}
                aria-label="Play video"
              >
                <Play className="w-2 h-2 fill-current" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Video Modal Player Overlay ── */}
      {isVideoOpen && videoUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all active:scale-90 z-50 border border-white/10"
              aria-label="Close video player"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Video player */}
            <video
              src={videoUrl}
              autoPlay
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
