"use client";

import React from "react";
import { cn } from "@hive/ui";
import { FilterSection } from "./FilterSection";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

interface BoutiqueFilterProps {
  selected: string[];
  onChange: (values: string[]) => void;
}

export const BoutiqueFilter: React.FC<BoutiqueFilterProps> = ({
  selected,
  onChange,
}) => {
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  if (dbBoutiques === undefined) {
    return (
      <FilterSection title="Boutique" activeCount={selected.length} defaultCollapsed={true}>
        <div className="flex items-center justify-center py-4 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-hive-amber" />
          <span className="text-xs text-hive-text-muted font-medium">Loading boutiques...</span>
        </div>
      </FilterSection>
    );
  }

  return (
    <FilterSection
      title="Boutique"
      activeCount={selected.length}
      defaultCollapsed={true}
    >
      <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-hive-border [&::-webkit-scrollbar-thumb]:rounded-full">
        {dbBoutiques.map((boutique) => {
          const active = selected.includes(boutique._id);
          const rating = 4.8; // default fallback
          const productCount = 12; // default fallback
          
          return (
            <button
              key={boutique._id}
              type="button"
              onClick={() => toggle(boutique._id)}
              aria-pressed={active}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 group",
                active
                  ? "bg-hive-gold/15 border-hive-gold/40"
                  : "border-transparent hover:bg-hive-comb/20 hover:border-hive-border/40"
              )}
            >
              {/* Checkbox */}
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

              {/* Boutique info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs font-bold truncate",
                      active ? "text-hive-amber" : "text-hive-dark"
                    )}
                  >
                    {boutique.boutiqueName}
                  </span>
                  {boutique.status === "APPROVED" && (
                    <ShieldCheck className="w-3 h-3 text-hive-amber flex-shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-hive-text-muted/70 font-medium">
                  {productCount} products
                </span>
              </div>

              {/* Rating */}
              <span className="text-[10px] font-bold text-hive-gold flex-shrink-0">
                ★ {rating}
              </span>
            </button>
          );
        })}
        {dbBoutiques.length === 0 && (
          <div className="text-center py-6 text-xs text-hive-text-muted">
            No boutiques available.
          </div>
        )}
      </div>
    </FilterSection>
  );
};
