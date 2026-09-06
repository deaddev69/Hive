"use client";

import React from "react";
import { cn } from "@hive/ui";

export interface ProductPhotoDisclaimerProps {
  source?: "in_store" | "ai_enhanced";
  variant: "badge" | "note";
  className?: string;
}

export function ProductPhotoDisclaimer({
  source,
  variant,
  className,
}: ProductPhotoDisclaimerProps) {
  if (variant === "badge") {
    // Gallery badges disabled for clean luxury presentation
    return null;
  }

  // variant === "note" (rendered inside Product Details accordion)
  const isAi = source === "ai_enhanced";

  return (
    <div
      className={cn(
        "text-[11px] pt-2 border-t border-stone-100/70 leading-relaxed font-sans select-none",
        isAi ? "text-stone-600" : "text-stone-500",
        className
      )}
    >
      {isAi ? (
        <span>
          <strong className="font-semibold text-stone-800">Studio Preview:</strong>{" "}
          Digitally styled for visual reference. You will receive the authentic, original product upon delivery.
        </span>
      ) : (
        <span>
          Product color may vary slightly due to studio lighting and screen settings.
        </span>
      )}
    </div>
  );
}
