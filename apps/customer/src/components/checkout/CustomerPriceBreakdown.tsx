"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export interface CustomerPriceBreakdownProps {
  subtotal: number;          // Product total in Rupees
  handlingCharge?: number;   // in Rupees (from server pricing snapshot)
  platformFee?: number;      // in Rupees (from server pricing snapshot)
  gstOnCharges?: number;     // GST on handling + platform fee, in Rupees
  deliveryFee: number;       // in Rupees
  discount?: number;         // in Rupees
  total: number;             // in Rupees (authoritative server total)
  isEstimatedDelivery?: boolean;
  showHelpSection?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const CustomerPriceBreakdown: React.FC<CustomerPriceBreakdownProps> = ({
  subtotal,
  handlingCharge = 0,
  platformFee = 0,
  gstOnCharges = 0,
  deliveryFee,
  discount = 0,
  total,
  isEstimatedDelivery = false,
  showHelpSection = true,
  isLoading = false,
  isError = false,
  className = "",
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const deliveryLabel = isEstimatedDelivery ? "Estimated Delivery Fee" : "Delivery Partner Fee";

  if (isError) {
    return (
      <div className={`bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold space-y-1.5 flex flex-col items-center justify-center text-center ${className}`}>
        <AlertCircle className="w-5 h-5 text-rose-600" />
        <p className="font-bold text-sm">Unable to load checkout pricing.</p>
        <p className="text-rose-600">Please refresh and try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse ${className}`}>
        <div className="h-4 w-28 bg-stone-200 rounded" />
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center"><div className="h-3 w-20 bg-stone-100 rounded" /><div className="h-3 w-16 bg-stone-100 rounded" /></div>
          <div className="flex justify-between items-center"><div className="h-3 w-28 bg-stone-100 rounded" /><div className="h-3 w-12 bg-stone-100 rounded" /></div>
          <div className="flex justify-between items-center"><div className="h-3 w-24 bg-stone-100 rounded" /><div className="h-3 w-12 bg-stone-100 rounded" /></div>
          <div className="flex justify-between items-center pt-3 border-t border-stone-100"><div className="h-4 w-24 bg-stone-200 rounded" /><div className="h-4 w-20 bg-stone-200 rounded" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Price Details Card */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-2xs space-y-3.5 text-left">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest border-b border-stone-100 pb-2.5">
          PRICE DETAILS
        </h3>

        <div className="space-y-2.5 text-xs font-medium text-stone-600">
          {/* 1. Product Total (All-Inclusive) */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-stone-700">Product Total</span>
              <span className="text-[10px] text-stone-400 font-normal">Incl. all taxes & charges</span>
            </div>
            <span className="font-mono text-stone-900 text-sm font-bold">{formatCurrency(subtotal)}</span>
          </div>

          {/* 2. Delivery Fee */}
          <div className="flex justify-between items-center">
            <span className="text-stone-700">{deliveryLabel}</span>
            <span className="font-mono text-stone-900 font-medium">
              {deliveryFee === 0 ? (
                <span className="text-emerald-700 font-bold uppercase text-[10px] tracking-wider">
                  FREE
                </span>
              ) : (
                formatCurrency(deliveryFee)
              )}
            </span>
          </div>

          {/* 3. Discount */}
          {discount > 0 && (
            <div className="flex justify-between items-center text-emerald-700 font-bold">
              <span>Discount</span>
              <span className="font-mono">-{formatCurrency(discount)}</span>
            </div>
          )}

          {/* 4. Grand Total */}
          <div className="flex justify-between items-center border-t border-stone-200 pt-3 mt-2">
            <span className="text-sm font-bold text-stone-900">Grand Total</span>
            <span className="text-base font-bold text-stone-900 font-mono">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Help Section */}
      {showHelpSection && (
        <div className="bg-stone-50/80 border border-stone-200/70 rounded-xl p-3.5 text-left text-xs space-y-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="w-full flex items-center justify-between font-bold text-stone-900 text-xs focus:outline-none cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Why am I paying this?</span>
            </span>
            {isHelpOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            )}
          </button>

          {isHelpOpen && (
            <div className="pt-2.5 border-t border-stone-200/50 space-y-2.5 text-[11px] text-stone-600 animate-[fadeIn_0.2s_ease-out]">
              <p className="font-bold text-stone-900 text-xs">
                Transparent All-Inclusive Pricing:
              </p>
              <div className="bg-white rounded-xl p-3 space-y-2 border border-stone-200/70 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-700">Product Price (All-Inclusive)</span>
                  <span className="font-mono font-bold text-stone-900">{formatCurrency(subtotal)}</span>
                </div>
                <p className="text-[10px] text-stone-400 pl-1 leading-normal font-sans">
                  ↳ All taxes, platform charges, and packaging are already included directly in the product price from the start. No surprise checkout fees!
                </p>
                <div className="flex justify-between items-center border-t border-stone-100 pt-1.5">
                  <span className="font-semibold text-stone-700">Delivery Partner Fee</span>
                  <span className="font-mono font-bold text-stone-900">{formatCurrency(deliveryFee)}</span>
                </div>
                <p className="text-[10px] text-stone-400 pl-1 leading-normal font-sans">
                  ↳ 100% passed to the hyper-local delivery partner for immediate doorstep fulfillment.
                </p>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-bold border-t border-stone-100 pt-1.5">
                    <span>Coupon Discount</span>
                    <span className="font-mono">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-stone-200 pt-2 font-bold text-stone-900 text-xs">
                  <span>Grand Total</span>
                  <span className="font-mono text-sm">{formatCurrency(total)}</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed font-sans">
                Zero hidden charges. What you see is exactly what you pay.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
