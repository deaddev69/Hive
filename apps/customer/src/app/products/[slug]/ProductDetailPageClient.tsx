"use client";
import React, { useState, useEffect } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { MobileProductDetails } from "@/components/product/MobileProductDetails";
import Link from "next/link";
import { ProductDetail } from "@/lib/mockProductDetails";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";
import { cleanProductTitle } from "@/components/product/ProductCard";

interface ProductDetailPageClientProps {
  product: ProductDetail;
}

export function ProductDetailPageClient({ product }: ProductDetailPageClientProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showStickyBar, setShowStickyBar] = useState(false);

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
    return (
      <CatalogLayout
        breadcrumbs={[
          { label: "Products", href: "/products" },
          { label: cleanProductTitle(product.name) },
        ]}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full py-12 space-y-12 select-none">
          <div className="bg-white border border-hive-border/40 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <span className="text-2xl font-bold">!</span>
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl md:text-3xl font-black text-hive-dark">
                Product No Longer Available
              </h1>
              <p className="text-sm text-hive-text-muted leading-relaxed font-medium">
                The product "{product.name}" is temporarily unavailable because the boutique is not currently active or the item is inactive.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex px-6 h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest items-center justify-center shadow-sm"
              >
                Continue Shopping
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
        
        {/* Mobile View Layout (block lg:hidden) - Tightly stacked view with no extra space-y gaps */}
        <div className="block lg:hidden flex flex-col gap-6 pb-28">
          {/* 1. Product Image Gallery */}
          <ProductGallery
            images={product.images}
            videoUrl={product.videoUrl}
            productName={product.name}
            product={product}
          />

          {/* 2 to 11. Product details & Sizing & Checkout actions stacked compactly */}
          <MobileProductDetails 
            product={product} 
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
          />



          {/* You Might Also Like Section */}
          <RelatedProductsSection product={product} />
        </div>

        {/* Desktop View Layout (hidden lg:grid) */}
        <div className="hidden lg:grid grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column */}
          <div className="lg:col-span-7 xl:col-span-8 w-full space-y-12">
            <ProductGallery
              images={product.images}
              videoUrl={product.videoUrl}
              productName={product.name}
              product={product}
            />
          </div>

          {/* Right Column: Info & Checkout CTAs (Spans 5 columns, sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 w-full lg:sticky lg:top-[100px] bg-white rounded-3xl p-6 border border-hive-border/40 shadow-sm">
            <ProductInfo 
              product={product} 
              selectedSize={selectedSize}
              setSelectedSize={setSelectedSize}
            />
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
