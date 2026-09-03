"use client";

import React from "react";
import { Sparkles } from "lucide-react";
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
    // Only render visual preview badge on gallery if explicitly ai_enhanced
    if (source !== "ai_enhanced") return null;

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md text-[11px] font-medium tracking-wide shadow-sm select-none pointer-events-none",
          className
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>AI Visual Preview</span>
      </div>
    );
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
        <span className="flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong className="font-semibold text-stone-700">AI Visual Preview:</strong>{" "}
            Digital representation. Product appearance may vary slightly from the delivered item.
          </span>
        </span>
      ) : (
        <span>
          Product color may vary slightly due to studio lighting and screen settings.
        </span>
      )}
    </div>
  );
}
