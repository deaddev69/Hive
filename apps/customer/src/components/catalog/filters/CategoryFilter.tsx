"use client";

import React from "react";
import { cn } from "@hive/ui";
import { FilterSection } from "./FilterSection";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

interface CategoryFilterProps {
  selected: string[]; // Array of category DB IDs
  onChange: (values: string[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selected,
  onChange,
}) => {
  const dbCategories = useQuery(api.categories.getCategories, { onlyActive: true });

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  if (dbCategories === undefined) {
    return (
      <FilterSection title="Category" activeCount={selected.length}>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-hive-comb/20 animate-pulse border border-hive-border/30"
            />
          ))}
        </div>
      </FilterSection>
    );
  }

  if (dbCategories.length === 0) {
    return (
      <FilterSection title="Category" activeCount={0}>
        <p className="text-xs text-hive-text-muted py-2 text-center">
          No categories available.
        </p>
      </FilterSection>
    );
  }

  return (
    <FilterSection title="Category" activeCount={selected.length}>
      <div className="flex flex-col gap-1.5">
        {dbCategories.map((cat) => {
          const active = selected.includes(cat._id);
          return (
            <button
              key={cat._id}
              type="button"
              onClick={() => toggle(cat._id)}
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
                <span className="text-xs font-medium">{cat.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
};
