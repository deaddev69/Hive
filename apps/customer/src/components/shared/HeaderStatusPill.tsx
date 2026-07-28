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
        "bg-[#111111] dark:bg-black border border-neutral-800 dark:border-neutral-900/60",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <div className="relative flex items-center justify-center gap-1.5 w-full h-full">
        {children}
      </div>
    </div>
  );
};
