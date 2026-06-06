"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { CartItemComponent } from "./CartItem";
import { CartSummaryComponent } from "./CartSummary";
import { EmptyCartState } from "./EmptyCartState";

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  const items = useCartStore((state) => state.items);
  const getCartCount = useCartStore((state) => state.getCartCount);
  const getCartTotal = useCartStore((state) => state.getCartTotal);

  // Sync state for opening/closing transitions
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Wait for a tick before applying the active animation state
      const timer = setTimeout(() => setAnimate(true), 15);
      document.body.style.overflow = "hidden";
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      // Wait for exit transition to finish before unmounting (300ms)
      const timer = setTimeout(() => setShouldRender(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const count = getCartCount();
  const subtotal = getCartTotal();

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden select-none">
      {/* Backdrop overlay */}
      <div
        className={`absolute inset-0 bg-hive-dark/40 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer Surface - responsive bottom-sheet on mobile / right-aligned drawer on desktop */}
      <div
        className={`fixed bg-hive-cream shadow-2xl flex flex-col transition-all duration-300 ease-out z-[9999] border-hive-border
          bottom-0 left-0 right-0 h-[85vh] w-full rounded-t-[30px] border-t
          sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:rounded-t-none sm:border-l sm:border-t-0
          ${
            animate
              ? "translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-hive-border/60 bg-white rounded-t-[30px] sm:rounded-t-none">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-bold text-hive-dark">Shopping Bag</h2>
            {count > 0 && (
              <span className="text-[10px] bg-hive-dark text-hive-gold font-extrabold px-2 py-0.5 rounded-full">
                {count} {count === 1 ? "Item" : "Items"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-hive-cream transition-colors text-hive-text-muted hover:text-hive-dark outline-none focus-visible:ring-2 focus-visible:ring-hive-amber"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4.5">
          {items.length === 0 ? (
            <EmptyCartState onClose={onClose} />
          ) : (
            items.map((item) => (
              <CartItemComponent key={`${item.productId}-${item.size}`} item={item} />
            ))
          )}
        </div>

        {/* Summary Footer */}
        {items.length > 0 && (
          <CartSummaryComponent subtotal={subtotal} onClose={onClose} />
        )}
      </div>
    </div>
  );
};
