"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Heart } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useLocation } from "@/context/LocationContext";
import Image from "next/image";
import { cleanProductTitle } from "../product/ProductCard";
import { QuickViewModal } from "../product/QuickViewModal";
import { calculateDisplayPricing } from "@/lib/pricing";
import { toQueryCoords } from "@/lib/distance";

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
  const { price, compareAtPrice, discountPercent } = calculateDisplayPricing(p);

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
    discountPercent,
    rating: p.rating || p.averageRating || undefined,
    reviewCount: p.reviewCount || undefined,
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
    deliveryLabel: p.deliveryLabel,
  };
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({ onClose }) => {
  const router = useRouter();
  const { latitude, longitude } = useLocation();
  const [activeQuickViewSlug, setActiveQuickViewSlug] = useState<string | null>(null);

  // Dedicated recommendations query for the empty cart drawer
  const dbProducts = useQuery(
    api.products.getCartDrawerRecommendations,
    toQueryCoords(latitude, longitude)
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
    <div className="flex flex-col h-full justify-between select-none bg-white">
      
      {/* Empty State Brand Hero */}
      <div className="flex flex-col items-center justify-center text-center pt-4 pb-2 px-4 flex-1">
        {/* Real Hive Delivery Bag Brand Visual with Clean Amber Halo */}
        <div className="relative w-44 sm:w-48 aspect-square flex items-center justify-center my-2">
          {/* Smooth, subtle circular amber ambient glow */}
          <div className="absolute w-36 h-36 rounded-full bg-[#F5C22B]/15 blur-2xl pointer-events-none" />
          
          <Image
            src="/brand/hive-carry-bag.png"
            alt="Hive Delivery Bag"
            fill
            sizes="192px"
            priority
            className="object-contain relative z-10"
          />
        </div>

        {/* Headline */}
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-2">
          Your Bag is Empty
        </h3>

        {/* Subtitle */}
        <p className="text-xs text-stone-500 mt-1 max-w-[270px] leading-relaxed font-normal">
          Looks like you haven't added any pieces yet. Explore the latest drops from Kochi's top boutiques.
        </p>

        {/* Dual Branded Action Buttons */}
        <div className="flex items-center gap-2.5 mt-5 w-full max-w-[300px]">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/wishlist");
            }}
            className="flex-1 h-11 px-3 bg-white border border-stone-200 hover:border-stone-300 text-stone-800 active:scale-[0.98] transition-all rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 fill-[#F5C22B] stroke-[#F5C22B]" />
            <span>Wishlist</span>
          </button>

          <button
            type="button"
            onClick={handleExplore}
            className="flex-1 h-11 px-3 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Explore Styles</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
          initialProduct={recommendedProducts.find((p: any) => p.slug === activeQuickViewSlug)}
        />
      )}

    </div>
  );
};
