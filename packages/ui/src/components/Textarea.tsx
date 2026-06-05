import React from "react";
import { cn } from "../utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-hive-text-muted">
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          className={cn(
            "w-full px-4 py-3 rounded-xl border border-hive-border text-hive-text bg-white text-sm placeholder-slate-400 transition-all duration-200 outline-none focus:border-hive-gold focus:ring-1 focus:ring-hive-gold disabled:pointer-events-none disabled:opacity-50 resize-y",
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
Textarea.displayName = "Textarea";
