"use client";

import React, { useEffect } from "react";
import { cn } from "../utils/cn";
import { X } from "lucide-react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer content surface */}
      <div
        className={cn(
          "absolute bg-white shadow-2xl flex flex-col h-full transition-transform duration-300 border-hive-border",
          side === "right" && "right-0 w-full max-w-md border-l",
          side === "left" && "left-0 w-full max-w-md border-r",
          side === "bottom" && "bottom-0 w-full h-[60vh] border-t rounded-t-[30px]",
          className
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-hive-border/60">
          <h2 className="text-lg font-bold text-hive-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-hive-cream transition-colors text-hive-text-muted hover:text-hive-text"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
