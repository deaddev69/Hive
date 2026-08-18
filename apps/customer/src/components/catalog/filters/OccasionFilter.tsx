"use client";

import React from "react";
import { cn } from "@hive/ui";
import { FilterSection } from "./FilterSection";

interface OccasionFilterProps {
  selected: string[]; // Array of occasion ids
  onChange: (values: string[]) => void;
}

const OCCASIONS_LIST = [
  { id: "wedding", name: "Wedding" },
  { id: "festival", name: "Festive" },
  { id: "workwear", name: "Office" },
  { id: "casual", name: "Casual" },
  { id: "party", name: "Party" },
];

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
      <div className="flex flex-wrap gap-2 py-1">
        {OCCASIONS_LIST.map((occ) => {
          const active = selected.includes(occ.id);
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => toggle(occ.id)}
              className={cn(
                "inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer select-none",
                active
                  ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs"
                  : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 hover:bg-stone-100"
              )}
              aria-pressed={active}
            >
              <span>{occ.name}</span>
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
};
