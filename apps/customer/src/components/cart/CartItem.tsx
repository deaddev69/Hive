"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { CartItem, useCartStore } from "@/store/cart-store";
import { cleanProductTitle } from "../product/ProductCard";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@hive/utils";

interface CartItemProps {
  item: CartItem;
}

export const CartItemComponent: React.FC<CartItemProps> = ({ item }) => {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { setSidebarOpen } = useCart();

  return (
    <div className="flex gap-4 bg-white p-4 rounded-xl border border-stone-100 relative group overflow-hidden">
      {/* Product Image */}
      <Link
        href={`/products/${item.productId}`}
        onClick={() => setSidebarOpen(false)}
        className="relative w-[72px] h-24 rounded-lg overflow-hidden bg-stone-50 border border-stone-100 flex-shrink-0 cursor-pointer block"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="72px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-[10px] font-medium text-stone-400">
            No Image
          </div>
        )}
      </Link>

      {/* Info details */}
      <div className="flex-1 flex flex-col justify-between text-left pr-4 select-none">
        <Link
          href={`/products/${item.productId}`}
          onClick={() => setSidebarOpen(false)}
          className="cursor-pointer block"
        >
          {/* Product Name (Product First) */}
          <h3 className="text-xs font-semibold text-stone-900 leading-snug line-clamp-2 pr-2 hover:text-hive-amber transition-colors">
            {cleanProductTitle(item.name)}
          </h3>

          {/* Boutique Name & Verified badge (Boutique Second) */}
          <div className="text-[10px] text-stone-500 font-normal mt-1.5 flex flex-col gap-0.5">
            <div>
              <span className="text-stone-400">Sold by</span>{" "}
              <span className="font-semibold text-stone-750">{item.boutiqueName}</span>
            </div>
            <span className="text-[9px] text-stone-400 uppercase tracking-wider font-medium">
              Verified Partner
            </span>
          </div>

          {/* Selected Size */}
          <span className="text-[10px] text-stone-500 mt-2 block">
            Size {item.size}
          </span>
        </Link>

        {/* Bottom details: Price & Quantity */}
        <div className="flex items-center justify-between mt-2.5">
          {/* Price */}
          <span className="text-xs font-bold text-stone-900">
            {formatCurrency(item.price)}
          </span>

          {/* Quantity selector (subtle inline controls, no pill background/borders) */}
          <div className="flex items-center gap-4.5 select-none pr-1">
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
              className="text-stone-400 hover:text-stone-800 transition-colors text-sm font-light px-1 focus:outline-none"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="text-xs font-medium text-stone-900 min-w-[10px] text-center">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
              className="text-stone-400 hover:text-stone-800 transition-colors text-sm font-light px-1 focus:outline-none"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => removeItem(item.productId, item.size)}
        className="absolute top-3 right-3 p-1 rounded-full text-stone-300 hover:text-red-500 transition-colors focus:outline-none"
        aria-label="Remove item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
