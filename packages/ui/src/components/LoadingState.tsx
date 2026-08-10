"use client";

import React from "react";
import { cn } from "../utils/cn";

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
  const containerSize = { sm: "w-12 h-12", md: "w-16 h-16", lg: "w-24 h-24" };
  const beePx = { sm: 24, md: 32, lg: 44 };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none font-sans",
        variant === "full" ? "min-h-[50vh] w-full" : variant === "inline" ? "p-0 min-h-0 flex-row gap-2.5" : "min-h-[120px]",
        className
      )}
    >
      {/* Minimalist Golden Hexagon Spinner */}
      <div className={cn("relative flex items-center justify-center", containerSize[size], variant === "inline" && "w-5 h-5")}>
        {/* Soft Golden Ambient Aura */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-pulse" />

        {/* Rotating Outer Hexagon Stroke */}
        <svg 
          className="w-full h-full text-amber-500 animate-spin"
          style={{ animationDuration: "2.5s" }}
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon 
            points="50,6 88,28 88,72 50,94 12,72 12,28" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeDasharray="160"
            strokeDashoffset="40"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Inner Static Soft Hexagon */}
        <svg 
          className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-amber-300/40"
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon 
            points="50,6 88,28 88,72 50,94 12,72 12,28" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Message Label */}
      {message && (
        <span className={cn(
          "text-xs font-semibold text-slate-700 tracking-wide font-sans",
          variant === "inline" ? "mt-0 text-left" : "mt-3"
        )}>
          {message}
        </span>
      )}
    </div>
  );
};
