"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";

interface EmptyCartStateProps {
  onClose: () => void;
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({ onClose }) => {
  const router = useRouter();

  const handleContinueShopping = () => {
    onClose();
    router.push("/products");
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 flex-grow h-full min-h-[350px]">
      {/* Decorative Container */}
      <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 relative mb-6">
        <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hive-amber opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-hive-amber"></span>
        </span>
      </div>

      <h3 className="font-serif text-lg font-bold text-hive-dark">Your cart is empty</h3>
      <p className="text-xs text-hive-text-muted mt-2 max-w-[260px] leading-relaxed">
        Discover unique boutique fashion and try-on alteration services near you.
      </p>

      <button
        type="button"
        onClick={handleContinueShopping}
        className="mt-8 px-6 h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-hive-amber"
      >
        <span>Continue Shopping</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
