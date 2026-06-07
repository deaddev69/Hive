"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export interface CatalogResultsSummaryProps {
  count: number;
  occasions: string[];
  categories: string[];
  boutiques: string[];
  className?: string;
}

export const CatalogResultsSummary: React.FC<CatalogResultsSummaryProps> = ({
  count,
  occasions,
  categories,
  boutiques,
  className = "",
}) => {
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques);

  const formatSlug = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getSummaryText = () => {
    if (count === 0) {
      return "No matching products found";
    }

    const productWord = count === 1 ? "Product" : "Products";
    let summary = `Showing ${count} ${productWord}`;

    // Occasion phrase
    if (occasions.length > 0) {
      const occasionNames = occasions.map(formatSlug);
      if (occasionNames.length === 1) {
        summary += ` for ${occasionNames[0]}`;
      } else if (occasionNames.length === 2) {
        summary += ` for ${occasionNames[0]} & ${occasionNames[1]}`;
      } else {
        summary += ` for ${occasionNames.slice(0, -1).join(", ")}, & ${occasionNames[occasionNames.length - 1]}`;
      }
    }

    // Category phrase
    if (categories.length > 0) {
      const categoryNames = categories.map(formatSlug);
      if (categoryNames.length === 1) {
        summary += ` in ${categoryNames[0]}`;
      } else if (categoryNames.length === 2) {
        summary += ` in ${categoryNames[0]} & ${categoryNames[1]}`;
      } else {
        summary += ` in ${categoryNames.slice(0, -1).join(", ")}, & ${categoryNames[categoryNames.length - 1]}`;
      }
    }

    // Boutique phrase
    if (boutiques.length > 0) {
      const boutiqueNames = boutiques.map((id) => {
        const boutique = (dbBoutiques || []).find((b) => b._id === id);
        return boutique ? boutique.boutiqueName : formatSlug(id);
      });

      if (boutiqueNames.length === 1) {
        summary += ` from ${boutiqueNames[0]}`;
      } else if (boutiqueNames.length === 2) {
        summary += ` from ${boutiqueNames[0]} & ${boutiqueNames[1]}`;
      } else {
        summary += ` from ${boutiqueNames.length} Boutiques`;
      }
    }

    return summary;
  };

  const activeFiltersCount =
    occasions.length + categories.length + boutiques.length;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-hive-cream/40 border border-hive-border/40 text-xs font-semibold text-hive-dark tracking-wide ${className}`}
    >
      <SlidersHorizontal className="w-3.5 h-3.5 text-hive-gold flex-shrink-0" strokeWidth={2} />
      <span>{getSummaryText()}</span>
      {activeFiltersCount > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-hive-amber animate-pulse flex-shrink-0" />
      )}
    </div>
  );
};
