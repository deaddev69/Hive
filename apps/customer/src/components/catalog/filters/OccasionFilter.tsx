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
      <div className="flex flex-col gap-1.5">
        {OCCASIONS_LIST.map((occ) => {
          const active = selected.includes(occ.id);
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => toggle(occ.id)}
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
                <span className="text-xs font-medium">{occ.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
};
