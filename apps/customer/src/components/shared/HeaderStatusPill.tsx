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
        "relative h-11 px-4 rounded-xl flex items-center justify-center select-none transition-all duration-300",
        "bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800/80",
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
