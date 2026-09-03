"use client";

import React from "react";
import { VerticalConfig } from "@hive/types";
import { ProductDetail } from "@/lib/mockProductDetails";
import { cn } from "@hive/ui";

export interface ProductSpecificationsProps {
  product: ProductDetail;
  config: VerticalConfig;
  className?: string;
}

export function ProductSpecifications({
  product,
  config,
  className,
}: ProductSpecificationsProps) {
  const details = product.details || {};

  // Generic projection: derive visible fields strictly from config.specKeys + config.specLabels + product.details
  const renderedSpecs = config.specKeys
    .map((key) => {
      const label = config.specLabels[key] || key;
      const val = details[key];
      const value = typeof val === "string" ? val.trim() : "";
      return { key, label, value };
    })
    .filter((item): item is typeof item & { value: string } => Boolean(item.value));

  if (renderedSpecs.length === 0) return null;

  return (
    <div className={cn("space-y-3 pt-2", className)}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1 border-t border-stone-100">
        {renderedSpecs.map(({ key, label, value }) => (
          <div key={key} className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none mb-1">
              {label}
            </span>
            <span className="text-xs font-semibold text-stone-800 leading-normal">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
