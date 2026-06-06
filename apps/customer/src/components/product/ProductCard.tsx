"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductCardData } from "@/lib/mockProducts";
import { Button, Modal } from "@hive/ui";
import { Heart, ShieldCheck, Play, Truck, X } from "lucide-react";
import { cn } from "@hive/ui";
import { useCartStore } from "@/store/cart-store";
import { useCart } from "@/context/CartContext";

export interface ProductCardProps {
  product: ProductCardData;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isFavorite, setIsFavorite] = useState(product.favorite || false);
  const [pulse, setPulse] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("Free");

  const addItem = useCartStore((state) => state.addItem);
  const { setSidebarOpen } = useCart();

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFavorite(!isFavorite);
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    addItem({
      productId: product.id,
      size: "Free",
      price: product.price,
      name: product.name,
      imageUrl: product.imageUrl,
      boutiqueName: product.boutiqueName,
    });
    setSidebarOpen(true);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsQuickViewOpen(true);
  };

  const handleQuickViewAddToCart = () => {
    addItem({
      productId: product.id,
      size: selectedSize,
      price: product.price,
      name: product.name,
      imageUrl: product.imageUrl,
      boutiqueName: product.boutiqueName,
    });
    setIsQuickViewOpen(false);
    setSidebarOpen(true);
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
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            loading="lazy"
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
          <Button variant="primary" size="sm" className="w-full shadow-md font-bold" onClick={handleAddToCart}>
            Add to Cart
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full bg-white/95 border border-hive-border/40 backdrop-blur-sm text-hive-text font-bold"
            onClick={handleQuickView}
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
          <Button variant="primary" size="sm" className="w-full py-2.5 font-bold" onClick={handleAddToCart}>
            Add to Cart
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2.5 border border-hive-border/40 bg-white text-hive-text font-bold"
            onClick={handleQuickView}
          >
            Quick View
          </Button>
        </div>
      </div>

      {/* Quick View Modal Overlay */}
      <Modal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        title="Quick View"
        className="max-w-2xl w-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2 text-left select-none">
          {/* Product Image */}
          <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          
          {/* Product Details Section */}
          <div className="flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-hive-amber">
                  {product.boutiqueName}
                </span>
                <h3 className="text-base font-bold text-hive-dark mt-1 leading-snug">
                  {product.name}
                </h3>
              </div>

              <div className="text-base font-extrabold text-hive-dark">
                ₹{product.price.toLocaleString("en-IN")}
                {product.compareAtPrice && (
                  <span className="text-xs text-hive-text-muted line-through font-medium ml-2.5">
                    ₹{product.compareAtPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* Size Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Select Size
                </span>
                <div className="flex flex-wrap gap-2">
                  {["XS", "S", "M", "L", "XL", "Free"].map((sz) => {
                    const isSel = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={cn(
                          "w-10 h-10 rounded-xl border text-xs font-bold transition-all duration-200 select-none",
                          isSel
                            ? "border-hive-dark bg-hive-dark text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 active:scale-95"
                        )}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="primary"
                className="w-full font-bold uppercase tracking-wider py-3"
                onClick={handleQuickViewAddToCart}
              >
                Add to Bag
              </Button>
              <Link
                href={`/products/${product.slug}`}
                onClick={() => setIsQuickViewOpen(false)}
                className="block text-center text-xs font-bold text-hive-text hover:text-hive-amber transition-colors border border-slate-200 py-3 rounded-xl bg-white active:scale-[0.98]"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </div>
      </Modal>
      
    </div>
  );
};
