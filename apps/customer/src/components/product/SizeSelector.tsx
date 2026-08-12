"use client";
import React from "react";
import { cn } from "@hive/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: SizeChip
// ─────────────────────────────────────────────────────────────────────────────
export interface SizeChipProps {
  size: string;
  stock: number;
  isSelected: boolean;
  onClick: () => void;
}

export const SizeChip: React.FC<SizeChipProps> = ({
  size,
  stock,
  isSelected,
  onClick,
}) => {
  const isOutOfStock = stock === 0;

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={onClick}
      className={cn(
        "h-12 w-14 border text-xs font-bold uppercase transition-all duration-200 relative outline-none flex items-center justify-center select-none rounded-xl",
        isSelected
          ? "bg-stone-900 border-stone-900 text-white"
          : isOutOfStock
          ? "border-stone-200 bg-stone-50/50 text-stone-300 cursor-not-allowed line-through"
          : "bg-white border-stone-200 hover:border-stone-950 hover:border-2 text-stone-850"
      )}
    >
      <span>{size}</span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: SizeSelector
// ─────────────────────────────────────────────────────────────────────────────
export interface SizeSelectorProps {
  sizes: string[];
  inventory: Record<string, number>;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  onOpenSizeGuide: () => void;
  fitNote?: string;
  hasMeasurements?: boolean;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes = [],
  inventory = {},
  selectedSize,
  onSelectSize,
  onOpenSizeGuide,
  fitNote,
  hasMeasurements = true,
}) => {
  const currentStock = selectedSize ? inventory[selectedSize] ?? 0 : 0;

  return (
    <div id="size-selector-section" className="w-full flex flex-col gap-3 py-3 scroll-mt-20 text-left">
      
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
          Choose Size
        </span>
        {hasMeasurements && (
          <button
            type="button"
            onClick={onOpenSizeGuide}
            className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
          >
            View measurements →
          </button>
        )}
      </div>

      {/* Sizing Chips list */}
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {sizes.map((size) => (
          <SizeChip
            key={size}
            size={size}
            stock={inventory[size] ?? 0}
            isSelected={selectedSize === size}
            onClick={() => onSelectSize(size)}
          />
        ))}
      </div>

      {/* Sizing Feedback summary / Fit Note - under sizing chips */}
      <div className="flex flex-col gap-1 mt-1 text-left select-none">
        <span className="text-[11px] text-stone-500 font-medium leading-normal">
          {fitNote || "Standard sizing"}
        </span>
        {selectedSize && currentStock > 0 && currentStock <= 3 && (
          <span className="text-[11px] font-bold text-amber-700 leading-normal animate-pulse">
            Low Stock: Only {currentStock} left
          </span>
        )}
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const SizeSelectorSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-3 py-3 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3 w-1/4 bg-stone-200 rounded" />
        <div className="h-3 w-1/3 bg-stone-150 rounded" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-12 bg-stone-100 rounded" />
        ))}
      </div>
      <div className="h-3.5 w-1/3 bg-stone-100 rounded" />
    </div>
  );
};
