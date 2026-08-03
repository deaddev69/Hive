"use client";

import React from "react";
import { cn } from "../utils/cn";
import { MapPin } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "full" | "inline";
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className,
  size = "md",
  variant = "default",
}) => {
  const containerSize = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-18 h-18" };
  const iconSize = { sm: "w-5 h-5", md: "w-7 h-7", lg: "w-9 h-9" };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none font-sans",
        variant === "full" ? "min-h-[60vh] w-full" : "min-h-[140px]",
        className
      )}
    >
      {/* GPS Radar Pulse & Location Badge Container */}
      <div className={cn("relative flex items-center justify-center mb-3.5", containerSize[size])}>
        
        {/* Outer Expanding Radar Ripple 1 */}
        <div className="absolute inset-0 rounded-2xl border border-amber-400/40 animate-ping opacity-30 duration-1000" />
        
        {/* Outer Expanding Radar Ripple 2 */}
        <div className="absolute inset-[-4px] rounded-2xl bg-amber-100/50 blur-sm animate-pulse" />

        {/* Central Amber Location Badge */}
        <div className="relative z-10 w-full h-full rounded-2xl bg-amber-50 border border-amber-200/90 shadow-xs flex items-center justify-center text-amber-600 transition-all duration-300">
          <MapPin className={cn("stroke-[1.8] text-amber-600 animate-bounce duration-1000", iconSize[size])} />
        </div>
      </div>

      {/* Message Label */}
      <span className="text-[13px] font-semibold text-slate-700 tracking-tight font-sans">
        {message}
      </span>
    </div>
  );
};
