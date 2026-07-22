"use client";
import React, { useState } from "react";
import { Scissors, Compass, Ruler, FileText, Shirt } from "lucide-react";
import { cn } from "@hive/ui";
import { PRODUCT_SPEC_KEYS } from "@hive/types";
import { ProductDetail } from "@/lib/mockProductDetails";
import { SizeSelector } from "./SizeSelector";
import { PurchaseActions } from "./PurchaseActions";
import { useRouter } from "next/navigation";
import { cleanProductTitle } from "./ProductCard";
import Link from "next/link";

export interface ProductInfoProps {
  product: ProductDetail;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ 
  product, 
  selectedSize, 
  setSelectedSize 
}) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const router = useRouter();

  // ── Single source of truth for stock ──────────────────────────────────────
  const stockMap: Record<string, number> =
    (product as any).stockBySize ?? product.inventory ?? {};

  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  // Fit recommendation & silhouette from product
  const fitRecommendation = (product as any).fitRecommendation as "runs_small" | "true_to_size" | "runs_large" | undefined;
  const silhouette = (product as any).silhouette as "slim_fit" | "regular_fit" | "relaxed_fit" | "oversized" | undefined;

  const fitBadgeConfig = {
    runs_small:   { label: "Runs Small", advice: "Consider ordering one size up." },
    true_to_size: { label: "True to Size", advice: "Fits as expected for standard sizing." },
    runs_large:   { label: "Runs Large", advice: "Consider ordering one size down." },
  };

  const silhouetteConfig = {
    slim_fit:     "Slim Fit — tailored outline, cut close to the body",
    regular_fit:  "Regular Fit — standard drape, classic silhouette",
    relaxed_fit:  "Relaxed Fit — extra room, comfortable cut",
    oversized:    "Oversized Cut — intentionally loose and baggy",
  };

  // Occasion tags formatter helper
  const formatTag = (tag: string) => {
    return tag
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const hasDescription = product.description && product.description.trim() !== "";

  const productDetails = (product as any).details || {};
  const renderedSpecs = Object.entries(PRODUCT_SPEC_KEYS)
    .map(([key, label]) => {
      const val = productDetails[key]?.trim();
      return { label, value: val };
    })
    .filter(item => !!item.value);

  const hasDetails = renderedSpecs.length > 0;

  // Prepare spec list items dynamically using tailoring-focused icons (Fabric, Craft, Fit Notes)
  const specItems = [
    { key: "fabric", label: "Fabric", value: (product as any).material, icon: Scissors },
    { key: "origin", label: "Craft", value: (product as any).origin, icon: Compass },
  ].filter(item => !!item.value);

  return (
    <div className="w-full flex flex-col gap-5 text-left">
      
      {/* ── SECTION 1: HERO (wrapped in pdp-hero-section for IntersectionObserver) ── */}
      <div id="pdp-hero-section" className="space-y-1 select-none">
        {/* Occasion / Category label */}
        {product.occasionTags && product.occasionTags.length > 0 && product.occasionTags[0] && (
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 leading-none">
            {formatTag(product.occasionTags[0])}
          </div>
        )}
        
        {/* Product Title */}
        <h1 className="text-lg md:text-xl font-serif font-semibold text-stone-900 tracking-tight leading-none pt-0.5">
          {cleanProductTitle(product.name)}
        </h1>

        {/* Pricing */}
        <div className="flex items-baseline gap-2.5 pt-0.5 leading-none">
          <span className="text-base md:text-lg font-bold text-stone-900">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.compareAtPrice && (
            <>
              <span className="text-xs text-stone-400 line-through font-normal">
                ₹{product.compareAtPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-[9px] font-bold text-amber-800 tracking-wider">
                ({discountPercent}% OFF)
              </span>
            </>
          )}
        </div>

        {/* Brand attribution */}
        <div className="text-xs text-stone-600 font-medium leading-none pt-0.5">
          from <span className="font-bold">{product.boutique.name}</span>
        </div>

        {/* Fulfillment line */}
        <div className="text-xs text-stone-500 font-medium pt-0.5 leading-none">
          Fulfilled by a Verified Hive Partner
        </div>
      </div>

      {/* ── Structured Product Specs Grid (Fabric, Origin, Care, Fit) ── */}
      {specItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-1 select-none">
          {specItems.map((item, idx) => {
            const isLastOdd = specItems.length % 2 !== 0 && idx === specItems.length - 1;
            const Icon = item.icon;
            return (
              <div 
                key={item.key} 
                className={cn(
                  "border border-[#EAE1D4] rounded-xl p-3.5 bg-[#FAF8F5]/50 flex items-start gap-2.5",
                  isLastOdd && "col-span-2"
                )}
              >
                <Icon className="w-4 h-4 text-amber-700 stroke-[1.5] mt-0.5 shrink-0" />
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[9px] font-bold tracking-wider text-stone-400 uppercase leading-none mb-1.5">{item.label}</span>
                  <span className="text-xs font-semibold text-stone-850 leading-normal">
                    {item.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SECTION 2: SIZE SELECTION ── */}
      <div className="border-t border-stone-100 pt-2">
        <SizeSelector
          sizes={product.sizes}
          inventory={stockMap}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
          hasMeasurements={false}
          onOpenSizeGuide={() => {}}
          fitNote={product.fitNote}
        />
      </div>

      {/* ── SECTION 2.5: FIT BADGE & SILHOUETTE INDICATOR ── */}
      {(fitRecommendation || silhouette) && (
        <div className="flex flex-col gap-2 select-none">
          {fitRecommendation && (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-stone-200/80 bg-stone-50/60 text-stone-700">
              <Ruler className="w-4 h-4 text-stone-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none mb-1 text-stone-800">{fitBadgeConfig[fitRecommendation].label}</span>
                <span className="text-[11px] font-medium leading-tight text-stone-500">{fitBadgeConfig[fitRecommendation].advice}</span>
              </div>
            </div>
          )}
          {silhouette && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-stone-200/60 bg-stone-50/40 text-stone-600">
              <Shirt className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <span className="text-[11px] font-medium leading-tight">{silhouetteConfig[silhouette]}</span>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 4: PURCHASE ACTIONS ── */}
      <div className="border-t border-stone-100 pt-2">
        <PurchaseActions
          product={product}
          selectedSize={selectedSize}
          onOpenSizeGuide={() => {}}
        />
      </div>

      {/* ── SECTION 5: TRUST REASSURANCE ── */}
      <div className="border-t border-stone-100 pt-4 mt-3 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10px] font-bold tracking-wider text-stone-500 uppercase select-none">
        <span>Easy exchanges</span>
        <span className="text-stone-300">•</span>
        <span>{product.sameDayEligible ? "Same-Day Delivery" : "Express Delivery"}</span>
        <span className="text-stone-300">•</span>
        <span>Secure checkout</span>
      </div>

      {/* ── SECTION 6: PRODUCT STORY ── */}
      {hasDescription && (
        <div className="border-t border-stone-100 pt-4 mt-3 space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-1">
            Why you'll love it
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed font-medium">
            {(product as any).story ?? product.description}
          </p>
        </div>
      )}

      {/* ── SECTION 6.5: ACCORDIONS (Product Details, Wash & Care, Delivery & Returns) ── */}
      <div className="border-t border-stone-100 pt-2.5 mt-2 space-y-1">
        {/* Product Details (Specifications) Area */}
        {hasDetails && (
          <div className="border-b border-stone-100/60 pb-3">
            <div className="w-full flex items-center justify-between py-2 text-left text-[10px] font-bold uppercase tracking-wider text-stone-900">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-700/80" />
                <span>Product Details</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 pt-1.5 pb-1 text-left">
              {renderedSpecs.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <span className="text-[9px] font-extrabold text-[#78716C] uppercase tracking-wider block">
                    {item.label}
                  </span>
                  <span className="text-xs font-semibold text-[#1C1917] block leading-tight">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wash & Care Accordion */}
        {(product as any).care && (
          <div className="border-b border-stone-100/60 pb-2.5">
            <button
              type="button"
              onClick={() => setOpenAccordion(openAccordion === "care" ? null : "care")}
              className="w-full flex items-center justify-between py-2 text-left text-[10px] font-bold uppercase tracking-wider text-stone-900 focus:outline-none"
            >
              <span>Wash & Care</span>
              <span className="text-stone-400 text-xs font-normal">
                {openAccordion === "care" ? "−" : "+"}
              </span>
            </button>
            {openAccordion === "care" && (
              <p className="text-xs text-stone-600 leading-relaxed font-medium pt-1 animate-fade-in text-left">
                {(product as any).care}
              </p>
            )}
          </div>
        )}

        {/* Delivery & Returns Accordion */}
        <div className="border-b border-stone-100/10 pb-1">
          <button
            type="button"
            onClick={() => setOpenAccordion(openAccordion === "returns" ? null : "returns")}
            className="w-full flex items-center justify-between py-2 text-left text-[10px] font-bold uppercase tracking-wider text-stone-900 focus:outline-none"
          >
            <span>Delivery & Returns</span>
            <span className="text-stone-400 text-xs font-normal">
              {openAccordion === "returns" ? "−" : "+"}
            </span>
          </button>
          {openAccordion === "returns" && (
            <div className="text-xs text-stone-600 leading-relaxed font-medium pt-1 space-y-2 text-left animate-fade-in">
              <p>
                • <strong>1-Day Return Window</strong>: Return requests must be initiated within 24 hours of delivery.
              </p>
              <p>
                • <strong>No Change-of-Mind</strong>: Returns are eligible for physically damaged, defective, or wrong items only.
              </p>
              <p>
                • <strong>Refund Timeline</strong>: Once approved, refunds are credited back to your original payment method within 5–7 business days.
              </p>
              <p>
                Read our full{" "}
                <a href="/return-policy" className="underline font-bold text-stone-850 hover:text-stone-950">
                  Return and Refund Policy
                </a>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 7: MERCHANT ── */}
      <div className="border-t border-stone-200/80 pt-5 mt-4 select-none text-left">
        <div className="space-y-3">
          <div>
            <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-[0.12em] block">
              Hive Partner {product.boutique.city ? `• ${product.boutique.city.toUpperCase()}` : ""}
            </span>
            <Link 
              href={`/shop/${product.boutique.slug}`} 
              className="text-sm font-extrabold text-stone-900 hover:text-hive-amber transition-colors leading-tight inline-block mt-0.5"
            >
              {product.boutique.name}
            </Link>
          </div>

          {product.boutique.description && (
            <div className="bg-[#FAF6F0]/70 border-l-2 border-hive-gold p-3.5 pl-4 rounded-r-xl text-left">
              <p className="font-serif text-xs text-stone-850 leading-relaxed italic whitespace-pre-line">
                {product.boutique.description}
              </p>
              {product.boutique.ownerName && (
                <p className="font-serif text-[10px] text-hive-amber/80 font-bold tracking-wide mt-2 text-right">
                  — {product.boutique.ownerName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const ProductInfoSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse text-left p-2">
      <div className="space-y-2">
        <div className="h-4 w-1/4 bg-stone-200 rounded" />
        <div className="h-6 w-full bg-stone-200 rounded" />
        <div className="h-6 w-1/2 bg-stone-200 rounded" />
      </div>
      <div className="h-4 w-1/3 bg-stone-150 rounded" />
      <div className="h-10 w-full bg-stone-100 rounded-xl" />
      <div className="h-24 w-full bg-stone-100 rounded-2xl" />
      <div className="h-20 w-full bg-stone-50 rounded-2xl" />
    </div>
  );
};
