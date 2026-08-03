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
        variant === "full" ? "min-h-[60vh] w-full" : "min-h-[140px]",
        className
      )}
    >
      <style>{`
        @keyframes miniWingFlutter {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          50%       { transform: rotate(20deg) scaleY(0.6); }
        }
        @keyframes miniBeeFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-4px) rotate(1deg); }
        }
        .anim-ls-wings { animation: miniWingFlutter 0.14s infinite ease-in-out; transform-origin: bottom center; }
        .anim-ls-float { animation: miniBeeFloat 2.2s infinite ease-in-out; }
      `}</style>

      {/* Honeycomb & Rotating Arc Container */}
      <div className={cn("relative flex items-center justify-center mb-3.5", containerSize[size])}>

        {/* Soft Ambient Golden Glow */}
        <div className="absolute inset-1 rounded-full bg-amber-200/50 blur-lg" />

        {/* Rotating Outer Amber Arc */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-amber-200/50 border-t-[#F5C22B] animate-spin"
          style={{ animationDuration: "1.2s" }}
        />

        {/* Static Minimalist Honeycomb Hexagon Frame */}
        <svg 
          className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-[#F5C22B]/40"
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon 
            points="50,5 90,27 90,73 50,95 10,73 10,27" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            fill="none" 
            strokeLinejoin="round"
          />
        </svg>

        {/* Flying Golden Honeybee */}
        <div className="anim-ls-float relative z-10 flex items-center justify-center">
          <svg
            width={beePx[size]}
            height={beePx[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="anim-ls-wings">
              <ellipse cx="34" cy="32" rx="14" ry="24" fill="#FEF3C7" fillOpacity="0.95"
                stroke="#F5C22B" strokeWidth="1.5" transform="rotate(-30 34 32)" />
              <ellipse cx="66" cy="32" rx="14" ry="24" fill="#FEF3C7" fillOpacity="0.95"
                stroke="#F5C22B" strokeWidth="1.5" transform="rotate(30 66 32)" />
            </g>
            <ellipse cx="50" cy="58" rx="28" ry="34" fill="#F5C22B" />
            <path d="M26 50 C38 46, 62 46, 74 50 C72 56, 68 60, 50 60 C32 60, 28 56, 26 50 Z" fill="#1C1200" />
            <path d="M28 66 C38 62, 62 62, 72 66 C70 72, 64 76, 50 76 C36 76, 30 72, 28 66 Z" fill="#1C1200" />
            <circle cx="50" cy="30" r="15" fill="#1C1200" />
            <circle cx="44" cy="27" r="3.5" fill="#FFFFFF" />
            <circle cx="56" cy="27" r="3.5" fill="#FFFFFF" />
            <circle cx="45" cy="28" r="1.5" fill="#1C1200" />
            <circle cx="57" cy="28" r="1.5" fill="#1C1200" />
            <path d="M44 18 C40 10, 36 10, 34 12" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M56 18 C60 10, 64 10, 66 12" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="50,92 46,86 54,86" fill="#D9A71E" />
          </svg>
        </div>
      </div>

      {/* Message Label */}
      <span className="text-[13px] font-semibold text-slate-700 tracking-tight font-sans">
        {message}
      </span>
    </div>
  );
};
