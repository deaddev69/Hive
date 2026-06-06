"use client";

import React, { useState, useRef } from "react";
import { ShieldCheck, Star, Truck, Award, Sparkles } from "lucide-react";
import { cn } from "@hive/ui";
import { ProductDetail } from "@/lib/mockProductDetails";
import { SizeSelector, SizeSelectorSkeleton } from "./SizeSelector";
import { MeasurementMatrix, MeasurementMatrixSkeleton } from "./MeasurementMatrix";
import { ProductTrustStrip, PurchaseConfidenceCard, TrustStripSkeleton } from "./ProductTrustStrip";

export interface ProductInfoProps {
  product: ProductDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: DeliveryPromiseCard (Section 7)
// ─────────────────────────────────────────────────────────────────────────────
const DeliveryPromiseCard: React.FC<{ sameDay: boolean; city: string }> = ({
  sameDay,
  city,
}) => {
  return (
    <div className="w-full bg-[#FFFDF5] border border-hive-gold/30 rounded-2xl p-4 text-left flex gap-3.5 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-hive-gold/10 border border-hive-gold/30 flex items-center justify-center text-hive-amber flex-shrink-0">
        <Truck className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="font-extrabold uppercase tracking-wider text-hive-dark">
            {sameDay ? "Delivered Today" : "Express Delivery"}
          </span>
          {sameDay && (
            <span className="text-[9px] font-extrabold uppercase bg-hive-amber text-white px-2 py-0.5 rounded-full tracking-wide">
              Same Day Eligible
            </span>
          )}
        </div>
        <p className="text-hive-text-muted mt-1 leading-relaxed font-medium">
          {sameDay
            ? `Order by 3:00 PM for delivery by 7:00 PM inside the ${city} delivery zone.`
            : `Delivered to your doorstep inside the ${city} zone in 24–48 hours.`}
        </p>
      </div>
    </div>
  );
};

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const measurementMatrixRef = useRef<HTMLDivElement>(null);

  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  // Occasion tags formatter helper
  const formatTag = (tag: string) => {
    return tag
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      
      {/* ── SECTION 1: BOUTIQUE DETAILS ── */}
      <div className="flex items-center justify-between border-b border-hive-border/40 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-hive-amber">
            {product.boutique.name}
          </span>
          {product.boutique.verified && (
            <span className="inline-flex items-center gap-0.5 bg-hive-gold/10 border border-hive-gold/30 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold text-hive-amber uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
              VERIFIED
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-[10px] font-bold text-hive-text-muted hover:text-hive-amber transition-colors uppercase tracking-widest underline decoration-dotted underline-offset-4"
        >
          View Boutique Details
        </button>
      </div>

      {/* ── SECTION 2: PRODUCT NAME ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-hive-dark tracking-tight leading-tight line-clamp-2">
          {product.name}
        </h1>
      </div>

      {/* ── SECTION 3: RATING (CLICKABLE PLACEHOLDER ONLY) ── */}
      {product.rating && (
        <button
          type="button"
          className="flex items-center gap-2 self-start hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-1 bg-hive-cream/35 border border-hive-border/50 px-2.5 py-1 rounded-xl text-xs font-bold text-hive-dark">
            <Star className="w-3.5 h-3.5 fill-hive-amber text-hive-amber" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-[11px] text-hive-text-muted hover:underline font-semibold mt-0.5">
            ({product.reviewCount} Reviews)
          </span>
        </button>
      )}

      {/* ── SECTION 5: OCCASION TAGS ── */}
      {product.occasionTags && product.occasionTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.occasionTags.map((tag) => (
            <span
              key={tag}
              className="bg-white border border-hive-border text-hive-dark text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm select-none"
            >
              {formatTag(tag)}
            </span>
          ))}
        </div>
      )}

      {/* ── SECTION 4: PRICING ── */}
      <div className="flex items-baseline gap-3.5 border-b border-hive-border/40 pb-5">
        <span className="text-2xl font-extrabold text-hive-dark tracking-tight">
          ₹{product.price.toLocaleString("en-IN")}
        </span>
        {product.compareAtPrice && (
          <>
            <span className="text-sm text-hive-text-muted line-through font-medium">
              ₹{product.compareAtPrice.toLocaleString("en-IN")}
            </span>
            <span className="bg-hive-gold/15 text-hive-amber border border-hive-gold/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {discountPercent}% OFF
            </span>
          </>
        )}
      </div>

      {/* ── SIZE SELECTOR UX (Phase 6.4 Insertion) ── */}
      <SizeSelector
        sizes={product.sizes}
        inventory={product.inventory}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        onOpenSizeGuide={() => {
          measurementMatrixRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      {/* ── MEASUREMENT MATRIX & FIT GUIDANCE (Phase 6.5 Insertion) ── */}
      <div ref={measurementMatrixRef} className="scroll-mt-6">
        <MeasurementMatrix
          productName={product.name}
          measurementMatrix={product.measurementMatrix}
          selectedSize={selectedSize}
          fitNote={product.fitNote}
        />
      </div>

      {/* ── TRUST LAYER (Phase 6.6 Insertion) ── */}
      <div className="flex flex-col gap-4 border-b border-hive-border/40 pb-5">
        <ProductTrustStrip
          videoUrl={product.videoUrl}
          sameDayEligible={product.sameDayEligible}
        />
        <PurchaseConfidenceCard />
      </div>

      {/* ── SECTION 6: CLAMPABLE DESCRIPTION ── */}
      <div className="space-y-2">
        <div
          className={cn(
            "text-sm text-hive-text-muted leading-relaxed font-medium transition-all duration-300",
            !isDescExpanded && "line-clamp-3"
          )}
        >
          {product.description}
        </div>
        <button
          type="button"
          onClick={() => setIsDescExpanded(!isDescExpanded)}
          className="text-xs font-extrabold text-hive-amber hover:text-hive-gold transition-colors uppercase tracking-widest"
        >
          {isDescExpanded ? "Read Less" : "Read More"}
        </button>
      </div>

      {/* ── SECTION 7: DELIVERY PROMISE CARD ── */}
      <DeliveryPromiseCard
        sameDay={product.sameDayEligible}
        city={product.boutique.city}
      />

      {/* Description space placeholder - clean layout without redundant trust badges */}
      
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const ProductInfoSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse text-left p-2">
      {/* Boutique header skeleton */}
      <div className="flex items-center justify-between border-b border-hive-border/40 pb-3">
        <div className="h-3 w-1/3 bg-hive-comb/15 rounded" />
        <div className="h-2 w-1/4 bg-hive-comb/10 rounded" />
      </div>

      {/* Product name skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-full bg-hive-comb/20 rounded" />
        <div className="h-6 w-3/4 bg-hive-comb/20 rounded" />
      </div>

      {/* Rating skeleton */}
      <div className="h-4 w-1/3 bg-hive-comb/10 rounded" />

      {/* Occasion tags skeletons */}
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-hive-comb/10 rounded-full" />
        <div className="h-6 w-20 bg-hive-comb/10 rounded-full" />
      </div>

      {/* Pricing skeleton */}
      <div className="h-8 w-1/2 bg-hive-comb/15 rounded border-b border-hive-border/40 pb-5" />

      {/* Size Selector skeleton */}
      <SizeSelectorSkeleton />

      {/* Measurement Matrix skeleton */}
      <MeasurementMatrixSkeleton />

      {/* Trust Strip & Confidence Card skeleton */}
      <TrustStripSkeleton />

      {/* Description lines skeletons */}
      <div className="space-y-2">
        <div className="h-3.5 w-full bg-hive-comb/10 rounded" />
        <div className="h-3.5 w-full bg-hive-comb/10 rounded" />
        <div className="h-3.5 w-2/3 bg-hive-comb/10 rounded" />
      </div>

      {/* DeliveryPromiseCard skeleton */}
      <div className="h-20 w-full bg-hive-comb/10 rounded-2xl border border-hive-border/20" />

      {/* Trust badges skeleton */}
      <div className="grid grid-cols-2 gap-3.5 border-t border-b border-hive-border/40 py-5">
        <div className="h-3 w-2/3 bg-hive-comb/10 rounded" />
        <div className="h-3 w-2/3 bg-hive-comb/10 rounded" />
      </div>
    </div>
  );
};
