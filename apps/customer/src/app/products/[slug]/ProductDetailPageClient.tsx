"use client";

import React, { useState } from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductMeasurements } from "@/components/product/ProductMeasurements";
import { ProductTrustStrip } from "@/components/product/ProductTrustStrip";
import { ProductRecommendations } from "@/components/product/ProductRecommendations";
import { ProductDetail } from "@/lib/mockProductDetails";

interface ProductDetailPageClientProps {
  product: ProductDetail;
}

export function ProductDetailPageClient({ product }: ProductDetailPageClientProps) {
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(false);

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Products", href: "/products" },
        { label: product.name },
      ]}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full py-8 space-y-12">
        {/* Main section: 2 columns gallery + info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Gallery (Spans 7 columns on large screens) */}
          <div className="lg:col-span-7 xl:col-span-8 w-full">
            <ProductGallery
              images={product.images}
              videoUrl={product.videoUrl}
              productName={product.name}
            />
          </div>

          {/* Right Column: Info & Checkout CTAs (Spans 5 columns, sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 w-full lg:sticky lg:top-[100px] bg-white rounded-3xl p-6 border border-hive-border/40 shadow-sm">
            <ProductInfo
              name={product.name}
              description={product.description}
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              rating={product.rating}
              reviewCount={product.reviewCount}
              boutique={product.boutique}
              sizes={product.sizes}
              inventory={product.inventory}
              fitNote={product.fitNote}
              deliveryInfo={product.deliveryInfo}
              sameDayEligible={product.sameDayEligible}
              onOpenMeasurements={() => setIsMeasurementsOpen(true)}
            />
          </div>
        </div>

        {/* Product Trust Strip section */}
        <ProductTrustStrip />

        {/* Product Reviews section */}
        {product.featuredReviews && product.featuredReviews.length > 0 && (
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
                    {/* Stars + Name */}
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
                    {/* Content */}
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
        )}

        {/* Product Recommendations section */}
        <ProductRecommendations
          currentProductId={product.id}
          occasion={product.occasionTags[0]}
          boutiqueName={product.boutique.name}
        />
      </div>

      {/* Actual Sizing Matrix Collapsible Drawer / Modal */}
      <ProductMeasurements
        isOpen={isMeasurementsOpen}
        onClose={() => setIsMeasurementsOpen(false)}
        measurementMatrix={product.measurementMatrix}
        productName={product.name}
      />
    </CatalogLayout>
  );
}
