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
  const containerSize = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-20 h-20" };
  const beePx = { sm: 26, md: 38, lg: 52 };
  const spinRingInset = { sm: "inset-[-5px]", md: "inset-[-6px]", lg: "inset-[-8px]" };

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
          50%       { transform: rotate(22deg) scaleY(0.58); }
        }
        @keyframes miniBeeFloat {
          0%, 100% { transform: translateY(0px)  rotate(-2deg); }
          50%       { transform: translateY(-5px) rotate( 2deg); }
        }
        .anim-ls-wings { animation: miniWingFlutter 0.14s infinite ease-in-out; transform-origin: bottom center; }
        .anim-ls-float { animation: miniBeeFloat 2.4s  infinite ease-in-out; }
      `}</style>

      {/* Bee + ring container */}
      <div className={cn("relative flex items-center justify-center mb-3", containerSize[size])}>

        {/* Warm amber glow disc — very subtle on white */}
        <div className="absolute inset-0 rounded-full bg-amber-100/70 blur-md" />

        {/* Static thin ring */}
        <div className="absolute inset-0 rounded-full border border-amber-300/50" />

        {/* Spinning accent arc */}
        <div
          className={cn(
            "absolute rounded-full border-[2.5px] border-transparent border-t-amber-400 border-r-amber-200/60 animate-spin",
            spinRingInset[size]
          )}
          style={{ animationDuration: "1.1s" }}
        />

        {/* Flying Bee */}
        <div className="anim-ls-float relative z-10 flex items-center justify-center">
          <svg
            width={beePx[size]}
            height={beePx[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="anim-ls-wings">
              <ellipse cx="34" cy="32" rx="14" ry="24" fill="#FEF3C7" fillOpacity="0.92"
                stroke="#F5C22B" strokeWidth="1.5" transform="rotate(-30 34 32)" />
              <ellipse cx="66" cy="32" rx="14" ry="24" fill="#FEF3C7" fillOpacity="0.92"
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

      {/* Message */}
      <span className="text-[12px] font-semibold tracking-wide text-slate-400 font-sans">
        {message}
      </span>
    </div>
  );
};
