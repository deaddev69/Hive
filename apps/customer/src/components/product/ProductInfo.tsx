"use client";

import React, { useState } from "react";
import { ShieldCheck, Star, Truck, Ruler, Heart, Sparkles } from "lucide-react";
import { cn } from "@hive/ui";
import { BoutiqueMeta } from "@/lib/mockProductDetails";

export interface ProductInfoProps {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  rating?: number;
  reviewCount?: number;
  boutique: BoutiqueMeta;
  sizes: string[];
  inventory: Record<string, number>;
  fitNote: string;
  deliveryInfo: string;
  sameDayEligible: boolean;
  onOpenMeasurements: () => void;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({
  name,
  description,
  price,
  compareAtPrice,
  rating,
  reviewCount,
  boutique,
  sizes,
  inventory,
  fitNote,
  deliveryInfo,
  sameDayEligible,
  onOpenMeasurements,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] || "");
  const [isFavorite, setIsFavorite] = useState(false);

  const discountPercent = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const currentStock = selectedSize ? inventory[selectedSize] ?? 0 : 0;

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      {/* ── Section 1: Boutique Header ── */}
      <div className="flex items-center justify-between border-b border-hive-border/40 pb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-widest text-hive-amber">
              {boutique.name}
            </span>
            {boutique.verified && (
              <ShieldCheck className="w-4 h-4 text-hive-amber" strokeWidth={2.5} />
            )}
          </div>
          <p className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider mt-0.5">
            Boutique Partner in {boutique.city}
          </p>
        </div>

        {boutique.rating && (
          <div className="flex items-center gap-1 bg-hive-cream/30 border border-hive-border/50 px-2.5 py-1 rounded-xl text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-hive-amber text-hive-amber" />
            <span className="font-extrabold text-hive-dark">{boutique.rating}</span>
            <span className="text-hive-text-muted font-medium">({boutique.reviewCount})</span>
          </div>
        )}
      </div>

      {/* ── Section 2: Product Name & Meta ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-hive-dark tracking-tight leading-tight">
          {name}
        </h1>

        {rating && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center text-hive-amber text-xs">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={cn(i < Math.floor(rating) ? "text-hive-amber" : "text-hive-border")}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs font-extrabold text-hive-dark">{rating}</span>
            <span className="text-hive-border text-xs">·</span>
            <span className="text-xs text-hive-text-muted font-medium">
              {reviewCount} Verified Reviews
            </span>
          </div>
        )}
      </div>

      {/* ── Section 3: Pricing ── */}
      <div className="flex items-baseline gap-3 bg-hive-cream/10 border border-hive-border/30 p-4 rounded-[20px]">
        <span className="text-2xl font-extrabold text-hive-dark tracking-tight">
          ₹{price.toLocaleString("en-IN")}
        </span>
        {compareAtPrice && (
          <>
            <span className="text-sm text-hive-text-muted line-through font-medium">
              ₹{compareAtPrice.toLocaleString("en-IN")}
            </span>
            <span className="bg-hive-gold/15 text-hive-amber border border-hive-gold/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {discountPercent}% OFF
            </span>
          </>
        )}
      </div>

      {/* ── Section 4: Product Description ── */}
      <div>
        <p className="text-sm text-hive-text-muted leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* ── Section 5: Size Selection ── */}
      <div className="border-t border-hive-border/40 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-hive-dark">
            Select Size
          </span>
          <button
            type="button"
            onClick={onOpenMeasurements}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-hive-amber hover:text-hive-gold transition-colors"
          >
            <Ruler className="w-3.5 h-3.5" />
            Actual Measurements Matrix
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {sizes.map((size) => {
            const stock = inventory[size] ?? 0;
            const isOutOfStock = stock === 0;
            const isSelected = selectedSize === size;

            return (
              <button
                key={size}
                type="button"
                disabled={isOutOfStock}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "h-12 min-w-[3rem] px-4 rounded-xl text-xs font-extrabold border flex items-center justify-center transition-all duration-200 relative",
                  isSelected
                    ? "bg-hive-amber border-hive-amber text-white shadow-md shadow-hive-amber/15 scale-[1.02]"
                    : isOutOfStock
                    ? "border-hive-border/40 bg-hive-cream/10 text-hive-text-muted/40 cursor-not-allowed line-through"
                    : "bg-white border-hive-border hover:border-hive-amber/50 hover:bg-hive-comb/10 text-hive-dark"
                )}
              >
                {size}
                {stock > 0 && stock < 5 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Stock Inventory Warning Message */}
        {selectedSize && (
          <div className="mt-3.5 min-h-[20px]">
            {currentStock === 0 ? (
              <span className="text-xs text-red-500 font-bold">Out of stock in selected size.</span>
            ) : currentStock < 5 ? (
              <span className="text-xs text-amber-600 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                Hurry! Only {currentStock} left in this handmade size.
              </span>
            ) : (
              <span className="text-xs text-green-600 font-bold">Size is in stock & ready for pickup.</span>
            )}
          </div>
        )}
      </div>

      {/* ── Section 6: Fit Notes ── */}
      <div className="bg-hive-cream/25 border border-hive-border/40 rounded-2xl p-4 text-xs">
        <span className="font-extrabold uppercase tracking-wider text-hive-dark block mb-1">
          Fit & Styling Notes
        </span>
        <p className="text-hive-text-muted leading-relaxed font-medium">{fitNote}</p>
      </div>

      {/* ── Section 7: Delivery SLA ── */}
      <div className="border-t border-b border-hive-border/40 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-hive-cream flex items-center justify-center text-hive-amber flex-shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs">
          <span className="font-extrabold uppercase tracking-wider text-hive-dark flex items-center gap-1.5">
            Delivery Information
            {sameDayEligible && (
              <span className="text-[9px] font-extrabold uppercase bg-hive-gold/15 text-hive-amber border border-hive-gold/30 px-1.5 py-0.5 rounded">
                SAME DAY ELIGIBLE
              </span>
            )}
          </span>
          <p className="text-hive-text-muted mt-0.5 font-medium leading-relaxed">
            {deliveryInfo}
          </p>
        </div>
      </div>

      {/* ── Section 8: Action Buttons ── */}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          disabled={!selectedSize || inventory[selectedSize] === 0}
          className={cn(
            "flex-1 h-14 rounded-2xl bg-hive-dark text-hive-gold text-sm font-extrabold uppercase tracking-widest shadow-lg shadow-hive-dark/15 hover:bg-hive-amber hover:text-white hover:shadow-hive-amber/10 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-hive-dark disabled:hover:text-hive-gold disabled:cursor-not-allowed"
          )}
        >
          Add to Bag
        </button>

        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          className={cn(
            "w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300",
            isFavorite
              ? "bg-hive-amber/15 border-hive-amber/35 text-hive-amber"
              : "bg-white border-hive-border hover:border-hive-amber/50 text-hive-text-muted hover:text-hive-amber hover:bg-hive-comb/10"
          )}
          aria-label="Add to wishlist"
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>
      </div>
    </div>
  );
};
