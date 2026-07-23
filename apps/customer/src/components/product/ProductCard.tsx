"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductCardData } from "@/lib/mockProducts";
import { Heart, Eye } from "lucide-react";
import { cn } from "@hive/ui";
import { useWishlistStore } from "@/store/wishlist-store";
import { useLocation } from "@/context/LocationContext";
import { QuickViewModal } from "./QuickViewModal";
import { calculateDistanceKm } from "@/lib/distance";
import { useSessionStore } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { navigateToSignIn } from "@/lib/auth-redirect";

export interface ProductCardProps {
  product: ProductCardData;
  onQuickView?: (slug: string) => void;
  isRecommendation?: boolean;
}

// Clean database/AI suffixes from product titles
export function cleanProductTitle(name: string): string {
  if (!name) return "";
  return name
    .replace(/\s*-\s*[A-Za-z0-9\s]+#\d+$/, "") // removes " - Kochi #6", " - Palarivattom #72", etc.
    .replace(/\s*#\d+$/, "") // removes " #18", etc.
    .replace(/\s*\(Out of Stock\)$/i, "") // removes "(Out of Stock)"
    .trim();
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView, isRecommendation }) => {
  const { toggleItem, hasItem } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [localQuickViewOpen, setLocalQuickViewOpen] = useState(false);
  const { isAuthenticated } = useSessionStore();
  const router = useRouter();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const { latitude: userLat, longitude: userLng, city } = useLocation();
  const boutique = (product as any).boutique;

  const isFavorite = hydrated ? hasItem(product.slug) : false;

  // Guard clause to protect empty state and avoid placeholder images in production
  const isInvalid = !product.imageUrl || 
                    product.imageUrl.trim() === "" || 
                    product.imageUrl.includes("placeholder") ||
                    (product as any).active === false || 
                    ((product as any).approvalStatus && (product as any).approvalStatus !== "approved");

  const deliveryBadge = React.useMemo(() => {
    if (userLat === null || userLng === null) return null;
    const bLat = boutique?.latitude ?? boutique?.addressDetails?.lat;
    const bLng = boutique?.longitude ?? boutique?.addressDetails?.lng;
    const bRad = boutique?.deliveryRadiusKm ?? 15;

    if (bLat === undefined || bLng === undefined) {
      const deliversToCity = boutique?.city ? city && boutique.city.toLowerCase() === city.toLowerCase() : true;
      return {
        label: deliversToCity ? `✓ Delivers to ${city}` : "✗ Outside your area",
        isServiceable: deliversToCity
      };
    }

    const dist = calculateDistanceKm(userLat, userLng, bLat, bLng);
    const isServiceable = dist <= bRad;
    return {
      label: isServiceable ? `✓ ${dist.toFixed(1)} km away` : "✗ Outside your area",
      isServiceable
    };
  }, [userLat, userLng, boutique, city]);

  // Clean logistics metadata single line (plain text, no badges, no icons, fashion-oriented)
  const logisticsText = React.useMemo(() => {
    if (isInvalid) return null;
    const isSameDay = product.sameDayDelivery || product.sameDayDelivery === undefined;
    if (isSameDay) {
      const currentHour = new Date().getHours();
      return (currentHour >= 8 && currentHour < 20) ? "Delivers Today" : "Delivers Tomorrow";
    }
    return "Express Delivery";
  }, [product, isInvalid]);

  if (isInvalid) {
    return null;
  }

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    toggleItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      imageUrl: product.imageUrl,
      boutiqueName: product.boutiqueName,
      rating: product.rating,
      reviewCount: product.reviewCount,
      sizes: product.sizes,
      stockBySize: product.stockBySize,
    });
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  const handleQuickViewOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onQuickView) {
      onQuickView(product.slug);
    } else {
      setLocalQuickViewOpen(true);
    }
  };

  const discountPercent = product.compareAtPrice
    ? Math.round(
        ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
      )
    : 0;

  // Derive collection/category label (standardized merchandising)
  const collectionLabel = useMemoLabel(product.occasion);

  const isSoldOut = hydrated && product.stockBySize && Object.values(product.stockBySize).reduce((sum, val) => sum + (val || 0), 0) <= 0;

  return (
    <div className="relative w-full h-full flex flex-col group select-none bg-white rounded-xl border border-black/[0.06] overflow-hidden transition-all duration-300">
      
      {/* ── Image area (4:5 Aspect Ratio, reduced height) ── */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-stone-50 rounded-t-xl transform translate-z-0" style={{ aspectRatio: "4/5" }}>
        
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20 pointer-events-none">
          {isSoldOut && (
            <div className="bg-black/80 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-sm">
              Sold Out
            </div>
          )}
          {isRecommendation && (
            <div className="bg-[#FAF7F0]/90 backdrop-blur-sm text-[#7A6030] border border-[#EAE4D9]/85 text-[8px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md shadow-sm">
              Recommended
            </div>
          )}
        </div>
        
        {/* Product image link */}
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block w-full h-full z-10">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              loading="lazy"
              className="object-cover w-full h-full pointer-events-none transform group-hover:scale-[1.02] transition-transform duration-200 ease-out"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="absolute inset-0 bg-stone-100 flex flex-col items-center justify-center text-stone-600 p-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">No Image</span>
            </div>
          )}
        </Link>

        {/* Wishlist heart overlay */}
        <button
          onClick={toggleFavorite}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center border border-white/20 text-stone-700 hover:text-hive-gold hover:bg-white shadow-sm z-20 transition-all active:scale-90 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            pulse && "scale-110"
          )}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-all duration-300",
              isFavorite
                ? "fill-hive-gold stroke-hive-gold scale-110"
                : "stroke-current fill-none"
            )}
          />
        </button>

        {/* Quick View Button overlay (Desktop) */}
        <button
          onClick={handleQuickViewOpen}
          className="absolute bottom-0 left-0 right-0 bg-white text-hive-dark text-[10px] font-extrabold tracking-widest uppercase py-3.5 border-t border-hive-border/20 rounded-none z-20 transition-all duration-300 translate-y-full group-hover:translate-y-0 active:bg-slate-100 hover:bg-hive-dark hover:text-white hover:border-t-hive-dark hidden md:flex items-center justify-center gap-2 select-none"
        >
          <Eye className="w-3.5 h-3.5 stroke-[2]" />
          <span>Quick Look</span>
        </button>

        {/* Mobile Quick Look Button overlay */}
        <button
          onClick={handleQuickViewOpen}
          aria-label="Quick look"
          className="absolute top-[46px] right-2.5 w-8 h-8 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center border border-white/20 text-stone-700 md:hidden z-20 active:scale-90 shadow-sm hover:bg-white"
        >
          <Eye className="w-4 h-4 text-hive-dark stroke-[2]" />
        </button>
      </div>

      {/* ── Card content (Compressed) ── */}
      <div className="p-3 flex flex-col text-left flex-1 justify-between gap-2 bg-white">
        <div className="flex flex-col gap-1">
          {/* Logistics / Delivery Badge (First thing seen after photo) */}
          {(logisticsText === "Delivers Today" || logisticsText === "Delivers Tomorrow") && (
            <div className={cn(
              "inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full w-fit mb-1.5",
              "bg-amber-50 text-amber-800 border border-amber-200/30"
            )}>
              <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
              {logisticsText}
            </div>
          )}

          {/* Category / Collection Tag */}
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-amber-700 leading-none mb-1">
            {collectionLabel}
          </span>

          <Link href={`/products/${product.slug}`} className="hover:text-stone-600 transition-colors block">
            <h3 className="text-sm md:text-base font-normal leading-snug text-stone-900 line-clamp-2 break-words">
              {cleanProductTitle(product.name)}
            </h3>
          </Link>

          {/* Merchant attribution */}
          <div className="text-[12px] text-stone-500 font-normal leading-none mt-0.5 relative z-20">
            from{" "}
            <Link 
              href={`/shop/${boutique?.slug || (product as any).boutiqueId || (product as any).boutique?.id || ""}`}
              className="hover:text-stone-900 hover:underline transition-colors cursor-pointer"
            >
              {product.boutiqueName || boutique?.name || boutique?.boutiqueName || "Hive Boutique"}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-stone-50">
          {/* Price (Own row, breathing room) */}
          <div className="text-base md:text-lg font-medium text-stone-900 leading-none flex items-center flex-wrap gap-1">
            <span>₹{product.price.toLocaleString("en-IN")}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <>
                <span className="text-xs text-stone-400 line-through font-normal ml-1" style={{ textDecoration: "line-through" }}>
                  ₹{product.compareAtPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] font-bold text-[#7A6030] bg-[#FAF7F0] border border-[#EAE4D9]/80 px-1.5 py-0.5 rounded-md">
                  Save ₹{Math.round(product.compareAtPrice - product.price).toLocaleString("en-IN")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {localQuickViewOpen && (
        <QuickViewModal
          isOpen={localQuickViewOpen}
          onClose={() => setLocalQuickViewOpen(false)}
          productSlug={product.slug}
          initialProduct={product}
        />
      )}

      {/* Auth Gate Bottom Sheet Modal */}
      {showAuthPrompt && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] transition-all duration-300"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowAuthPrompt(false);
          }}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-[28px] p-6 pb-8 flex flex-col items-center gap-4 text-center border-t border-hive-border/30 shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <div className="w-12 h-1 bg-stone-200 dark:bg-stone-800 rounded-full mb-1" />
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-full text-hive-amber">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-lg font-serif font-black text-hive-dark dark:text-white uppercase tracking-wide">Sign in to save to wishlist</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs leading-relaxed font-medium">
              Create an account or sign in to save your favorite designer items and get notified about price drops and inventory updates.
            </p>
            <div className="flex flex-col gap-2.5 w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAuthPrompt(false);
                  navigateToSignIn(router);
                }}
                className="w-full py-3 bg-[#111111] hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setShowAuthPrompt(false)}
                className="w-full py-3 bg-stone-50 hover:bg-stone-100 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 text-stone-600 dark:text-stone-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper hook or function to map category names cleanly
function useMemoLabel(occasion?: string) {
  if (!occasion) return "General Wear";
  if (occasion === "coords") return "Co-ords Edit";
  if (occasion === "wedding") return "Wedding Season";
  if (occasion === "festival") return "Festive Collection";
  if (occasion === "ethnic") return "Ethnic Staples";
  if (occasion === "party") return "Evening Party";
  if (occasion === "date") return "Date Night Edit";
  if (occasion === "workwear") return "Office Staples";
  return `${occasion.charAt(0).toUpperCase()}${occasion.slice(1)} Wear`;
}
