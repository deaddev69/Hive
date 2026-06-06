"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Star,
  TrendingUp,
  Truck,
  Check,
  X,
  ChevronDown,
  type LucideProps,
} from "lucide-react";
import { cn } from "@hive/ui";
import {
  ProductSortOption,
  SORT_OPTIONS,
  SortOptionMeta,
  DEFAULT_SORT,
  getSortMeta,
} from "@/lib/catalogSort";

// ── Icon map keyed by the icon string in SortOptionMeta ──────────────────────
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  Sparkles,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Star,
  TrendingUp,
  Truck,
};

export interface SortDropdownProps {
  value: ProductSortOption;
  onChange: (value: ProductSortOption) => void;
  /** Legacy prop - retained for component compatibility */
  compact?: boolean;
  className?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeMeta = getSortMeta(value);
  const ActiveIcon = ICON_MAP[activeMeta.icon];

  // Disable body scroll when mobile bottom sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSelect = (id: ProductSortOption) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className={cn("w-full md:w-auto", className)}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Desktop Layout: Horizontal Sort Pills                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Sort options">
        {SORT_OPTIONS.map((opt) => {
          const Icon = ICON_MAP[opt.icon];
          const isActive = value === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opt.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300 ease-in-out outline-none",
                "focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2",
                isActive
                  ? "bg-hive-amber border-hive-amber text-white shadow-sm shadow-hive-amber/15 scale-[1.02]"
                  : "bg-white border-hive-border/60 text-hive-dark hover:border-hive-amber/40 hover:bg-hive-comb/10 hover:text-hive-amber"
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 transition-colors duration-300",
                    isActive ? "text-white" : "text-hive-text-muted group-hover:text-hive-amber"
                  )}
                  strokeWidth={2.2}
                />
              )}
              <span>{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Mobile Layout: Premium Bottom Sheet Trigger                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden w-full">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 text-sm font-bold bg-white border-hive-border/60 text-hive-dark hover:border-hive-gold/40"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-lg text-hive-amber w-4 h-4">
              {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5" strokeWidth={2.2} />}
            </div>
            <span className="text-xs">Sort: {activeMeta.shortLabel}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-hive-text-muted" strokeWidth={2.5} />
        </button>

        {/* Bottom Sheet Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-[999] bg-hive-dark/40 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* Bottom Sheet Modal */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sort options"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[1000] flex flex-col",
            "bg-white rounded-t-[32px] shadow-2xl",
            "max-h-[85vh] transition-transform duration-400 ease-out",
            isOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-hive-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-hive-border/60 flex-shrink-0">
            <span className="text-sm font-extrabold text-hive-dark">Sort By</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-hive-cream/60 transition-colors"
              aria-label="Close sort options"
            >
              <X className="w-4 h-4 text-hive-dark" strokeWidth={2.5} />
            </button>
          </div>

          {/* Options List */}
          <div className="flex-1 overflow-y-auto py-2 px-3">
            <div className="flex flex-col gap-1.5">
              {SORT_OPTIONS.map((opt) => {
                const Icon = ICON_MAP[opt.icon];
                const isActive = value === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-3.5 text-left rounded-2xl transition-all duration-200 outline-none",
                      isActive
                        ? "bg-hive-gold/12 text-hive-amber"
                        : "hover:bg-hive-comb/10 text-hive-dark"
                    )}
                  >
                    {/* Icon Box */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                        isActive ? "bg-hive-gold/25 text-hive-amber" : "bg-hive-comb/30 text-hive-text-muted"
                      )}
                    >
                      {Icon && <Icon className="w-4 h-4" strokeWidth={2.2} />}
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-hive-text-muted/70 font-medium mt-0.5 leading-tight">
                        {opt.description}
                      </div>
                    </div>

                    {/* Checkmark */}
                    {isActive && (
                      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-hive-gold flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-hive-dark" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CatalogSort — top-bar wrapper that combines sort options with result context
// ─────────────────────────────────────────────────────────────────────────────
export interface CatalogSortProps {
  value: ProductSortOption;
  onChange: (value: ProductSortOption) => void;
  resultCount: number;
  className?: string;
}

export const CatalogSort: React.FC<CatalogSortProps> = ({
  value,
  onChange,
  resultCount,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
      {/* Left: result count */}
      <p className="text-sm text-hive-text-muted">
        <span className="font-bold text-hive-dark">{resultCount}</span>{" "}
        {resultCount === 1 ? "product" : "products"}
      </p>

      {/* Right: sort pills */}
      <SortDropdown value={value} onChange={onChange} />
    </div>
  );
};
