"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

export interface AnimatedBackgroundProps {
  children: React.ReactNode;
  value?: string | number | null;
  defaultValue?: string | number | null;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  activeClassName?: string;
  enableHover?: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  children,
  value,
  defaultValue,
  onValueChange,
  className,
  activeClassName = "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm",
  enableHover = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalActiveId, setInternalActiveId] = useState<string | null>(
    (value !== undefined ? value : defaultValue) as string | null
  );
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [rect, setRect] = useState<{ left: number; width: number; height: number; top: number } | null>(null);

  const activeId = value !== undefined ? (value as string) : internalActiveId;
  const currentId = enableHover ? hoverId || activeId : activeId;

  useEffect(() => {
    if (!containerRef.current || !currentId) {
      setRect(null);
      return;
    }

    const container = containerRef.current;
    // Escape quotes or special characters for querySelector
    const safeId = String(currentId).replace(/"/g, '\\"');
    const activeElement = container.querySelector(`[data-id="${safeId}"]`) as HTMLElement;

    if (activeElement) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();

      setRect({
        left: elementRect.left - containerRect.left,
        top: elementRect.top - containerRect.top,
        width: elementRect.width,
        height: elementRect.height,
      });
    } else {
      setRect(null);
    }
  }, [currentId, children]);

  // Recalculate position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !currentId) return;
      const container = containerRef.current;
      const safeId = String(currentId).replace(/"/g, '\\"');
      const activeElement = container.querySelector(`[data-id="${safeId}"]`) as HTMLElement;
      if (activeElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = activeElement.getBoundingClientRect();
        setRect({
          left: elementRect.left - containerRect.left,
          top: elementRect.top - containerRect.top,
          width: elementRect.width,
          height: elementRect.height,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentId]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700/80 overflow-hidden", className)}
      onMouseLeave={() => enableHover && setHoverId(null)}
    >
      {/* Sliding Active Pill Indicator */}
      {rect && (
        <div
          className={cn(
            "absolute rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0",
            activeClassName
          )}
          style={{
            transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      )}

      {/* Render tab children */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        const childId = (child.props as any)["data-id"];
        const isChecked = String(childId) === String(activeId);

        return React.cloneElement(child as React.ReactElement<any>, {
          className: cn(
            "relative z-10 select-none transition-colors duration-200",
            isChecked ? "font-extrabold text-white dark:text-slate-900" : "font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white",
            (child.props as any).className
          ),
          "data-checked": isChecked,
          onMouseEnter: (e: React.MouseEvent) => {
            if (enableHover && childId) setHoverId(childId);
            if ((child.props as any).onMouseEnter) (child.props as any).onMouseEnter(e);
          },
          onClick: (e: React.MouseEvent) => {
            if (childId !== undefined && childId !== null) {
              setInternalActiveId(childId);
              onValueChange?.(childId);
            }
            if ((child.props as any).onClick) (child.props as any).onClick(e);
          },
        });
      })}
    </div>
  );
};
