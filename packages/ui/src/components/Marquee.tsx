"use client";

import React from "react";
import { cn } from "../utils/cn";

export interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  speedSeconds?: number;
  gap?: string;
  maskGradients?: boolean;
}

/**
 * Accessible Infinite Scrolling Marquee
 *
 * Features:
 * - Seamless looping with duplicate track
 * - Pause on :hover and :focus-within for keyboard accessibility
 * - Full prefers-reduced-motion fallback
 * - Edge fade masks with pointer-events-none
 */
export const Marquee: React.FC<MarqueeProps> = ({
  children,
  className = "",
  reverse = false,
  pauseOnHover = true,
  speedSeconds = 35,
  gap = "1.5rem",
  maskGradients = true,
}) => {
  return (
    <div className={cn("relative w-full overflow-hidden select-none", className)}>
      {/* Edge Soft Fades */}
      {maskGradients && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 sm:w-28 bg-gradient-to-r from-hive-cream via-hive-cream/60 to-transparent dark:from-neutral-950 dark:via-neutral-950/60" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 sm:w-28 bg-gradient-to-l from-hive-cream via-hive-cream/60 to-transparent dark:from-neutral-950 dark:via-neutral-950/60" />
        </>
      )}

      {/* Marquee Track Container */}
      <div
        className={cn(
          "marquee-container group flex w-max",
          pauseOnHover && "hover:[&>.marquee-track]:[animation-play-state:paused]",
          "focus-within:[&>.marquee-track]:[animation-play-state:paused]"
        )}
        style={{ gap }}
      >
        <div
          className={cn(
            "marquee-track flex shrink-0 items-center",
            reverse ? "animate-marquee-reverse" : "animate-marquee"
          )}
          style={{
            gap,
            animationDuration: `${speedSeconds}s`,
          }}
        >
          {children}
        </div>

        {/* Duplicate Track for seamless infinite loop */}
        <div
          aria-hidden="true"
          className={cn(
            "marquee-track flex shrink-0 items-center",
            reverse ? "animate-marquee-reverse" : "animate-marquee"
          )}
          style={{
            gap,
            animationDuration: `${speedSeconds}s`,
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes marqueeAnim {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(calc(-100% - ${gap}), 0, 0);
          }
        }
        @keyframes marqueeReverseAnim {
          0% {
            transform: translate3d(calc(-100% - ${gap}), 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-marquee {
          animation: marqueeAnim linear infinite;
          will-change: transform;
        }
        .animate-marquee-reverse {
          animation: marqueeReverseAnim linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee,
          .animate-marquee-reverse {
            animation: none !important;
            transform: none !important;
          }
          .marquee-container {
            overflow-x: auto !important;
            max-width: 100% !important;
            padding-bottom: 0.75rem;
            scroll-behavior: smooth;
          }
        }
      `}</style>
    </div>
  );
};
