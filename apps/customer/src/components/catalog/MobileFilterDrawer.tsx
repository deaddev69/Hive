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
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 dark:border-stone-800 flex-shrink-0 bg-white dark:bg-stone-950">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-white">Filters</h3>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 text-[10px] font-bold min-w-[20px]">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-2 py-3 bg-[#FCFAF7] dark:bg-stone-950">
          <CatalogFilters
            filters={filters}
            onChange={onChange}
            compact={true}
            className="border-0 bg-transparent rounded-none shadow-none"
          />
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-stone-200/80 dark:border-stone-800 flex-shrink-0 bg-white dark:bg-stone-950">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTER_STATE)}
            disabled={activeCount === 0}
            className="flex-1 py-3.5 rounded-2xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold uppercase tracking-wider shadow-md hover:bg-stone-800 dark:hover:bg-stone-100 transition-all duration-200 cursor-pointer"
          >
            {activeCount > 0 ? `Apply Filters (${activeCount})` : "View Results"}
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
    className="relative inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-400 hover:bg-stone-50 dark:hover:bg-stone-850 transition-all duration-200 text-xs font-bold text-stone-900 dark:text-white shadow-2xs cursor-pointer"
    aria-label={`Open filters${activeCount > 0 ? `, ${activeCount} active` : ""}`}
  >
    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
    <span>Filters</span>
    {activeCount > 0 && (
      <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-amber-500 text-white dark:text-stone-950 text-[9px] font-extrabold flex items-center justify-center">
        {activeCount}
      </span>
    )}
  </button>
);
