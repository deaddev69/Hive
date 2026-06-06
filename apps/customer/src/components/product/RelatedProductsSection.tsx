"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { mockProducts } from "@/lib/mockProducts";
import { ProductDetail } from "@/lib/mockProductDetails";
import { getRelatedProducts } from "@/data/related-products";

interface RelatedProductsSectionProps {
  product: ProductDetail;
}

export const RelatedProductsSection: React.FC<RelatedProductsSectionProps> = ({ product }) => {
  // Retrieve scored recommendations from our heuristic logic
  const recommendations = getRelatedProducts(product, mockProducts);

  return (
    <section 
      aria-labelledby="related-products-title" 
      className="w-full border-t border-hive-border/40 pt-12 mt-12 text-left"
    >
      {recommendations.length > 0 ? (
        <>
          {/* Header */}
          <div className="flex flex-col gap-1 mb-8">
            <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-[0.25em] select-none">
              HANDPICKED FOR YOU
            </span>
            <h2 
              id="related-products-title" 
              className="text-xl md:text-2xl font-serif font-extrabold text-hive-dark"
            >
              You May Also Like
            </h2>
            <p className="text-xs text-hive-text-muted font-medium">
              Handpicked boutique styles similar to this product
            </p>
          </div>

          {/* Grid: 4 columns desktop, 2 columns tablet, 1 column mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((item) => (
              <div 
                key={item.id} 
                className="relative z-0 group outline-none focus-within:ring-2 focus-within:ring-hive-amber focus-within:ring-offset-2 rounded-[24px]"
              >
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty State Layout */
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-hive-border/60 bg-[#FAF8F5]/30 rounded-3xl max-w-xl mx-auto my-6 gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-hive-gold/10 border border-hive-gold/25 flex items-center justify-center text-hive-amber">
            <ShoppingBag className="w-5.5 h-5.5" />
          </div>
          
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-hive-dark font-serif">
              No similar products found
            </h3>
            <p className="text-xs text-hive-text-muted leading-relaxed font-medium">
              Explore our boutique collection instead.
            </p>
          </div>

          <Link
            href="/products"
            className="h-11 px-6 rounded-xl bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all text-xs font-extrabold flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-hive-amber shadow-sm"
          >
            <span>Browse All Products</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </Link>
        </div>
      )}
    </section>
  );
};
