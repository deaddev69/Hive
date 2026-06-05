import React from "react";
import { cn } from "../utils/cn";
import { Inbox } from "lucide-react";
import { Button, type ButtonProps } from "./Button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    buttonProps?: ButtonProps;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  title,
  description,
  icon,
  action,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center min-h-[300px] border border-dashed border-hive-border rounded-3xl bg-hive-cream/10 max-w-md mx-auto w-full",
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-2xl bg-hive-comb flex items-center justify-center text-hive-gold mb-4 border border-hive-border/60">
        {icon ? icon : <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-lg font-bold text-hive-text mb-1.5">{title}</h3>
      <p className="text-xs text-hive-text-muted mb-6 max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="primary" size="sm" {...action.buttonProps}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
