"use client";

import React, { useMemo } from "react";
import { cn } from "../utils/cn";

export interface TextEffectProps {
  children: string;
  per?: "char" | "word";
  preset?: "fade" | "slide" | "scale";
  delay?: number; // Initial delay in ms
  stagger?: number; // Delay between characters/words in ms
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
}

export const TextEffect: React.FC<TextEffectProps> = ({
  children,
  per = "word",
  preset = "fade",
  delay = 0,
  stagger,
  className,
  as: Component = "span",
}) => {
  const defaultStagger = per === "char" ? 25 : 60;
  const itemStagger = stagger ?? defaultStagger;

  const items = useMemo(() => {
    if (!children) return [];
    if (per === "char") {
      return children.split("");
    }
    // Split into words while keeping whitespace
    return children.split(/(\s+)/);
  }, [children, per]);

  if (!children) return null;

  return (
    <Component className={cn("inline-wrap select-none", className)}>
      {items.map((item, index) => {
        // If it's pure whitespace, render it directly to preserve layout
        if (/^\s+$/.test(item)) {
          return <span key={index}>{item}</span>;
        }

        const itemDelay = delay + index * itemStagger;

        return (
          <span
            key={index}
            className={cn(
              "inline-block animate-text-effect fill-mode-forwards",
              preset === "fade" && "opacity-0",
              preset === "slide" && "opacity-0 translate-y-1.5",
              preset === "scale" && "opacity-0 scale-95"
            )}
            style={{
              animationDelay: `${itemDelay}ms`,
              animationDuration: "400ms",
              animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              animationFillMode: "forwards",
            }}
          >
            {item}
          </span>
        );
      })}

      <style jsx global>{`
        @keyframes textEffectFade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-text-effect {
          animation-name: textEffectFade;
        }
      `}</style>
    </Component>
  );
};
