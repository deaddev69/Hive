"use client";

import React from "react";
import Image from "next/image";
import { Trash2, Plus, Minus } from "lucide-react";
import { CartItem, useCartStore } from "@/store/cart-store";

interface CartItemProps {
  item: CartItem;
}

export const CartItemComponent: React.FC<CartItemProps> = ({ item }) => {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="flex gap-4 bg-white p-4.5 rounded-2xl border border-hive-border/40 shadow-sm relative group overflow-hidden">
      {/* Product Image */}
      <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-hive-cream/30 border border-hive-border/20 flex-shrink-0">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-hive-comb/20 flex items-center justify-center text-xs font-bold text-hive-text-muted">
            No Image
          </div>
        )}
      </div>

      {/* Info details */}
      <div className="flex-1 flex flex-col justify-between text-left pr-4">
        <div>
          {/* Boutique Name */}
          <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
            {item.boutiqueName}
          </span>
          {/* Product Name */}
          <h3 className="text-xs font-bold text-hive-dark mt-0.5 leading-snug line-clamp-2 pr-2">
            {item.name}
          </h3>
          {/* Selected Size Badge */}
          <span className="inline-flex items-center text-[10px] font-extrabold text-hive-dark bg-hive-comb px-2 py-0.5 rounded-lg mt-1.5 border border-hive-gold/20">
            Size: {item.size}
          </span>
        </div>

        {/* Bottom details: Price & Quantity */}
        <div className="flex items-center justify-between mt-3">
          {/* Price */}
          <span className="text-sm font-extrabold text-hive-dark">
            ₹{item.price.toLocaleString("en-IN")}
          </span>

          {/* Quantity selector */}
          <div className="flex items-center gap-2 border border-hive-border/60 bg-hive-cream/30 rounded-xl px-2 py-1 select-none">
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-hive-dark hover:bg-hive-border/45 transition-colors focus:outline-none"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-extrabold text-hive-dark min-w-[16px] text-center">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-hive-dark hover:bg-hive-border/45 transition-colors focus:outline-none"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => removeItem(item.productId, item.size)}
        className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-hive-text-muted/60 hover:text-red-500 hover:bg-red-50 transition-all focus:outline-none"
        aria-label="Remove item"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
