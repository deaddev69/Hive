"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Star,
  TrendingUp,
  MapPin,
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
  MapPin,
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
  const [mounted, setMounted] = useState(false);
  const activeMeta = getSortMeta(value);
  const ActiveIcon = ICON_MAP[activeMeta.icon];

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {/* Unified Trigger Button for both Mobile and Desktop */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 shadow-2xs hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center text-stone-500 w-3.5 h-3.5">
              {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5" strokeWidth={2} />}
            </div>
            <span>Sort: {activeMeta.shortLabel}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" strokeWidth={2} />
        </button>

        {mounted && typeof window !== "undefined" && createPortal(
          <>
            {/* Bottom Sheet Backdrop */}
            <div
              className={cn(
                "fixed inset-0 z-[999] bg-stone-950/40 backdrop-blur-xs transition-opacity duration-300",
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
                "bg-white dark:bg-stone-950 rounded-t-[28px] border-t border-stone-200/80 dark:border-stone-800 shadow-2xl",
                "max-h-[85vh] transition-transform duration-300 ease-out",
                isOpen ? "translate-y-0" : "translate-y-full"
              )}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-9 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 dark:border-stone-800/80 flex-shrink-0">
                <span className="text-xs uppercase tracking-wider font-bold text-stone-900 dark:text-white">Sort By</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  aria-label="Close sort options"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              {/* Options List */}
              <div className="flex-1 overflow-y-auto py-2.5 px-3">
                <div className="flex flex-col gap-1">
                  {SORT_OPTIONS.map((opt) => {
                    const Icon = ICON_MAP[opt.icon];
                    const isActive = value === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelect(opt.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-3 text-left rounded-xl transition-all duration-150 outline-none cursor-pointer",
                          isActive
                            ? "bg-stone-100 dark:bg-stone-900 text-stone-950 dark:text-white font-bold shadow-2xs"
                            : "hover:bg-stone-50 dark:hover:bg-stone-900/50 text-stone-600 dark:text-stone-300 font-medium"
                        )}
                      >
                        {/* Icon + Label block */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-150",
                              isActive
                                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                                : "bg-stone-100 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400"
                            )}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2} />}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs leading-tight">{opt.label}</span>
                            {opt.description && (
                              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-normal mt-0.5">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Minimalist Checkmark */}
                        {isActive && (
                          <Check className="w-4 h-4 text-stone-900 dark:text-white flex-shrink-0" strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
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
