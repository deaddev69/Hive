"use client";
import React from "react";
import { cn } from "@hive/ui";

interface HeaderStatusPillProps {
  children: React.ReactNode;
  className?: string;
}

export const HeaderStatusPill: React.FC<HeaderStatusPillProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "relative h-9 px-3 rounded-xl flex items-center justify-center select-none transition-all duration-300",
        "bg-[#FBF8F1] dark:bg-neutral-900/50 border border-[#E8D9AF]/33 dark:border-neutral-800/40",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="relative flex items-center justify-center gap-1.5 w-full h-full">
        {children}
      </div>
    </div>
  );
};
