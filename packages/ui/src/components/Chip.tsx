import React from "react";
import { cn } from "../utils/cn";
import { X } from "lucide-react";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
  onRemove?: () => void;
}

export const Chip: React.FC<ChipProps> = ({
  className,
  isActive = false,
  onRemove,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer select-none",
        isActive
          ? "bg-hive-gold border-hive-gold text-hive-dark"
          : "bg-white border-hive-border text-hive-text hover:bg-hive-cream hover:border-hive-gold/40",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "p-0.5 rounded-full hover:bg-black/10 transition-colors",
            isActive ? "text-hive-dark" : "text-hive-text-muted hover:text-hive-text"
          )}
          aria-label="Remove filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
