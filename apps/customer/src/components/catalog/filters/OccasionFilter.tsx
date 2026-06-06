"use client";

import React from "react";
import { cn } from "@hive/ui";
import { FilterSection } from "./FilterSection";
import { OCCASION_OPTIONS } from "@/lib/catalogFilters";

interface OccasionFilterProps {
  selected: string[];
  onChange: (values: string[]) => void;
}

export const OccasionFilter: React.FC<OccasionFilterProps> = ({
  selected,
  onChange,
}) => {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  return (
    <FilterSection title="Occasion" activeCount={selected.length}>
      <div className="flex flex-col gap-1.5">
        {OCCASION_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left group",
                active
                  ? "bg-hive-gold/15 border border-hive-gold/40 text-hive-amber font-bold"
                  : "border border-transparent hover:bg-hive-comb/30 hover:border-hive-border/50 text-hive-text"
              )}
              aria-pressed={active}
            >
              <span className="flex items-center gap-2.5">
                {/* Custom checkbox */}
                <span
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    active
                      ? "bg-hive-gold border-hive-amber"
                      : "border-hive-border group-hover:border-hive-gold/60"
                  )}
                >
                  {active && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2" fill="none">
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-base leading-none">{opt.icon}</span>
                <span className="text-xs font-medium">{opt.label}</span>
              </span>
              {opt.count !== undefined && (
                <span className="text-[10px] text-hive-text-muted/70 font-medium tabular-nums">
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
};
