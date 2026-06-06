"use client";

import React from "react";
import { Ruler, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { cn } from "@hive/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: InventoryIndicator
// ─────────────────────────────────────────────────────────────────────────────
export interface InventoryIndicatorProps {
  stock: number;
  selectedSize: string;
  className?: string;
}

export const InventoryIndicator: React.FC<InventoryIndicatorProps> = ({
  stock,
  selectedSize,
  className = "",
}) => {
  if (!selectedSize) return null;

  if (stock === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-50 border border-red-200 text-red-600 animate-fade-in", className)}>
        <AlertCircle className="w-3.5 h-3.5" />
        Out of Stock
      </span>
    );
  }

  if (stock > 0 && stock <= 3) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse", className)}>
        <AlertCircle className="w-3.5 h-3.5 fill-current text-amber-500" />
        Low Stock (Only {stock} left)
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-green-50 border border-green-200 text-green-700 animate-fade-in", className)}>
      <CheckCircle className="w-3.5 h-3.5" />
      In Stock
    </span>
  );
};

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
        "h-12 min-w-[3.25rem] px-4 rounded-xl text-xs font-extrabold border flex flex-col items-center justify-center transition-all duration-200 relative outline-none focus-visible:ring-2 focus-visible:ring-hive-amber focus-visible:ring-offset-2",
        isSelected
          ? "bg-hive-gold border-hive-gold text-hive-dark shadow-md shadow-hive-gold/25 scale-[1.03]"
          : isOutOfStock
          ? "border-hive-border/30 bg-hive-cream/5 text-hive-text-muted/40 cursor-not-allowed"
          : "bg-white border-hive-border/60 hover:border-hive-amber/50 hover:bg-hive-comb/10 text-hive-dark"
      )}
    >
      <span className={cn(isOutOfStock && "line-through opacity-45")}>{size}</span>
      {isOutOfStock && (
        <span className="text-[7px] text-hive-text-muted/50 font-medium scale-90 -mt-0.5 leading-none">
          sold out
        </span>
      )}
      {!isOutOfStock && stock > 0 && stock <= 3 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
      )}
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
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes = [],
  inventory = {},
  selectedSize,
  onSelectSize,
  onOpenSizeGuide,
}) => {
  const currentStock = selectedSize ? inventory[selectedSize] ?? 0 : 0;

  return (
    <div className="w-full flex flex-col gap-3.5 py-4 border-t border-b border-hive-border/40">
      
      {/* Header Label + Measurement link */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-hive-dark">
          Select Size
        </span>
        <button
          type="button"
          onClick={onOpenSizeGuide}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-hive-amber hover:text-hive-gold transition-colors"
        >
          <Ruler className="w-3.5 h-3.5" />
          View Measurement Guide
        </button>
      </div>

      {/* Sizing Chips list */}
      <div className="flex items-center gap-2 flex-wrap">
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

      {/* Sizing Feedback summary + Inventory status indicator */}
      <div className="flex items-center justify-between min-h-[28px] mt-1 flex-wrap gap-2">
        <div className="text-xs font-semibold text-hive-dark">
          {selectedSize ? (
            <span>
              Selected Size: <span className="font-extrabold text-hive-amber bg-hive-gold/10 px-2 py-0.5 rounded-md border border-hive-gold/20">{selectedSize}</span>
            </span>
          ) : (
            <span className="text-hive-text-muted/80 italic flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-hive-gold" />
              Please select a size
            </span>
          )}
        </div>

        {/* Inventory Indicator badge */}
        <InventoryIndicator stock={currentStock} selectedSize={selectedSize} />
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const SizeSelectorSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-3.5 py-4 border-t border-b border-hive-border/40 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3 w-1/4 bg-hive-comb/15 rounded" />
        <div className="h-3 w-1/3 bg-hive-comb/10 rounded" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-12 rounded-xl bg-hive-comb/15" />
        ))}
      </div>
      <div className="h-3.5 w-1/3 bg-hive-comb/10 rounded" />
    </div>
  );
};
