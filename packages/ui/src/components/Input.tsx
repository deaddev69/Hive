import React from "react";
import { cn } from "../utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-hive-text-muted">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            "w-full h-11 px-4 rounded-xl border border-hive-border text-hive-text bg-white text-sm placeholder-slate-400 transition-all duration-200 outline-none focus:border-hive-gold focus:ring-1 focus:ring-hive-gold disabled:pointer-events-none disabled:opacity-50",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
