"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import Image from "next/image";
import { cleanProductTitle } from "../product/ProductCard";
import { QuickViewModal } from "../product/QuickViewModal";

interface EmptyCartStateProps {
  onClose: () => void;
}

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

// Helper to map DB product to ProductCardProps shape
function mapDbProduct(p: any): any {
  const hasDiscount = p.discountPrice !== undefined && p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    boutiqueId: p.boutiqueId,
    boutique: p.boutique,
    imageUrl: p.imageUrl || (p.imageUrls?.[0]) || "",
    price,
    compareAtPrice,
    rating: 4.8,
    reviewCount: 12,
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
    estimatedDistanceKm: p.estimatedDistanceKm,
    estimatedDurationMin: p.estimatedDurationMin,
    estimatedEtaMinutes: p.estimatedEtaMinutes,
    hiveScore: p.hiveScore,
  };
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({ onClose }) => {
  const router = useRouter();
  const { latitude, longitude } = useLocation();
  const [activeQuickViewSlug, setActiveQuickViewSlug] = useState<string | null>(null);

  // Dedicated recommendations query for the empty cart drawer
  const dbProducts = useQuery(
    api.products.getCartDrawerRecommendations,
    latitude !== null && longitude !== null ? { userLat: latitude, userLng: longitude } : {}
  );

  const recommendedProducts = React.useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.map(mapDbProduct);
  }, [dbProducts]);

  const handleExplore = () => {
    onClose();
    router.push("/products");
  };

  return (
    <div className="flex flex-col h-full justify-between select-none">
      
      {/* Empty State Content */}
      <div className="flex flex-col items-center justify-center text-center pt-6 pb-2 px-4 flex-1">
        {/* Subtle Editorial Icon */}
        <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-150 flex items-center justify-center relative mb-4">
          <Sparkles className="w-5 h-5 text-amber-700 stroke-[1.5]" />
        </div>

        {/* Editorial Label */}
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 block mb-1">
          HIVE CURATION
        </span>

        {/* Headline */}
        <h3 className="font-serif text-lg font-semibold text-stone-900 leading-snug">
          Curated Local Designer Pieces
        </h3>

        {/* Body */}
        <p className="text-xs text-stone-500 mt-2 max-w-[270px] leading-relaxed font-normal">
          Discover curated apparel and exclusive collections from the finest independent fashion sellers near you.
        </p>

        {/* Branded CTA button */}
        <button
          type="button"
          onClick={handleExplore}
          className="mt-5 px-6 h-11 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
        >
          <span>Discover Designers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Quiet trust row */}
        <div className="text-[10px] text-stone-400 font-semibold tracking-wider mt-5 uppercase">
          Same-Day Delivery • Verified Designers • Curated Fashion
        </div>

        {/* Branded statistics label */}
        <div className="text-[11px] text-stone-500 font-normal mt-2.5">
          50+ designs available for same-day delivery
        </div>
      </div>

      {/* Recommended Compact list */}
      {recommendedProducts.length > 0 && (
        <div className="border-t border-stone-100 pt-5 mt-4 text-left px-1 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-450 block mb-3 px-1">
            CURATED FOR YOU
          </span>
          <div className="flex flex-col gap-2.5">
            {recommendedProducts.map((prod: any) => (
              <div
                key={prod.id}
                onClick={() => setActiveQuickViewSlug(prod.slug)}
                className="flex items-center gap-3 p-2 bg-white border border-stone-100 hover:border-stone-250 rounded-xl transition-all cursor-pointer group shadow-sm/50"
              >
                <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-stone-50 border border-stone-100 flex-shrink-0">
                  <Image
                    src={prod.imageUrl}
                    alt={prod.name}
                    fill
                    sizes="48px"
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-stone-900 truncate leading-snug">
                    {cleanProductTitle(prod.name)}
                  </h4>
                  <p className="text-[10px] text-stone-500 truncate mt-0.5">
                    from {prod.boutiqueName}
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-stone-900">
                      ₹{prod.price.toLocaleString("en-IN")}
                    </span>
                    {prod.compareAtPrice && (
                      <span className="text-[9px] text-stone-400 line-through">
                        ₹{prod.compareAtPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-550 group-hover:bg-stone-950 group-hover:text-white transition-colors text-xs font-semibold mr-1">
                  +
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick View integration when recommended mini card is clicked */}
      {activeQuickViewSlug && (
        <QuickViewModal
          isOpen={!!activeQuickViewSlug}
          onClose={() => setActiveQuickViewSlug(null)}
          productSlug={activeQuickViewSlug}
        />
      )}

    </div>
  );
};
