"use client";

import React from "react";
import { FilterSection } from "./FilterSection";
import { Truck } from "lucide-react";
import { cn } from "@hive/ui";

interface DeliveryFilterProps {
  sameDayDelivery: boolean;
  onChange: (value: boolean) => void;
}

export const DeliveryFilter: React.FC<DeliveryFilterProps> = ({
  sameDayDelivery,
  onChange,
}) => {
  return (
    <FilterSection title="Delivery" activeCount={sameDayDelivery ? 1 : 0}>
      <button
        type="button"
        role="switch"
        aria-checked={sameDayDelivery}
        onClick={() => onChange(!sameDayDelivery)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-300",
          sameDayDelivery
            ? "bg-hive-gold/12 border-hive-gold/40"
            : "border-hive-border/50 hover:border-hive-gold/30 hover:bg-hive-comb/10"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-lg transition-colors duration-300",
              sameDayDelivery
                ? "bg-hive-gold/25 text-hive-amber"
                : "bg-hive-comb/40 text-hive-text-muted"
            )}
          >
            <Truck className="w-3.5 h-3.5" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col items-start">
            <span
              className={cn(
                "text-xs font-bold transition-colors duration-200",
                sameDayDelivery ? "text-hive-amber" : "text-hive-dark"
              )}
            >
              Same Day Delivery
            </span>
            <span className="text-[10px] text-hive-text-muted/70 font-medium">
              Available in select zones
            </span>
          </div>
        </div>

        {/* Toggle pill */}
        <div
          className={cn(
            "relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-300",
            sameDayDelivery ? "bg-hive-gold" : "bg-hive-border"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
              sameDayDelivery ? "left-5" : "left-0.5"
            )}
          />
        </div>
      </button>
    </FilterSection>
  );
};
