import React from "react";
import { ProductCard } from "./ProductCard";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ProductCardData } from "@/lib/mockProducts";
import { useLocation } from "@/context/LocationContext";

// Helper to deduce occasion from product tags/description
function getProductOccasion(product: any): string {
  const catName = (product.categoryName || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  
  if (name.includes("wedding") || desc.includes("wedding") || name.includes("lehenga") || catName.includes("lehengas")) {
    return "wedding";
  }
  if (name.includes("festival") || desc.includes("festival") || name.includes("saree") || catName.includes("sarees")) {
    return "festival";
  }
  if (name.includes("co-ord") || name.includes("coord") || catName.includes("coords") || catName.includes("co-ord")) {
    return "coords";
  }
  if (name.includes("kurta") || name.includes("kurti") || catName.includes("kurtis")) {
    return "ethnic";
  }
  if (name.includes("party") || desc.includes("party")) {
    return "party";
  }
  if (name.includes("date") || desc.includes("date") || name.includes("dress") || catName.includes("dresses")) {
    return "date";
  }
  if (name.includes("work") || name.includes("office")) {
    return "workwear";
  }
  return "casual";
}

// Helper to map DB product to ProductCardData interface
function mapDbProduct(p: any): ProductCardData & { sizes: string[]; stockBySize: Record<string, number> } {
  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || "",
    price,
    compareAtPrice,
    rating: 4.8, // Fallback rating
    reviewCount: 12, // Fallback review count
    occasion: getProductOccasion(p),
    isVerifiedBoutique: p.boutique?.verified || false,
    isNewArrival: Date.now() - p.createdAt < 7 * 24 * 60 * 60 * 1000,
    isTrending: p.featured,
    isBestSeller: p.featured,
    sameDayDelivery: p.sameDayEligible,
    videoAvailable: p.images?.length > 1,
    favorite: false,
    sizes: p.sizes || ["Free"],
    stockBySize: p.stockBySize || { Free: 5 },
  };
}

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
  const { latitude, longitude } = useLocation();
  const dbProducts = useQuery(
    api.products.getActiveProducts,
    latitude !== null && longitude !== null ? { userLat: latitude, userLng: longitude } : {}
  );

  const products = React.useMemo(() => {
    return (dbProducts || []).map(mapDbProduct);
  }, [dbProducts]);

  // Filter relevant recommendations: same occasion or same boutique, excluding the active product
  const recommendedList = React.useMemo(() => {
    if (!products.length) return [];
    const filtered = products
      .filter(
        (p) =>
          p.id !== currentProductId &&
          (p.occasion === occasion || p.boutiqueName === boutiqueName)
      )
      .slice(0, 4);

    // If we have fewer than 4 items, backfill with best sellers/new arrivals
    if (filtered.length < 4) {
      const backfill = products
        .filter(
          (p) =>
            p.id !== currentProductId &&
            !filtered.some((r) => r.id === p.id)
        )
        .slice(0, 4 - filtered.length);
      filtered.push(...backfill);
    }
    return filtered;
  }, [products, currentProductId, occasion, boutiqueName]);

  if (dbProducts === undefined) {
    return null;
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {recommendedList.map((product) => (
          <div key={product.id} className="relative z-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};
