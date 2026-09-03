import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Image as ImageIcon, Sparkles, Heart, Share2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@hive/ui";
import { useWishlistStore } from "@/store/wishlist-store";
import { ProductDetail } from "@/lib/mockProductDetails";
import { withImageVariant } from "../../../../../convex/media/urls";
import { ProductPhotoDisclaimer } from "./ProductPhotoDisclaimer";

/**
 * Gallery images arrive here already resolved to the "pdp" width (1200px) by
 * enrichProducts, and every surface below used to render that same URL — hero,
 * carousel slide, and both thumbnail strips.
 *
 * Sharing one URL meant the thumbnails were free (browser cache hits), but it
 * also meant the *visible, eager* thumbnail strip forced a full 1200px download
 * of every image on load, including ones the shopper never opens. Measured on a
 * real product image: 88 kB per full rendition against 18 kB for a thumbnail.
 *
 * So thumbnails now request the "thumbnail" rendition and the off-screen
 * carousel slides load lazily. That trades N full downloads for one full
 * download plus N small ones.
 */
const thumbUrl = (url: string) => withImageVariant(url, "thumbnail");

export interface ProductGalleryProps {
  images: string[];
  videoUrl?: string;
  productName: string;
  product?: ProductDetail;
}

type MediaItem = 
  | { type: "image"; url: string; index: number }
  | { type: "video"; url: string };

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images = [],
  videoUrl,
  productName,
  product,
}) => {
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

  // Seeded from mediaList during the first render rather than in an effect.
  // mediaList is derived entirely from props, so the first item is already known
  // at render time — and the desktop hero below is gated on selectedMedia. While
  // this started as null, that hero was absent from the server-rendered HTML, so
  // the browser could not discover the largest image on the page until React had
  // hydrated, which defeated its fetchPriority="high".
  //
  // The effect below still runs, and still handles mediaList changing later
  // (a different product, or images arriving late).
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(
    () => mediaList[0] ?? null
  );
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { toggleItem, hasItem } = useWishlistStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isLightboxOpen]);

  const isWishlisted = hydrated && product ? hasItem(product.slug) : false;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!product) return;
    toggleItem({
      id: (product as any)._id ?? product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      imageUrl: images[0] || "",
      boutiqueName: product.boutique.name,
      rating: product.rating,
      reviewCount: product.reviewCount,
      sizes: product.sizes,
      stockBySize: (product as any).stockBySize ?? product.inventory,
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window === "undefined") return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: productName,
          text: `Check out ${productName} on Hive!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setToast("Link copied to clipboard");
        setTimeout(() => setToast(null), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const renderActionButtons = (isDesktop: boolean) => {
    if (!product) return null;
    return (
      <div className={cn("absolute z-20 flex gap-2.5", isDesktop ? "top-6 right-6" : "top-4 right-4")}>
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share product"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/75 border border-white/45 text-stone-900 hover:bg-white backdrop-blur-md transition-all active:scale-95 shadow-md cursor-pointer"
        >
          <Share2 className="w-4.5 h-4.5 stroke-[1.8]" />
        </button>

        {/* Heart Button */}
        <button
          type="button"
          onClick={toggleFavorite}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-md cursor-pointer",
            isWishlisted
              ? "bg-hive-gold border border-hive-gold text-stone-900"
              : "bg-white/75 border border-white/45 text-stone-900 hover:bg-white"
          )}
        >
          <Heart
            className={cn(
              "w-4.5 h-4.5 transition-all duration-300",
              isWishlisted ? "fill-stone-900 stroke-stone-900" : "stroke-current fill-none"
            )}
          />
        </button>
      </div>
    );
  };

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

  const activeIndex = selectedMedia
    ? mediaList.findIndex(
        (m) =>
          (m.type === "image" && selectedMedia.type === "image" && m.index === selectedMedia.index) ||
          (m.type === "video" && selectedMedia.type === "video")
      )
    : 0;

  return (
    <div className="w-full flex flex-col md:flex-row gap-6">
      {/* Toast Notification element */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] bg-hive-dark/95 border border-stone-850/50 text-white rounded-full px-5 py-3 shadow-2xl flex items-center">
          <span className="text-xs font-semibold tracking-wide">{toast}</span>
        </div>
      )}
      
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
                  src={thumbUrl(item.url)}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full relative flex flex-col items-center justify-center bg-hive-dark/5">
                  <img
                    src={thumbUrl(images[0] ?? "")}
                    alt="Video preview"
                    loading="lazy"
                    decoding="async"
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
          {/* Action Buttons overlay */}
          {renderActionButtons(true)}
          {selectedMedia?.type === "image" ? (
            // Deliberately a raw <img>, not next/image. This element is the
            // hover-zoom surface: handleMouseMove writes a scale + dynamic
            // transformOrigin straight onto `style`, and next/image owns the
            // element's own style/transform for its fill layout. It also keeps
            // Vercel's optimizer out of the path — the URL is already a
            // Cloudflare-transformed rendition, so routing it through a second
            // optimizer would re-encode an image that is already the right size
            // and bill for it twice.
            <img
              src={selectedMedia.url}
              alt={productName}
              style={zoomStyle}
              // Desktop LCP element. Its container is aspect-[3/4], so there is
              // no layout shift to guard against with intrinsic dimensions.
              loading="eager"
              fetchPriority="high"
              decoding="sync"
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

          {/* AI Visual Preview badge overlay (Desktop) */}
          <div className="absolute bottom-6 left-6 z-20">
            <ProductPhotoDisclaimer source={product?.photoSource} variant="badge" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Mobile Layout: Swipeable horizontal gallery                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden w-full relative">
        {/* Action Buttons overlay */}
        {renderActionButtons(false)}

        {/* AI Visual Preview badge overlay (Mobile) */}
        <div className="absolute bottom-4 left-4 z-20">
          <ProductPhotoDisclaimer source={product?.photoSource} variant="badge" />
        </div>

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
              className={cn(
                "w-full h-full flex-shrink-0 snap-start snap-always relative overflow-hidden",
                item.type === "image" && "cursor-zoom-in active:opacity-95 transition-opacity"
              )}
              onClick={() => {
                if (item.type === "image") {
                  const imageIdx = images.indexOf(item.url);
                  setLightboxIndex(imageIdx !== -1 ? imageIdx : 0);
                  setIsLightboxOpen(true);
                }
              }}
            >
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt={`${productName} slide ${idx + 1}`}
                  // The first slide is the mobile LCP element, so it loads
                  // eagerly at high priority. The rest sit off-screen in a
                  // horizontal scroller and used to be fetched eagerly at full
                  // width — the single largest source of wasted bytes on this
                  // page. They now load when the shopper swipes to them.
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  decoding={idx === 0 ? "sync" : "async"}
                  className="w-full h-full object-cover select-none"
                />
              ) : (
                <div className="w-full h-full bg-black relative" onClick={(e) => e.stopPropagation()}>
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

        {/* Mobile Swipe counter capsule (bottom-right) */}
        {mediaList.length > 1 && (
          <div className="absolute bottom-4 right-4 z-10 bg-white/75 border border-white/45 text-stone-900 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider select-none pointer-events-none backdrop-blur-md shadow-sm">
            {activeIndex + 1} / {mediaList.length}
          </div>
        )}

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
                    <img
                      src={thumbUrl(item.url)}
                      alt={`${productName} thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
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

      {/* Mobile Swipeable Zoom Lightbox Overlay */}
      {isLightboxOpen && images.length > 0 && hydrated && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black flex flex-col justify-between p-4 pb-safe animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between w-full text-white z-50 pt-2">
            <span className="text-[11px] font-bold tracking-widest uppercase text-stone-400">
              {lightboxIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              aria-label="Close zoom"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Large Image Viewport */}
          <div 
            className="flex-1 w-full flex items-center justify-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              // TouchList is index-accessed, so under noUncheckedIndexedAccess
              // the first touch is number | undefined — a multi-touch gesture
              // that ends before this fires can legitimately give an empty list.
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const touchEndX = e.changedTouches[0]?.clientX;
              if (touchEndX === undefined) return;
              const diffX = touchStartX.current - touchEndX;
              const minSwipeDistance = 50; // minimum distance to qualify as a swipe
              
              if (diffX > minSwipeDistance) {
                // Swiped left -> Go to next image
                setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
              } else if (diffX < -minSwipeDistance) {
                // Swiped right -> Go to previous image
                setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
              }
              touchStartX.current = null;
            }}
          >
            {/* Previous Image trigger */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all z-20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Main zoomable image */}
            <div className="w-full h-full flex items-center justify-center relative p-2 overflow-auto scrollbar-none">
              {/* Raw <img> by necessity: object-contain against a viewport-sized
                  box with native pinch-zoom. next/image's fill layout assumes a
                  positioned parent it can cover, which is the opposite of what a
                  letterboxed zoom view needs. Only mounted while the lightbox is
                  open, so it costs nothing on load. */}
              <img
                src={images[lightboxIndex]}
                alt={`${productName} zoom ${lightboxIndex + 1}`}
                decoding="async"
                className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-300 ease-out select-none"
                style={{ touchAction: "pinch-zoom" }}
              />
            </div>

            {/* Next Image trigger */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all z-20"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar Hints */}
          <div className="w-full text-center pb-2 z-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 select-none">
              Pinch to zoom • Swipe or tap side arrows to navigate
            </p>
          </div>
        </div>,
        document.body
      )}
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
