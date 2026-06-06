"use client";

import React, { useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@hive/ui";
import {
  CatalogFilterState,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
} from "@/lib/catalogFilters";
import { CatalogFilters } from "./CatalogFilters";

interface MobileFilterDrawerProps {
  filters: CatalogFilterState;
  onChange: (filters: CatalogFilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  filters,
  onChange,
  isOpen,
  onClose,
}) => {
  const activeCount = countActiveFilters(filters);

  // Lock body scroll when open
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

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-hive-dark/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides up from bottom */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Product filters"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex flex-col",
          "bg-white rounded-t-[32px] shadow-2xl",
          "max-h-[90dvh] transition-transform duration-400 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-hive-border" />
        </div>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-hive-border/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-hive-gold" />
            <span className="text-sm font-extrabold text-hive-dark">Filters</span>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-hive-gold text-hive-dark text-[10px] font-extrabold min-w-[20px]">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-hive-cream/60 transition-colors"
            aria-label="Close filters"
          >
            <X className="w-4 h-4 text-hive-dark" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable filter body — uses compact CatalogFilters (no sticky, no rounded card) */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          <CatalogFilters
            filters={filters}
            onChange={onChange}
            compact={true}
            className="border-0 rounded-none shadow-none"
          />
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-hive-border/40 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTER_STATE)}
            disabled={activeCount === 0}
            className="flex-1 py-3 rounded-2xl border border-hive-border/60 text-sm font-bold text-hive-text hover:border-hive-amber/50 hover:text-hive-amber transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-hive-gold text-hive-dark text-sm font-extrabold uppercase tracking-widest shadow-md shadow-hive-gold/25 hover:bg-hive-amber transition-all duration-200"
          >
            {activeCount > 0 ? `Apply (${activeCount})` : "Apply"}
          </button>
        </div>
      </div>
    </>
  );
};

/* ── Trigger button — shown on mobile ── */
interface MobileFilterTriggerProps {
  activeCount: number;
  onClick: () => void;
}

export const MobileFilterTrigger: React.FC<MobileFilterTriggerProps> = ({
  activeCount,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-hive-border/60 bg-white hover:border-hive-gold/50 hover:bg-hive-comb/10 transition-all duration-200 text-sm font-bold text-hive-dark shadow-sm"
    aria-label={`Open filters${activeCount > 0 ? `, ${activeCount} active` : ""}`}
  >
    <SlidersHorizontal className="w-4 h-4 text-hive-gold" />
    Filters
    {activeCount > 0 && (
      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-hive-gold text-hive-dark text-[9px] font-extrabold flex items-center justify-center">
        {activeCount}
      </span>
    )}
  </button>
);
