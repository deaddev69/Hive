"use client";

import React from "react";
import { cn } from "@hive/ui";
import { FilterSection } from "./FilterSection";
import { CATEGORY_OPTIONS } from "@/lib/catalogFilters";

interface CategoryFilterProps {
  selected: string[];
  onChange: (values: string[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
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
    <FilterSection title="Category" activeCount={selected.length}>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              aria-pressed={active}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200",
                active
                  ? "bg-hive-gold text-hive-dark border-hive-amber shadow-sm shadow-hive-gold/20"
                  : "bg-white border-hive-border/60 text-hive-text hover:border-hive-gold/50 hover:bg-hive-comb/20"
              )}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span
                  className={cn(
                    "ml-1.5 text-[10px] font-medium",
                    active ? "text-hive-dark/70" : "text-hive-text-muted/60"
                  )}
                >
                  ({opt.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
};
