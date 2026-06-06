import React, { useState } from "react";
import Link from "next/link";
import { ProductCardData } from "@/lib/mockProducts";
import { Button } from "@hive/ui";
import { Heart, ShieldCheck, Play, Truck } from "lucide-react";
import { cn } from "@hive/ui";

export interface ProductCardProps {
  product: ProductCardData;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isFavorite, setIsFavorite] = useState(product.favorite || false);
  const [pulse, setPulse] = useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFavorite(!isFavorite);
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="relative w-full overflow-hidden bg-white border border-hive-border/60 rounded-[24px] group shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col p-3">
      
      {/* 3:4 Aspect Ratio Image Wrapper */}
      <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-hive-cream/20">
        
        {/* Product Image */}
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block w-full h-full z-10">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500 pointer-events-none"
          />
        </Link>

        {/* Top-Left Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {product.isNewArrival && (
            <span className="bg-[#FFFDF5]/90 border border-hive-border/60 text-hive-amber text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm select-none">
              NEW
            </span>
          )}
          {product.isTrending && (
            <span className="bg-hive-gold/90 border border-hive-amber/20 text-hive-dark text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm select-none">
              TRENDING
            </span>
          )}
          {product.isBestSeller && (
            <span className="bg-hive-dark/95 text-hive-gold text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm select-none">
              BESTSELLER
            </span>
          )}
        </div>

        {/* Top-Right Favorite Heart Icon */}
        <button
          onClick={toggleFavorite}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "absolute top-3 right-3 w-8.5 h-8.5 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border border-hive-border/30 text-hive-text-muted hover:text-hive-amber hover:bg-white shadow-sm z-20 transition-all active:scale-90",
            pulse && "scale-110"
          )}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-all duration-300",
              isFavorite
                ? "fill-hive-amber stroke-hive-amber scale-110"
                : "stroke-current fill-none"
            )}
          />
        </button>

        {/* Bottom-Left Same Day Delivery Badge */}
        {product.sameDayDelivery && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-hive-border/40 text-hive-dark text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 z-20 shadow-sm select-none">
            <Truck className="w-3.5 h-3.5 text-hive-amber" />
            Same Day
          </div>
        )}

        {/* Bottom-Right Play Video Overlay */}
        {product.videoAvailable && (
          <button
            aria-label="Play product video"
            className="absolute bottom-3 right-3 w-8.5 h-8.5 rounded-full bg-hive-dark/65 hover:bg-hive-dark backdrop-blur-sm flex items-center justify-center text-hive-gold border border-hive-gold/20 z-20 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </button>
        )}

        {/* Desktop Slide-up Actions Overlay */}
        <div className="absolute inset-x-3 bottom-3 z-30 md:flex hidden flex-col gap-2 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <Button variant="primary" size="sm" className="w-full shadow-md font-bold">
            Add to Cart
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full bg-white/95 border border-hive-border/40 backdrop-blur-sm text-hive-text font-bold"
          >
            Quick View
          </Button>
        </div>
      </div>

      {/* Card Content Details Section */}
      <div className="px-1.5 py-3 flex flex-col flex-1 justify-between text-left">
        <div>
          {/* Boutique Name & Verification */}
          <div className="flex items-center gap-1 select-none">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-hive-text-muted">
              {product.boutiqueName}
            </span>
            {product.isVerifiedBoutique && (
              <ShieldCheck className="w-3.5 h-3.5 text-hive-amber" />
            )}
          </div>

          {/* Product Name */}
          <Link href={`/products/${product.slug}`} className="hover:text-hive-amber transition-colors block">
            <h3 className="text-sm font-semibold text-hive-dark leading-tight mt-1.5 line-clamp-2 min-h-[40px] tracking-wide">
              {product.name}
            </h3>
          </Link>

          {/* Metadata Row: Rating & Occasion */}
          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            {product.rating && (
              <div className="flex items-center gap-1 text-[11px] font-sans">
                <span className="text-hive-amber text-xs">★</span>
                <span className="font-extrabold text-hive-dark">{product.rating}</span>
                <span className="text-hive-text-muted">({product.reviewCount})</span>
              </div>
            )}
            
            {product.occasion && (
              <span className="inline-block bg-hive-comb/25 text-hive-amber text-[9px] font-extrabold px-2 py-0.5 rounded border border-hive-border/40 uppercase tracking-wider select-none">
                {product.occasion === "coords" ? "Co-ords" : product.occasion}
              </span>
            )}
          </div>
        </div>

        {/* Pricing details */}
        <div className="mt-3.5 pt-3 border-t border-hive-border/40">
          <div className="flex items-baseline gap-2.5">
            <span className="text-base font-extrabold text-hive-dark tracking-tight">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.compareAtPrice && (
              <>
                <span className="text-xs text-hive-text-muted line-through font-medium">
                  ₹{product.compareAtPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] font-bold text-hive-amber tracking-wide">
                  ({discountPercent}% OFF)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mobile Persistent Action Buttons */}
        <div className="flex md:hidden flex-col gap-2 mt-4 w-full">
          <Button variant="primary" size="sm" className="w-full py-2.5 font-bold">
            Add to Cart
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2.5 border border-hive-border/40 bg-white text-hive-text font-bold"
          >
            Quick View
          </Button>
        </div>
      </div>
      
    </div>
  );
};
