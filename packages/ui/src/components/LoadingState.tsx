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
  const beePx = { sm: 18, md: 24, lg: 32 };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none font-sans",
        variant === "full" ? "min-h-[50vh] w-full" : variant === "inline" ? "p-0 min-h-0 flex-row gap-2.5" : "min-h-[120px]",
        className
      )}
    >
      <style>{`
        @keyframes goldLinePulseUI {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.04); }
        }
        @keyframes goldWingGleamUI {
          0%, 100% { opacity: 0.4; transform: rotate(0deg); }
          50%       { opacity: 0.95; transform: rotate(-8deg); }
        }
        .anim-gold-ui-bee { animation: goldLinePulseUI 2.2s infinite ease-in-out; }
        .anim-gold-ui-wings { animation: goldWingGleamUI 0.8s infinite ease-in-out; transform-origin: center center; }
      `}</style>

      {/* Rotating Ring & Concept 2 Line-Art Bee */}
      <div className={cn("relative flex items-center justify-center", containerSize[size], variant === "inline" && "w-5 h-5")}>
        {/* Soft 24k Golden Ambient Glow */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md animate-pulse" />

        {/* Rotating Golden Halo Orbit */}
        <svg 
          className="w-full h-full text-amber-500 animate-spin"
          style={{ animationDuration: "2.4s" }}
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeDasharray="210 60" 
            strokeLinecap="round"
          />
        </svg>

        {/* Concept 2: Single-Stroke 24k Gold Geometric Line-Art Bee */}
        <div className="anim-gold-ui-bee absolute z-10 flex items-center justify-center">
          <svg
            width={variant === "inline" ? 12 : beePx[size]}
            height={variant === "inline" ? 12 : beePx[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="anim-gold-ui-wings">
              <path d="M42 42 C26 22 10 32 24 52 C32 62 44 48 42 42 Z" 
                stroke="#F5C22B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M58 42 C74 22 90 32 76 52 C68 62 56 48 58 42 Z" 
                stroke="#F5C22B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
            <polygon points="50,14 62,22 62,34 50,42 38,34 38,22" 
              stroke="#D9A71E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
            <polygon points="50,42 66,54 66,74 50,88 34,74 34,54" 
              stroke="#D9A71E" strokeWidth="3" strokeLinejoin="round" fill="none" />
            <line x1="37" y1="60" x2="63" y2="60" stroke="#F5C22B" strokeWidth="2" strokeLinecap="round" />
            <line x1="40" y1="70" x2="60" y2="70" stroke="#F5C22B" strokeWidth="2" strokeLinecap="round" />
            <polyline points="44,18 40,10 34,8" stroke="#D9A71E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points="56,18 60,10 66,8" stroke="#D9A71E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
