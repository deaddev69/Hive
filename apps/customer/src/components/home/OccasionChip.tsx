import React from "react";
import { cn } from "@hive/ui";

export interface OccasionChipProps {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}

export const OccasionChip: React.FC<OccasionChipProps> = ({
  id,
  label,
  icon,
  isActive,
  onClick,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      aria-pressed={isActive}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-full border cursor-pointer select-none outline-none transition-all duration-300 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2",
        isActive
          ? "bg-hive-gold text-hive-dark border-hive-amber/30 shadow-md shadow-hive-gold/15 font-bold"
          : "bg-[#FFFDF5] text-hive-text border-hive-border/60 hover:bg-hive-comb/30 hover:border-hive-gold/45"
      )}
    >
      {/* Honeycomb Clip-path Hexagon for Icon */}
      <div
        className={cn(
          "w-7 h-7 flex items-center justify-center text-sm transition-colors duration-300 [clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]",
          isActive
            ? "bg-hive-dark text-hive-gold"
            : "bg-hive-comb/60 text-hive-amber group-hover:bg-hive-comb"
        )}
      >
        <span>{icon}</span>
      </div>

      <span className="text-sm tracking-wide font-sans">{label}</span>
    </div>
  );
};
