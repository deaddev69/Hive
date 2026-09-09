"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Heart, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist-store";

interface EmptyCartStateProps {
  onClose: () => void;
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({ onClose }) => {
  const router = useRouter();
  const { items: wishlistItems } = useWishlistStore();

  const handleExplore = () => {
    onClose();
    router.push("/products");
  };

  const handleWishlist = () => {
    onClose();
    router.push("/wishlist");
  };

  return (
    <div className="flex flex-col items-center justify-center my-auto py-8 px-4 text-center select-none animate-[fadeIn_0.25s_ease-out]">
      {/* Ambient Halo & Bag Visual */}
      <div className="relative w-44 sm:w-48 aspect-square flex items-center justify-center mb-2">
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

      {/* Headline & Body Copy */}
      <h3 className="font-serif text-2xl font-bold text-stone-900 tracking-tight mt-1">
        Your Bag is Empty
      </h3>
      <p className="text-xs text-stone-500 mt-1.5 max-w-[270px] leading-relaxed font-normal">
        Looks like you haven&apos;t added anything yet. Explore curated fashion from Kochi&apos;s finest boutiques.
      </p>

      {/* Dual Branded Action Buttons */}
      <div className="flex items-center gap-2.5 mt-6 w-full max-w-[310px]">
        <button
          type="button"
          onClick={handleWishlist}
          className="flex-1 h-11 px-3 bg-white border border-stone-200 hover:border-stone-300 text-stone-800 active:scale-[0.98] transition-all rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Heart className="w-3.5 h-3.5 fill-[#F5C22B] stroke-[#F5C22B]" />
          <span>Wishlist {wishlistItems.length > 0 && `(${wishlistItems.length})`}</span>
        </button>

        <button
          type="button"
          onClick={handleExplore}
          className="flex-1 h-11 px-3 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Explore Styles</span>
          <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
        </button>
      </div>

      {/* Value Pillars / Trust Assurances */}
      <div className="mt-10 pt-6 border-t border-stone-100/90 grid grid-cols-3 gap-2 text-center w-full max-w-[310px]">
        <div className="flex flex-col items-center">
          <Zap className="w-4 h-4 text-amber-500 mb-1" />
          <span className="text-[10px] font-bold text-stone-900 tracking-wider uppercase">90 Mins</span>
          <span className="text-[9px] text-stone-400">Quick Delivery</span>
        </div>
        <div className="flex flex-col items-center border-x border-stone-100">
          <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
          <span className="text-[10px] font-bold text-stone-900 tracking-wider uppercase">100% Local</span>
          <span className="text-[9px] text-stone-400">Kochi Boutiques</span>
        </div>
        <div className="flex flex-col items-center">
          <ShieldCheck className="w-4 h-4 text-amber-500 mb-1" />
          <span className="text-[10px] font-bold text-stone-900 tracking-wider uppercase">Easy</span>
          <span className="text-[9px] text-stone-400">Returns</span>
        </div>
      </div>
    </div>
  );
};

