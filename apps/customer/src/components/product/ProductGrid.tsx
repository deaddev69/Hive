import React, { useMemo } from "react";
import { ProductCardData } from "@/lib/mockProducts";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./ProductGridSkeleton";
import { Button } from "@hive/ui";
import { AlertCircle, ArrowRight } from "lucide-react";

export interface ProductGridProps {
  products: ProductCardData[];
  selectedOccasion: string;
  onResetFilter?: () => void;
  isLoading?: boolean;
}

const occasionLabels: Record<string, string> = {
  all: "All Collections",
  wedding: "Wedding Guest Collection",
  festival: "Festival Collection",
  workwear: "Work Wear Collection",
  party: "Party Night Collection",
  casual: "Casual Day Collection",
  date: "Date Night Collection",
  ethnic: "Ethnic Collection",
  coords: "Co-ords Collection",
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  selectedOccasion,
  onResetFilter,
  isLoading = false,
}) => {
  // Memoized product filtering
  const filteredProducts = useMemo(() => {
    if (selectedOccasion === "all") {
      return products;
    }
    return products.filter((p) => p.occasion === selectedOccasion);
  }, [products, selectedOccasion]);

  const collectionTitle = occasionLabels[selectedOccasion] || "Boutique Collection";

  if (isLoading) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="flex justify-between items-baseline border-b border-hive-border/40 pb-4">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-full" />
          <div className="h-4 w-24 bg-slate-150 animate-pulse rounded-full" />
        </div>
        <ProductGridSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-8 flex flex-col gap-6">
      
      {/* Dynamic Keyframe Animation Style Tag */}
      <style>{`
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-entrance {
          animation: cardEntrance 0.5s cubic-bezier(0.215, 0.610, 0.355, 1) forwards;
          opacity: 0; /* Pre-animation hidden state */
        }
      `}</style>

      {/* Grid Header */}
      <div className="flex justify-between items-baseline border-b border-hive-border/40 pb-4">
        <h2 className="text-xl md:text-2xl font-extrabold font-serif text-hive-dark transition-all duration-300">
          {collectionTitle}
        </h2>
        <span className="text-xs md:text-sm font-semibold text-hive-text-muted">
          Showing {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"}
        </span>
      </div>

      {/* Product Grid / Empty State Handler */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {filteredProducts.map((product, index) => (
            <div
              key={`${selectedOccasion}-${product.id}`}
              className="animate-card-entrance"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        /* Elegant Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-6 border border-dashed border-hive-border/60 rounded-[32px] bg-hive-cream/5 text-center max-w-2xl mx-auto w-full animate-card-entrance">
          <div className="p-4 rounded-full bg-hive-comb/20 border border-hive-border/40 text-hive-amber mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold font-serif text-hive-dark">
            No products found
          </h3>
          <p className="text-sm text-hive-text-muted mt-2 max-w-sm leading-relaxed">
            We're onboarding more boutiques for this occasion. Check back soon for hand-curated designs from local boutiques.
          </p>
          {onResetFilter && (
            <Button
              variant="primary"
              onClick={onResetFilter}
              className="mt-6 flex items-center gap-1.5"
            >
              View All Collections
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
