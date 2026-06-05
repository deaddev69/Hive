import React from "react";
import { cn } from "../utils/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, options = [], children, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-hive-text-muted">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            id={id}
            ref={ref}
            className={cn(
              "w-full h-11 pl-4 pr-10 rounded-xl border border-hive-border text-hive-text bg-white text-sm transition-all duration-200 outline-none focus:border-hive-gold focus:ring-1 focus:ring-hive-gold disabled:pointer-events-none disabled:opacity-50 appearance-none",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              className
            )}
            {...props}
          >
            {children ? children : options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom dropdown caret */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-hive-text-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
