"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export interface CustomerPriceBreakdownProps {
  subtotal: number; // in Rupees
  platformFee?: number; // in Rupees (default 7)
  gstAmount?: number; // in Rupees (calculated by backend / snapshot)
  deliveryFee: number; // in Rupees
  discount?: number; // in Rupees
  total: number; // in Rupees (backend total - never recomputed)
  isEstimatedDelivery?: boolean; // true on Address step
  showHelpSection?: boolean; // default true
  className?: string;
}

export const FIXED_PLATFORM_FEE_RUPEES = 7;

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const CustomerPriceBreakdown: React.FC<CustomerPriceBreakdownProps> = ({
  subtotal,
  platformFee = FIXED_PLATFORM_FEE_RUPEES,
  gstAmount = 0,
  deliveryFee,
  discount = 0,
  total,
  isEstimatedDelivery = false,
  showHelpSection = true,
  className = "",
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const deliveryLabel = isEstimatedDelivery ? "Estimated Delivery Fee" : "Delivery Partner Fee";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Price Details Card */}
      <div className="bg-white border border-hive-border/50 rounded-2xl p-5 shadow-sm space-y-3.5 text-left">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/30 pb-2.5">
          Price Details
        </h3>

        <div className="space-y-2.5 text-xs font-semibold text-hive-text-muted">
          {/* Items Total */}
          <div className="flex justify-between items-center">
            <span>Items Total</span>
            <span className="font-mono text-hive-dark">{formatCurrency(subtotal)}</span>
          </div>

          {/* Platform Fee */}
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1">
              Platform Fee
              <span className="text-[10px] font-bold text-hive-gold bg-hive-gold/10 px-1.5 py-0.5 rounded">
                ₹{platformFee}
              </span>
            </span>
            <span className="font-mono text-hive-dark">{formatCurrency(platformFee)}</span>
          </div>

          {/* GST (18%) */}
          {gstAmount > 0 && (
            <div className="flex justify-between items-center">
              <span>GST (18%)</span>
              <span className="font-mono text-hive-dark">{formatCurrency(gstAmount)}</span>
            </div>
          )}

          {/* Delivery Partner Fee */}
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

          {/* Coupon Discount if active */}
          {discount > 0 && (
            <div className="flex justify-between items-center text-emerald-700 font-bold">
              <span>Coupon Discount</span>
              <span className="font-mono">-{formatCurrency(discount)}</span>
            </div>
          )}

          {/* Grand Total Divider */}
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
            <ul className="space-y-1.5 text-[11px] text-neutral-600 font-medium pl-1 pt-1 border-t border-neutral-200/50 leading-relaxed animate-[fadeIn_0.2s_ease-out]">
              <li className="flex items-start gap-1.5">
                <span className="text-hive-gold font-bold">•</span>
                <span>
                  <strong>Platform Fee</strong> helps operate the Hive marketplace.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-hive-gold font-bold">•</span>
                <span>
                  <strong>GST</strong> is charged as per applicable tax regulations.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-hive-gold font-bold">•</span>
                <span>
                  <strong>Delivery Partner Fee</strong> goes to our logistics partner.
                </span>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
