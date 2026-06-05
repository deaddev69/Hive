import React from "react";
import { cn } from "../utils/cn";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[200px] gap-3", className)}>
      <Loader2 className="w-8 h-8 animate-spin text-hive-gold" />
      <span className="text-sm font-semibold tracking-wide text-hive-text-muted">
        {message}
      </span>
    </div>
  );
};
