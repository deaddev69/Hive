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
  const showPlatformCharges = handlingCharge > 0 || platformFee > 0;

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
      <div className={`bg-white border border-hive-border/50 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse ${className}`}>
        <div className="h-4 w-28 bg-neutral-200 rounded" />
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center"><div className="h-3 w-20 bg-neutral-100 rounded" /><div className="h-3 w-16 bg-neutral-100 rounded" /></div>
          <div className="flex justify-between items-center"><div className="h-3 w-28 bg-neutral-100 rounded" /><div className="h-3 w-12 bg-neutral-100 rounded" /></div>
          <div className="flex justify-between items-center"><div className="h-3 w-16 bg-neutral-100 rounded" /><div className="h-3 w-14 bg-neutral-100 rounded" /></div>
          <div className="flex justify-between items-center"><div className="h-3 w-24 bg-neutral-100 rounded" /><div className="h-3 w-12 bg-neutral-100 rounded" /></div>
          <div className="flex justify-between items-center pt-3 border-t border-neutral-100"><div className="h-4 w-24 bg-neutral-200 rounded" /><div className="h-4 w-20 bg-neutral-200 rounded" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Price Details Card */}
      <div className="bg-white border border-hive-border/50 rounded-2xl p-5 shadow-sm space-y-3.5 text-left">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/30 pb-2.5">
          PRICE DETAILS
        </h3>

        <div className="space-y-2.5 text-xs font-semibold text-hive-text-muted">
          {/* 1. Product Total */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span>Product Total</span>
              <span className="text-[10px] text-neutral-400 font-normal">Incl. all taxes & platform fees</span>
            </div>
            <span className="font-mono text-hive-dark text-sm font-bold">{formatCurrency(subtotal)}</span>
          </div>


          {/* 2. Platform Charges (Handling + Platform Fee) */}
          {showPlatformCharges && (
            <>
              {handlingCharge > 0 && (
                <div className="flex justify-between items-center">
                  <span>Handling Charge</span>
                  <span className="font-mono text-hive-dark">{formatCurrency(handlingCharge)}</span>
                </div>
              )}
              {platformFee > 0 && (
                <div className="flex justify-between items-center">
                  <span>Platform Fee</span>
                  <span className="font-mono text-hive-dark">{formatCurrency(platformFee)}</span>
                </div>
              )}
              {gstOnCharges > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">GST on Fees</span>
                  <span className="font-mono text-hive-dark">{formatCurrency(gstOnCharges)}</span>
                </div>
              )}
            </>
          )}

          {/* 3. Delivery Fee */}
          <div className="flex justify-between items-center">
            <span>{deliveryLabel}</span>
            <span className="font-mono text-hive-dark">
              {deliveryFee === 0 ? (
                <span className="text-emerald-600 font-extrabold uppercase text-[10px] tracking-wider">
                  FREE
                </span>
              ) : (
                formatCurrency(deliveryFee)
              )}
            </span>
          </div>

          {/* 4. Discount */}
          {discount > 0 && (
            <div className="flex justify-between items-center text-emerald-700 font-bold">
              <span>Discount</span>
              <span className="font-mono">-{formatCurrency(discount)}</span>
            </div>
          )}

          {/* 5. Grand Total */}
          <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-2">
            <span className="text-sm font-extrabold text-hive-dark">Grand Total</span>
            <span className="text-base font-extrabold text-hive-dark font-mono">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Help Section */}
      {showHelpSection && (
        <div className="bg-neutral-50/80 border border-neutral-200/60 rounded-xl p-3.5 text-left text-xs space-y-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="w-full flex items-center justify-between font-bold text-hive-dark text-xs focus:outline-none"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-hive-gold shrink-0" />
              <span>Why am I paying this?</span>
            </span>
            {isHelpOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isHelpOpen && (
            <p className="text-[11px] text-neutral-600 font-medium pt-1.5 border-t border-neutral-200/50 leading-relaxed animate-[fadeIn_0.2s_ease-out]">
              Your order total includes the product price, a small handling charge and platform fee (plus GST on these fees), and the delivery partner fee. These charges help us securely process your order, support local boutiques, and provide reliable delivery.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
