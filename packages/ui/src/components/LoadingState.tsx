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
  const iconSizes = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };

  const beeSizes = {
    sm: 28,
    md: 42,
    lg: 58,
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center select-none font-sans",
        variant === "full" ? "min-h-[65vh] w-full" : "min-h-[160px]",
        className
      )}
    >
      {/* Keyframe animations for wing flutter & gentle float */}
      <style>{`
        @keyframes miniWingFlutter {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          50% { transform: rotate(20deg) scaleY(0.6); }
        }
        @keyframes miniBeeFloat {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        .animate-mini-wings {
          animation: miniWingFlutter 0.15s infinite ease-in-out;
          transform-origin: bottom center;
        }
        .animate-mini-float {
          animation: miniBeeFloat 2.2s infinite ease-in-out;
        }
      `}</style>

      {/* Honeycomb Glow Ring Container */}
      <div className={cn("relative flex items-center justify-center mb-3", iconSizes[size])}>
        {/* Soft Ambient Pulsing Ring */}
        <div className="absolute inset-0 rounded-full bg-[#F5C22B]/20 blur-md animate-pulse" />
        <div className="absolute inset-0 rounded-full border border-[#F5C22B]/40 animate-ping opacity-20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[#F5C22B] border-r-[#F5C22B]/30 border-b-[#F5C22B]/10 border-l-[#F5C22B]/30 animate-spin duration-1000" />

        {/* Flying Bee SVG */}
        <div className="animate-mini-float relative z-10 flex items-center justify-center">
          <svg
            width={beeSizes[size]}
            height={beeSizes[size]}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left & Right Wings */}
            <g className="animate-mini-wings">
              <ellipse cx="34" cy="32" rx="14" ry="24" fill="#F0E4C8" fillOpacity="0.8" stroke="#F5C22B" strokeWidth="1.5" transform="rotate(-30 34 32)" />
              <ellipse cx="66" cy="32" rx="14" ry="24" fill="#F0E4C8" fillOpacity="0.8" stroke="#F5C22B" strokeWidth="1.5" transform="rotate(30 66 32)" />
            </g>

            {/* Bee Body */}
            <ellipse cx="50" cy="58" rx="28" ry="34" fill="#F5C22B" />

            {/* Charcoal Stripes */}
            <path d="M26 50 C38 46, 62 46, 74 50 C72 56, 68 60, 50 60 C32 60, 28 56, 26 50 Z" fill="#1A1200" />
            <path d="M28 66 C38 62, 62 62, 72 66 C70 72, 64 76, 50 76 C36 76, 30 72, 28 66 Z" fill="#1A1200" />

            {/* Head & Eyes */}
            <circle cx="50" cy="30" r="15" fill="#1A1200" />
            <circle cx="44" cy="27" r="3.5" fill="#FFFFFF" />
            <circle cx="56" cy="27" r="3.5" fill="#FFFFFF" />
            <circle cx="45" cy="28" r="1.5" fill="#1A1200" />
            <circle cx="57" cy="28" r="1.5" fill="#1A1200" />

            {/* Antennae */}
            <path d="M44 18 C40 10, 36 10, 34 12" stroke="#1A1200" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M56 18 C60 10, 64 10, 66 12" stroke="#1A1200" strokeWidth="2.5" strokeLinecap="round" />

            {/* Stinger */}
            <polygon points="50,92 46,86 54,86" fill="#D9A71E" />
          </svg>
        </div>
      </div>

      {/* Message Label */}
      <span className="text-xs font-bold tracking-wide text-slate-700 font-sans animate-pulse">
        {message}
      </span>
    </div>
  );
};
