"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Truck } from "lucide-react";
import { useCheckoutStore } from "@/store/checkout-store";
import { useLocation } from "@/context/LocationContext";

interface CartSummaryProps {
  subtotal: number;
  onClose: () => void;
}

export const CartSummaryComponent: React.FC<CartSummaryProps> = ({ subtotal, onClose }) => {
  const router = useRouter();
  const clearCheckoutItems = useCheckoutStore((state) => state.clearCheckoutItems);
  const { isServiceable } = useLocation();

  const deliveryFee = subtotal >= 5000 ? 0 : 99;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    clearCheckoutItems();
    onClose();
    if (!isServiceable) {
      router.push("/not-serviceable");
      return;
    }

    router.push("/checkout/address");
  };

  return (
    <div className="border-t border-hive-border/60 bg-white p-6 shadow-[0_-8px_24px_rgba(0,0,0,0.02)] sticky bottom-0">
      {/* Free Delivery Goal */}
      {subtotal < 5000 ? (
        <div className="flex items-center gap-2.5 text-[10px] font-bold text-hive-text-muted bg-hive-gold/5 border border-hive-gold/15 p-2.5 rounded-xl mb-4 text-left">
          <Truck className="w-4 h-4 text-hive-amber flex-shrink-0" />
          <span>Add ₹{(5000 - subtotal).toLocaleString("en-IN")} more for Free Delivery today!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-xl mb-4 text-left">
          <Truck className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span>Congratulations! Your order qualifies for Free Delivery today.</span>
        </div>
      )}

      {/* Pricing Table */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
          <span>Delivery Fee</span>
          <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
        </div>
        <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
          <span className="text-sm font-extrabold text-hive-dark">Estimated Total</span>
          <span className="text-base font-extrabold text-hive-dark">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={handleCheckout}
        className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-5 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-hive-amber focus:ring-offset-2"
      >
        <span>Proceed To Checkout</span>
        <ArrowRight className="w-4 h-4 stroke-[2.2]" />
      </button>
    </div>
  );
};
