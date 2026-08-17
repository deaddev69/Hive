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
      <div className="flex flex-wrap gap-2 py-1">
        {dbCategories.map((cat: any) => {
          const active = selected.includes(cat._id);
          return (
            <button
              key={cat._id}
              type="button"
              onClick={() => toggle(cat._id)}
              className={cn(
                "inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                active
                  ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs scale-[1.02]"
                  : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-800 hover:border-amber-400 hover:bg-stone-100"
              )}
              aria-pressed={active}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
};
