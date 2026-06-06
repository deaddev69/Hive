"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Star,
  TrendingUp,
  Truck,
  ChevronDown,
  Check,
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

// ─────────────────────────────────────────────────────────────────────────────
// SortOption — single row inside the dropdown
// ─────────────────────────────────────────────────────────────────────────────
interface SortOptionRowProps {
  option: SortOptionMeta;
  isActive: boolean;
  onSelect: (id: ProductSortOption) => void;
}

const SortOptionRow: React.FC<SortOptionRowProps> = ({
  option,
  isActive,
  onSelect,
}) => {
  const Icon = ICON_MAP[option.icon];

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      onClick={() => onSelect(option.id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 group outline-none",
        "focus-visible:bg-hive-comb/20",
        isActive
          ? "bg-hive-gold/12 text-hive-amber"
          : "hover:bg-hive-comb/15 text-hive-dark"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-150",
          isActive
            ? "bg-hive-gold/25 text-hive-amber"
            : "bg-hive-comb/30 text-hive-text-muted group-hover:bg-hive-comb/60 group-hover:text-hive-amber"
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold leading-tight truncate">{option.label}</div>
        <div className="text-[10px] text-hive-text-muted/70 font-medium mt-0.5 leading-tight">
          {option.description}
        </div>
      </div>

      {/* Active checkmark */}
      <div
        className={cn(
          "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-150",
          isActive ? "bg-hive-gold opacity-100" : "opacity-0"
        )}
      >
        <Check className="w-2.5 h-2.5 text-hive-dark" strokeWidth={3} />
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SortDropdown — full component with trigger + panel
// ─────────────────────────────────────────────────────────────────────────────
export interface SortDropdownProps {
  value: ProductSortOption;
  onChange: (value: ProductSortOption) => void;
  /** Compact mode for mobile — shows just the icon + short label */
  compact?: boolean;
  className?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  compact = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMeta = getSortMeta(value);
  const isDefault = value === DEFAULT_SORT;

  // Close on outside click / focus-out
  useEffect(() => {
    const handler = (e: MouseEvent | FocusEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("focusin", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("focusin", handler);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (id: ProductSortOption) => {
    onChange(id);
    setOpen(false);
  };

  const ActiveIcon = ICON_MAP[activeMeta.icon];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort by: ${activeMeta.label}`}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border transition-all duration-200 text-sm font-bold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2",
          open
            ? "border-hive-gold/50 bg-hive-comb/20 shadow-sm"
            : "border-hive-border/60 bg-white hover:border-hive-gold/40 hover:bg-hive-comb/10",
          compact ? "px-3 py-2" : "px-4 py-2.5"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-lg flex-shrink-0",
            isDefault ? "text-hive-text-muted" : "text-hive-amber",
            compact ? "w-4 h-4" : "w-5 h-5"
          )}
        >
          {ActiveIcon && (
            <ActiveIcon
              className={compact ? "w-3.5 h-3.5" : "w-4 h-4"}
              strokeWidth={2.2}
            />
          )}
        </div>

        {/* Label */}
        <span
          className={cn(
            "transition-colors duration-200",
            isDefault ? "text-hive-dark/80" : "text-hive-amber",
            compact ? "text-xs" : "text-xs"
          )}
        >
          {compact ? activeMeta.shortLabel : `Sort: ${activeMeta.label}`}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "flex-shrink-0 text-hive-text-muted transition-transform duration-200",
            compact ? "w-3 h-3" : "w-3.5 h-3.5",
            open && "rotate-180"
          )}
          strokeWidth={2.5}
        />
      </button>

      {/* ── Dropdown panel ── */}
      <div
        role="listbox"
        aria-label="Sort options"
        className={cn(
          "absolute right-0 top-[calc(100%+6px)] w-[260px] z-30",
          "bg-white border border-hive-border/60 rounded-[20px] shadow-xl shadow-hive-dark/8",
          "overflow-hidden",
          "transition-all duration-200 origin-top-right",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-[0.96] -translate-y-1 pointer-events-none"
        )}
      >
        {/* Panel header */}
        <div className="px-4 py-3 border-b border-hive-border/40 bg-hive-cream/50">
          <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-widest">
            Sort By
          </span>
        </div>

        {/* Options list */}
        <div className="py-1">
          {SORT_OPTIONS.map((opt) => (
            <SortOptionRow
              key={opt.id}
              option={opt}
              isActive={value === opt.id}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CatalogSort — top-bar wrapper that combines the dropdown with result context
// Placed in the results bar above the product grid.
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
    <div
      className={cn(
        "flex items-center justify-between gap-4 flex-wrap",
        className
      )}
    >
      {/* Left: result count */}
      <p className="text-sm text-hive-text-muted">
        <span className="font-bold text-hive-dark">{resultCount}</span>{" "}
        {resultCount === 1 ? "product" : "products"}
      </p>

      {/* Right: sort dropdown */}
      <SortDropdown value={value} onChange={onChange} />
    </div>
  );
};
