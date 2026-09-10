"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist-store";

interface EmptyCartStateProps {
  onClose?: () => void;
}

export const EMPTY_BAG_MESSAGES = [
  {
    headline: "A full wardrobe, but nothing to wear?",
    subtext: "We know the feeling. You can't repeat that same outfit anyway. Find something fresh in around 90 minutes.",
  },
  {
    headline: "Your bag is empty. Your plans are not.",
    subtext: "Don't wait until the last minute to panic about what to wear. Get an outfit delivered in 90 minutes.",
  },
  {
    headline: "Can’t wear the same outfit again, right?",
    subtext: "Everyone has seen that one in photos already. Treat yourself to something new from local boutiques.",
  },
  {
    headline: "Having a wardrobe crisis?",
    subtext: "Don't stress. Pick an outfit you actually love, and have it at your door in around 90 minutes.",
  },
];

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({ onClose }) => {
  const router = useRouter();
  const { items: wishlistItems } = useWishlistStore();
  const [copyIndex, setCopyIndex] = useState(0);

  useEffect(() => {
    // Pick a random witty message on mount
    setCopyIndex(Math.floor(Math.random() * EMPTY_BAG_MESSAGES.length));
  }, []);

  const activeCopy = EMPTY_BAG_MESSAGES[copyIndex] ?? EMPTY_BAG_MESSAGES[0] ?? {
    headline: "A full wardrobe, but nothing to wear?",
    subtext: "We know the feeling. You can't repeat that same outfit anyway. Find something fresh in around 90 minutes.",
  };

  const handleExplore = () => {
    onClose?.();
    router.push("/products");
  };

  const handleWishlist = () => {
    onClose?.();
    router.push("/wishlist");
  };

  return (
    <div className="flex flex-col items-center justify-center my-auto py-8 px-4 text-center select-none animate-[fadeIn_0.25s_ease-out]">
      {/* Ambient Halo & Bag Visual */}
      <div className="relative w-44 sm:w-48 aspect-square flex items-center justify-center mb-3">
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
      <div className="space-y-1.5 min-h-[72px] flex flex-col items-center justify-center">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
          {activeCopy.headline}
        </h3>
        <p className="text-xs text-stone-500 max-w-[280px] leading-relaxed font-normal">
          {activeCopy.subtext}
        </p>
      </div>

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
    </div>
  );
};

