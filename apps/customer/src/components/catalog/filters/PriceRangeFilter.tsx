"use client";

import React, { useCallback } from "react";
import { FilterSection } from "./FilterSection";
import { PRICE_MIN, PRICE_MAX } from "@/lib/catalogFilters";

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  onChange: (min: number, max: number) => void;
}

const fmt = (v: number) =>
  `₹${v.toLocaleString("en-IN")}`;

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  onChange,
}) => {
  const isActive = minPrice > PRICE_MIN || maxPrice < PRICE_MAX;

  const handleMin = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), maxPrice - 500);
      onChange(val, maxPrice);
    },
    [maxPrice, onChange]
  );

  const handleMax = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), minPrice + 500);
      onChange(minPrice, val);
    },
    [minPrice, onChange]
  );

  const minPct = ((minPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const maxPct = ((maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <FilterSection title="Price Range" activeCount={isActive ? 1 : 0}>
      <div className="flex flex-col gap-5 px-1">
        {/* Range display */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-hive-dark">{fmt(minPrice)}</span>
          <span className="text-xs text-hive-text-muted">–</span>
          <span className="text-sm font-bold text-hive-dark">{fmt(maxPrice)}</span>
        </div>

        {/* Dual-range slider */}
        <div className="relative h-6 flex items-center">
          {/* Track */}
          <div className="absolute w-full h-1.5 rounded-full bg-hive-border/60">
            {/* Active track fill */}
            <div
              className="absolute h-full rounded-full bg-gradient-to-r from-hive-amber to-hive-gold"
              style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
            />
          </div>

          {/* Min thumb */}
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={500}
            value={minPrice}
            onChange={handleMin}
            className="absolute w-full h-full appearance-none bg-transparent cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-hive-gold
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-hive-gold/30
                       [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
                       [&::-webkit-slider-thumb]:transition-all
                       [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                       [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                       [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-hive-gold"
            aria-label="Minimum price"
            style={{ zIndex: minPrice > PRICE_MAX - 1000 ? 5 : 3 }}
          />

          {/* Max thumb */}
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={500}
            value={maxPrice}
            onChange={handleMax}
            className="absolute w-full h-full appearance-none bg-transparent cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                       [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-hive-gold
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-hive-gold/30
                       [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
                       [&::-webkit-slider-thumb]:transition-all
                       [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                       [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                       [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-hive-gold"
            aria-label="Maximum price"
            style={{ zIndex: 4 }}
          />
        </div>

        {/* Quick preset chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Under ₹2k", min: 0, max: 2000 },
            { label: "₹2k–₹5k", min: 2000, max: 5000 },
            { label: "₹5k–₹10k", min: 5000, max: 10000 },
          ].map((preset) => {
            const active = minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange(preset.min, preset.max)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-200 ${
                  active
                    ? "bg-hive-gold text-hive-dark border-hive-amber"
                    : "bg-white border-hive-border/60 text-hive-text hover:border-hive-gold/40"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </FilterSection>
  );
};
