import React from "react";
import { cn } from "../utils/cn";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "./Card";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number; // percentage change, e.g. +12.4 or -3.2
  timeframe?: string; // e.g. "vs last month"
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  className,
  title,
  value,
  change,
  timeframe = "vs last month",
  icon,
  ...props
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn("bg-white border-hive-border h-full flex flex-col", className)} {...props}>
      <CardContent className="p-4 sm:p-6 flex flex-col justify-between flex-1">
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-hive-text-muted leading-tight">
            {title}
          </span>
          {icon && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-hive-cream border border-hive-border flex items-center justify-center text-hive-gold shrink-0">
              {icon}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-hive-text">
            {value}
          </span>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md",
                  isPositive
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(change)}%
              </span>
              <span className="text-hive-text-muted">{timeframe}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
