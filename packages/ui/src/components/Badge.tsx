import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border transition-all duration-200",
  {
    variants: {
      variant: {
        primary: "bg-hive-comb border-hive-gold text-hive-text",
        secondary: "bg-slate-100 border-slate-200 text-slate-700",
        success: "bg-green-50 border-green-200 text-green-700",
        danger: "bg-red-50 border-red-200 text-red-700",
        warning: "bg-amber-50 border-amber-200 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
};
