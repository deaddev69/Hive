"use client";

import React, { useState, useRef } from "react";
import { ShieldCheck, Ruler, RefreshCw, Truck } from "lucide-react";
import { cn } from "@hive/ui";
import { ProductDetail } from "@/lib/mockProductDetails";
import { SizeSelector } from "./SizeSelector";
import { TrustCard, PurchaseConfidenceCard } from "./ProductTrustStrip";
import { PurchaseActions } from "./PurchaseActions";

interface MobileProductDetailsProps {
  product: ProductDetail;
}

// Delivery Promise Card (Section 11)
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

export function MobileProductDetails({ product }: MobileProductDetailsProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const measurementMatrixRef = useRef<HTMLDivElement>(null);

  const stockMap: Record<string, number> =
    (product as any).stockBySize ?? product.inventory ?? {};

  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="w-full flex flex-col gap-6 text-left">
      
      {/* 2. Boutique Information Section */}
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

      {/* 3. Product Information Section */}
      <div className="space-y-3">
        <h1 className="text-2xl font-serif font-extrabold text-hive-dark tracking-tight leading-tight line-clamp-2">
          {product.name}
        </h1>
        <div className="flex items-baseline gap-3.5">
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
      </div>

      {/* 4. Size Selection Section */}
      <SizeSelector
        sizes={product.sizes}
        inventory={stockMap}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        onOpenSizeGuide={() => {
          measurementMatrixRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      {/* 5. Purchase Actions Section */}
      <PurchaseActions
        product={product}
        selectedSize={selectedSize}
        onOpenSizeGuide={() => {
          measurementMatrixRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      {/* 6. Product Description */}
      <div className="space-y-2 border-t border-hive-border/40 pt-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-hive-dark">
          Product Description
        </h3>
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

      {/* 7. Real Measurements Card */}
      <div ref={measurementMatrixRef} className="scroll-mt-6 border-t border-hive-border/40 pt-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-hive-dark mb-3">
          Real Measurements
        </h3>
        <TrustCard
          icon={Ruler}
          title="Real Measurements"
          description="Detailed measurement matrix provided for every size."
        />
      </div>

      {/* Trust Cards Section (8, 9, 10, 11) */}
      <div className="flex flex-col gap-4 border-t border-hive-border/40 pt-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-hive-dark mb-1">
          Hive Trust & Delivery
        </h3>
        
        {/* 8. 48-Hour Replacement Card */}
        <TrustCard
          icon={RefreshCw}
          title="48-Hour Replacement"
          description="Replacement requests accepted within 48 hours of delivery with continuous unboxing video proof."
        />

        {/* 9. Verified Boutique Card */}
        <TrustCard
          icon={ShieldCheck}
          title="Verified Boutique"
          description="This boutique has been reviewed and approved by Hive."
        />

        {/* 10. Hive Buyer Protection Card */}
        <PurchaseConfidenceCard />

        {/* 11. Delivery Information Card */}
        <DeliveryPromiseCard
          sameDay={product.sameDayEligible}
          city={product.boutique.city}
        />
      </div>

    </div>
  );
}
