import React from "react";
import { ProductCard } from "./ProductCard";
import { mockProducts } from "@/lib/mockProducts";

export const ProductCardDemo: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col text-left items-start gap-1">
        <span className="text-[10px] font-bold text-hive-amber tracking-widest uppercase">
          HIVE EXCLUSIVES
        </span>
        <h2 className="text-xl md:text-2xl font-extrabold font-serif text-hive-dark">
          Trending Boutique Wear
        </h2>
      </div>

      {/* Product Grid: 1 col on mobile, 2 col on tablet, 4 col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {mockProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
