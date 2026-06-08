"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";

export interface CatalogResultsSummaryProps {
  count: number;
  /** Category names to display in the summary (resolved from DB in parent) */
  categoryNames?: string[];
  className?: string;
}

export const CatalogResultsSummary: React.FC<CatalogResultsSummaryProps> = ({
  count,
  categoryNames = [],
  className = "",
}) => {
  const getSummaryText = () => {
    const productWord = count === 1 ? "Product" : "Products";

    if (count === 0) {
      return "No products match your filters";
    }

    let summary = `Showing ${count} ${productWord}`;

    if (categoryNames.length === 1) {
      summary += ` in ${categoryNames[0]}`;
    } else if (categoryNames.length === 2) {
      summary += ` in ${categoryNames[0]} & ${categoryNames[1]}`;
    } else if (categoryNames.length > 2) {
      summary += ` across ${categoryNames.length} categories`;
    }

    return summary;
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-hive-cream/40 border border-hive-border/40 text-xs font-semibold text-hive-dark tracking-wide ${className}`}
    >
      <SlidersHorizontal className="w-3.5 h-3.5 text-hive-gold flex-shrink-0" strokeWidth={2} />
      <span>{getSummaryText()}</span>
      {categoryNames.length > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-hive-amber animate-pulse flex-shrink-0" />
      )}
    </div>
  );
};
