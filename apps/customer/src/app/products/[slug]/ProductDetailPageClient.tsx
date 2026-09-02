"use client";
import React, { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { MobileProductDetails } from "@/components/product/MobileProductDetails";
import Link from "next/link";
import { ProductDetail } from "@/lib/mockProductDetails";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";
import { cleanProductTitle } from "@/components/product/ProductCard";
import { useSessionStore } from "@/context/SessionContext";

import { mapDbProduct } from "@/lib/mapDbProduct";

interface ProductDetailPageClientProps {
  product: ProductDetail;
}

export function ProductDetailPageClient({ product: rawProduct }: ProductDetailPageClientProps) {
  const product = React.useMemo(() => {
    const mapped = mapDbProduct(rawProduct);
    return {
      ...rawProduct,
      price: mapped.price,
      compareAtPrice: mapped.compareAtPrice,
    };
  }, [rawProduct]);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Record this view so the "Recently Viewed" homepage block has something to show.
  const { isAuthenticated } = useSessionStore();
  const trackProductView = useMutation(api.homepage.trackProductView);
  useEffect(() => {
    if (!isAuthenticated || !rawProduct?.id || (rawProduct as any).isUnavailable) return;
    trackProductView({ productId: rawProduct.id as any }).catch(() => {
      // Non-critical — a failed view-tracking call shouldn't disrupt the shopper.
    });
  }, [isAuthenticated, rawProduct?.id, trackProductView]);

  // Set up IntersectionObserver on the hero section block for the sticky bar
  useEffect(() => {
    // Small delay to ensure the DOM is fully rendered
    const timer = setTimeout(() => {
      const target = document.getElementById("pdp-hero-section");
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            setShowStickyBar(!entry.isIntersecting);
          }
        },
        { threshold: 0, rootMargin: "-80px 0px 0px 0px" } // offset by navbar height
      );

      observer.observe(target);
      return () => {
        observer.disconnect();
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [product]);

  if ((product as any).isUnavailable) {
    const boutiqueAny = product.boutique as any;
    const isPaused = boutiqueAny && (!boutiqueAny.isAcceptingOrders || boutiqueAny.storeStatus === "closed");
    let reopenText = "";
    if (isPaused && boutiqueAny?.closedUntil) {
      const date = new Date(boutiqueAny.closedUntil);
      reopenText = `until ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }

    return (
      <CatalogLayout
        breadcrumbs={[
          { label: "Products", href: "/products" },
          { label: cleanProductTitle(product.name) },
        ]}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full py-12 space-y-12 select-none">
          <div className="bg-white border border-hive-border/40 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
            {isPaused ? (
              <>
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                  <span className="text-2xl font-bold">🔒</span>
                </div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl md:text-3xl font-black text-hive-dark">
                    Boutique on Vacation
                  </h1>
                  <p className="text-sm text-hive-text-muted leading-relaxed font-medium">
                    This boutique is taking a short break {reopenText}.<br/>
                    Save to wishlist and we'll remind you when they're back.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl md:text-3xl font-black text-hive-dark">
                    Product Unavailable
                  </h1>
                  <p className="text-sm text-hive-text-muted leading-relaxed font-medium">
                    The product "{product.name}" is no longer available.
                  </p>
                </div>
              </>
            )}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {isPaused && (
                <button
                  className="w-full sm:w-auto inline-flex px-6 h-12 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest items-center justify-center shadow-sm"
                >
                  Save to Wishlist
                </button>
              )}
              <Link
                href="/products"
                className="w-full sm:w-auto inline-flex px-6 h-12 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-xl text-xs font-bold uppercase tracking-widest items-center justify-center shadow-sm"
              >
                Explore Styles
              </Link>
            </div>
          </div>
        </div>
      </CatalogLayout>
    );
  }

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Products", href: "/products" },
        { label: cleanProductTitle(product.name) },
      ]}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full py-6">
        
        {/*
          One container that reflows, rather than two complete layouts with one
          hidden by CSS.

          Previously this rendered <ProductGallery> twice with byte-identical
          props — once inside a `block lg:hidden` column and once inside a
          `hidden lg:grid`. Both mounted, so every shopper paid for two gallery
          trees: two sets of state, effects, scroll and mouse handlers, two
          copies of every <img> element, and a duplicated `gallery-empty-hc` SVG
          id. Only one was ever visible.

          Below lg this is a flex column (gallery, mobile details, related).
          At lg it becomes the same 12-column grid as before: the gallery takes
          7/8 columns, the sticky info panel takes 5/4, and the two `lg:hidden`
          children drop out of grid flow entirely.

          Child order is deliberate. `pdp-hero-section` is declared by BOTH
          MobileProductDetails and ProductInfo, so the IntersectionObserver
          above resolves it by document order — keeping MobileProductDetails
          first preserves exactly which element it observes today.
        */}
        <div className="flex flex-col gap-6 pb-28 lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start lg:pb-0">
          {/* 1. Product Image Gallery — single instance, both breakpoints */}
          <div className="w-full lg:col-span-7 xl:col-span-8 lg:space-y-12">
            <ProductGallery
              images={product.images}
              videoUrl={product.videoUrl}
              productName={product.name}
              product={product}
            />
          </div>

          {/* 2 to 11. Product details & Sizing & Checkout actions stacked compactly */}
          <div className="lg:hidden">
            <MobileProductDetails
              product={product}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
            />
          </div>

          {/* Right Column: Info & Checkout CTAs (Spans 5 columns, sticky) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 w-full lg:sticky lg:top-[100px] bg-white rounded-3xl p-6 border border-hive-border/40 shadow-sm">
            <ProductInfo
              product={product}
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
            />
          </div>

          {/* You Might Also Like Section */}
          <div className="lg:hidden">
            <RelatedProductsSection product={product} />
          </div>
        </div>



        {/* You Might Also Like Section (desktop) */}
        <div className="hidden lg:block mt-6">
          <RelatedProductsSection product={product} />
        </div>

      </div>

      {/* Scroll-Activated Top Sticky Summary Bar (Desktop Only) */}
      {showStickyBar && (
        <div className="fixed top-0 left-0 right-0 z-[999] bg-white/90 backdrop-blur-md border-b border-stone-200/60 py-3 shadow-sm animate-[slideDown_0.25s_cubic-bezier(0.16,1,0.3,1)_forwards] hidden lg:flex items-center justify-between select-none">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3 text-left">
              <h4 className="text-xs font-serif font-bold text-stone-850 truncate max-w-xs xl:max-w-md">
                {cleanProductTitle(product.name)}
              </h4>
              <span className="text-xs font-bold text-stone-900">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const el = document.getElementById("size-selector-section");
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="px-5 h-10 border border-stone-900 text-stone-900 hover:bg-stone-50 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {selectedSize ? `Size: ${selectedSize}` : "Select Size"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </CatalogLayout>
  );
}
