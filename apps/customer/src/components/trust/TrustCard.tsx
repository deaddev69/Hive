import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@hive/ui";

export interface TrustCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

export const TrustCard: React.FC<TrustCardProps> = ({
  title,
  description,
  icon: Icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-6 rounded-[28px] border border-hive-border/60 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start gap-4 group text-left w-full",
        className
      )}
    >
      {/* Icon Circle */}
      <div className="w-12 h-12 rounded-2xl bg-hive-comb/30 border border-hive-border/50 flex items-center justify-center text-hive-amber group-hover:scale-105 group-hover:bg-hive-comb/60 group-hover:text-hive-gold transition-all duration-300">
        <Icon className="w-5 h-5 stroke-[2.2]" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-serif font-extrabold text-hive-dark group-hover:text-hive-amber transition-colors duration-300">
          {title}
        </h3>
        <p className="text-xs text-hive-text-muted leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};
