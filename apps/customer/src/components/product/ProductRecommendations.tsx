import React from "react";
import { mockProducts } from "@/lib/mockProducts";
import { ProductCard } from "./ProductCard";

export interface ProductRecommendationsProps {
  currentProductId: string;
  occasion?: string;
  boutiqueName: string;
}

export const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  currentProductId,
  occasion,
  boutiqueName,
}) => {
  // Filter relevant recommendations: same occasion or same boutique, excluding the active product
  const recommendedList = mockProducts
    .filter(
      (p) =>
        p.id !== currentProductId &&
        (p.occasion === occasion || p.boutiqueName === boutiqueName)
    )
    .slice(0, 4);

  // If we have fewer than 4 items, backfill with best sellers/new arrivals
  if (recommendedList.length < 4) {
    const backfill = mockProducts
      .filter(
        (p) =>
          p.id !== currentProductId &&
          !recommendedList.some((r) => r.id === p.id)
      )
      .slice(0, 4 - recommendedList.length);
    recommendedList.push(...backfill);
  }

  return (
    <div className="w-full border-t border-hive-border/40 pt-12 mt-12 text-left">
      <div className="flex flex-col gap-1 mb-6">
        <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-[0.25em]">
          Handpicked For You
        </span>
        <h2 className="text-xl md:text-2xl font-serif font-extrabold text-hive-dark">
          You May Also Like
        </h2>
      </div>

      {/* Grid listing recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommendedList.map((product) => (
          <div key={product.id} className="relative z-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};
