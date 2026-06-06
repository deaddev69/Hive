"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@hive/ui";

export interface FilterSectionProps {
  title: string;
  /** Badge count shown when section has active selections */
  activeCount?: number;
  /** Start collapsed on desktop (default: expanded) */
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  activeCount = 0,
  defaultCollapsed = false,
  children,
  className,
}) => {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <div className={cn("border-b border-hive-border/50 last:border-b-0", className)}>
      {/* Section header — clickable to toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left group outline-none focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2 rounded-sm"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-hive-dark uppercase tracking-widest">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-hive-gold text-hive-dark text-[9px] font-extrabold">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-hive-text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={2.5}
        />
      </button>

      {/* Collapsible body */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-[600px] opacity-100 pb-4" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
};
