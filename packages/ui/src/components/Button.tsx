import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { Loader2 } from "lucide-react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-hive-gold text-hive-dark hover:bg-hive-amber shadow-sm shadow-hive-gold/10 hover:shadow-hive-amber/20",
        secondary: "bg-hive-comb text-hive-text hover:bg-hive-gold/20",
        outline: "border border-hive-border text-hive-text bg-white hover:bg-hive-cream hover:border-hive-gold/40",
        ghost: "text-hive-text hover:bg-hive-cream hover:text-hive-amber",
      },
      size: {
        sm: "h-9 px-3 rounded-lg text-xs",
        md: "h-11 px-5 rounded-xl text-sm",
        lg: "h-13 px-7 rounded-2xl text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
