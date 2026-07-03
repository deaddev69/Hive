"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/store/checkout-store";
import { useCartStore } from "@/store/cart-store";
import { formatCurrency } from "@hive/utils";

interface CartSummaryProps {
  subtotal: number;
  onClose: () => void;
}

export const CartSummaryComponent: React.FC<CartSummaryProps> = ({ subtotal, onClose }) => {
  const router = useRouter();
  const clearCheckoutItems = useCheckoutStore((state) => state.clearCheckoutItems);
  const items = useCartStore((state) => state.items);

  const deliveryFee = subtotal >= 300000 ? 0 : 9900; // in paise
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    clearCheckoutItems();
    onClose();
    router.push("/checkout/address");
  };

  // Dynamically resolve boutique name and ID for hyperlocal delivery status and continue shopping redirection
  const uniqueBoutiques = Array.from(new Set(items.map((item) => item.boutiqueName).filter(Boolean)));
  const deliveryText =
    uniqueBoutiques.length === 1
      ? `Delivered today from ${uniqueBoutiques[0]}`
      : "Same-day delivery available in Kochi";

  const firstItem = items[0];
  const continueShoppingUrl = firstItem?.boutiqueId
    ? `/products?boutiqueId=${firstItem.boutiqueId}`
    : "/products";

  return (
    <div className="border-t border-stone-100 bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sticky bottom-0 z-10 select-none">
      {/* Subtotal */}
      <div className="flex justify-between items-center text-xs text-stone-500 font-normal">
        <span>Subtotal</span>
        <span className="text-stone-900 font-medium">{formatCurrency(subtotal)}</span>
      </div>

      {/* Delivery Fee */}
      <div className="flex justify-between items-center text-xs text-stone-500 font-normal mt-2">
        <span>Delivery Fee</span>
        <span className="text-stone-900 font-medium font-semibold">
          {deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee)}
        </span>
      </div>

      {/* Divider */}
      <hr className="border-stone-100 my-4" />

      {/* Estimated Total */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-stone-900">Estimated Total</span>
        <span className="text-sm font-bold text-stone-900">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Dynamic Delivery Status (one line, no SaaS trust checklist) */}
      <div className="mt-3.5 text-center">
        <span className="text-[11px] text-stone-500 font-normal block leading-normal">
          {deliveryText}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleCheckout}
          className="w-full h-11 bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98] transition-all rounded-full font-medium text-xs tracking-wider flex items-center justify-center gap-1 shadow-sm focus:outline-none"
        >
          Secure Checkout &rarr;
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            router.push(continueShoppingUrl);
          }}
          className="w-full text-center text-xs text-stone-500 hover:text-stone-950 font-normal py-1.5 transition-colors focus:outline-none"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};
