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
  const containerSize = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
  const beePx = { sm: 18, md: 26, lg: 34 };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none font-sans",
        variant === "full" ? "min-h-[50vh] w-full" : variant === "inline" ? "p-0 min-h-0 flex-row gap-2.5" : "min-h-[120px]",
        className
      )}
    >
      <style>{`
        @keyframes beeWingFlutterUI {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          50%       { transform: rotate(-28deg) scaleY(0.55); }
        }
        @keyframes beeHoverFloatUI {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-2.5px) rotate(1.5deg); }
        }
        .anim-ui-wings { animation: beeWingFlutterUI 0.12s infinite ease-in-out; transform-origin: bottom center; }
        .anim-ui-float { animation: beeHoverFloatUI 1.8s infinite ease-in-out; }
      `}</style>

      {/* Rotating Ring & Micro Bee */}
      <div className={cn("relative flex items-center justify-center", containerSize[size], variant === "inline" && "w-5 h-5")}>
        {/* Soft Golden Ambient Aura */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-pulse" />

        {/* Rotating Golden Ring Orbit */}
        <svg 
          className="w-full h-full text-amber-500 animate-spin"
          style={{ animationDuration: "2s" }}
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeDasharray="200 70" 
            strokeLinecap="round"
          />
        </svg>

        {/* Flying Micro-Bee Vector */}
        <div className="anim-ui-float absolute z-10 flex items-center justify-center">
          <svg
            width={variant === "inline" ? 12 : beePx[size]}
            height={variant === "inline" ? 12 : beePx[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="anim-ui-wings">
              <ellipse cx="36" cy="30" rx="13" ry="22" fill="#FEF3C7" fillOpacity="0.9"
                stroke="#F5C22B" strokeWidth="2" transform="rotate(-30 36 30)" />
              <ellipse cx="64" cy="30" rx="13" ry="22" fill="#FEF3C7" fillOpacity="0.9"
                stroke="#F5C22B" strokeWidth="2" transform="rotate(30 64 30)" />
            </g>
            <ellipse cx="50" cy="58" rx="26" ry="32" fill="#F5C22B" />
            <path d="M26 50 C38 46, 62 46, 74 50 C72 56, 68 60, 50 60 C32 60, 28 56, 26 50 Z" fill="#1C1200" />
            <path d="M28 66 C38 62, 62 62, 72 66 C70 72, 64 76, 50 76 C36 76, 30 72, 28 66 Z" fill="#1C1200" />
            <circle cx="50" cy="32" r="14" fill="#1C1200" />
            <circle cx="44" cy="29" r="3" fill="#FFFFFF" />
            <circle cx="56" cy="29" r="3" fill="#FFFFFF" />
            <circle cx="45" cy="30" r="1.5" fill="#1C1200" />
            <circle cx="57" cy="30" r="1.5" fill="#1C1200" />
            <path d="M44 20 C40 12, 36 12, 34 14" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M56 20 C60 12, 64 12, 66 14" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="50,90 46,84 54,84" fill="#D9A71E" />
          </svg>
        </div>
      </div>

      {/* Message Label */}
      {message && (
        <span className={cn(
          "text-xs font-semibold text-slate-800 tracking-wide font-sans",
          variant === "inline" ? "mt-0 text-left" : "mt-3"
        )}>
          {message}
        </span>
      )}
    </div>
  );
};
