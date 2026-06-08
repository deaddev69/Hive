"use client";

import React from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { RelatedProductsSection } from "@/components/product/RelatedProductsSection";
import { MobileProductDetails } from "@/components/product/MobileProductDetails";
import { ProductDetail } from "@/lib/mockProductDetails";

interface ProductDetailPageClientProps {
  product: ProductDetail;
}

export function ProductDetailPageClient({ product }: ProductDetailPageClientProps) {
  // Shared reviews section markup
  const renderReviews = () => {
    if (!product.featuredReviews || product.featuredReviews.length === 0) return null;

    return (
      <div className="border-t border-hive-border/40 pt-10 text-left">
        <div className="flex flex-col gap-1 mb-6">
          <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-[0.25em]">
            FEEDBACK
          </span>
          <h2 className="text-xl md:text-2xl font-serif font-extrabold text-hive-dark">
            Customer Reviews
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {product.featuredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-hive-cream/15 border border-hive-border/40 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-hive-dark">{rev.userName}</span>
                  <div className="flex items-center text-hive-amber text-[10px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < rev.rating ? "text-hive-amber" : "text-hive-border"}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-hive-text-muted leading-relaxed font-medium">
                  "{rev.comment}"
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] text-hive-text-muted/70 font-semibold border-t border-hive-border/30 pt-3">
                <span>Size Purchased: {rev.sizePurchased}</span>
                <span>Reviewed: {rev.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Products", href: "/products" },
        { label: product.name },
      ]}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full py-8">
        
        {/* Mobile View Layout (block lg:hidden) */}
        <div className="block lg:hidden space-y-12">
          {/* 1. Product Image Gallery */}
          <ProductGallery
            images={product.images}
            videoUrl={product.videoUrl}
            productName={product.name}
          />

          {/* 2 to 11. Product details & Sizing & Checkout actions */}
          <MobileProductDetails product={product} />

          {/* 12. Additional Product Content (Reviews) */}
          {renderReviews()}

          {/* 13. You May Also Like Section (placed at the bottom) */}
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
            />

            {renderReviews()}

            <RelatedProductsSection product={product} />
          </div>

          {/* Right Column: Info & Checkout CTAs (Spans 5 columns, sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 w-full lg:sticky lg:top-[100px] bg-white rounded-3xl p-6 border border-hive-border/40 shadow-sm">
            <ProductInfo product={product} />
          </div>
        </div>

      </div>
    </CatalogLayout>
  );
}
