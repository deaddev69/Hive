"use client";

import React from "react";
import { cn } from "@hive/ui";

export interface DeliveryStatusProps {
  promise?: string; // e.g. "Today" | "Tomorrow"
  time?: string;    // e.g. "12 PM" | "5 PM" | "Express"
  variant?: "express" | "scheduled" | "standard";
  animate?: boolean; // true for Header/Checkout/Tracking, false for dense lists
  className?: string;
}

/**
 * Minimal Monoline Scooter Icon (Lucide-quality, 16-18px)
 * Outer frame & tire rings stay 100% stationary.
 * Only the inner wheel spokes perform a subtle 800ms rotation every 8 seconds.
 */
function MonolineDeliveryScooter({ animate = true }: { animate?: boolean }) {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 22 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-amber-800 dark:text-amber-200"
    >
      {/* Bike Chassis & Rider Line Art */}
      <path
        d="M2 13h2.5M7.5 13h6M19 13h1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Front & Rear Main Frames */}
      <path
        d="M6 13L8 7h5.5l2 6M13.5 7l2-4.5h2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cargo Box on Back */}
      <rect
        x="3"
        y="4"
        width="5"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.12"
      />
      {/* Rider Helmet / Handlebar dot */}
      <circle cx="11.5" cy="4" r="1.2" stroke="currentColor" strokeWidth="1.1" />

      {/* Stationary Outer Tires */}
      <circle cx="6" cy="13" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17.5" cy="13" r="2.2" stroke="currentColor" strokeWidth="1.3" />

      {/* Rotating Inner Spokes (Rear Wheel) */}
      <g
        className={animate ? "animate-spoke-spin" : ""}
        style={{ transformOrigin: "6px 13px" }}
      >
        <line x1="6" y1="11.4" x2="6" y2="14.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="4.4" y1="13" x2="7.6" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Rotating Inner Spokes (Front Wheel) */}
      <g
        className={animate ? "animate-spoke-spin" : ""}
        style={{ transformOrigin: "17.5px 13px" }}
      >
        <line x1="17.5" y1="11.4" x2="17.5" y2="14.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="15.9" y1="13" x2="19.1" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </g>

      <style jsx>{`
        @keyframes periodicSpokeSpin {
          0% {
            transform: rotate(0deg);
          }
          10% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spoke-spin {
          animation: periodicSpokeSpin 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </svg>
  );
}

export const DeliveryStatus: React.FC<DeliveryStatusProps> = ({
  promise = "Today",
  time = "12 PM",
  variant = "express",
  animate = true,
  className,
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 select-none font-sans transition-all duration-300",
        className
      )}
    >
      {/* Minimalist Monoline Scooter Icon */}
      <MonolineDeliveryScooter animate={animate} />

      {/* Delivery Promise Label */}
      <span className="text-[11px] font-medium tracking-wide text-stone-600 dark:text-neutral-300">
        {promise}
      </span>

      <span className="text-stone-300 dark:text-neutral-700 font-normal select-none">•</span>

      {/* Soft Amber Time Capsule */}
      <span
        className={cn(
          "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-normal transition-colors select-none",
          "bg-[#F8E8BE] text-[#78350F] dark:bg-amber-900/40 dark:text-amber-200 border border-[#F4E6C3] dark:border-amber-700/50"
        )}
      >
        {time}
      </span>
    </div>
  );
};
