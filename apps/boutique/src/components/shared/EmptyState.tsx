"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { Button, Card } from "@hive/ui";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
  onClick?: () => void;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionHref,
  onClick,
}: EmptyStateProps) {
  return (
    <Card className="border border-hive-border bg-white shadow-sm rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full">
      <div className="w-16 h-16 rounded-2xl bg-hive-cream border border-hive-border flex items-center justify-center text-hive-amber mb-6 animate-pulse-soft">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-bold text-hive-dark tracking-tight mb-2 font-sans">
        {title}
      </h3>
      <p className="text-sm text-hive-text-muted leading-relaxed font-medium mb-6 max-w-sm font-sans">
        {description}
      </p>
      {actionLabel && (
        onClick ? (
          <Button onClick={onClick} variant="primary" className="py-2.5 px-6 rounded-xl text-xs font-bold shadow-md shadow-hive-gold/15">
            {actionLabel}
          </Button>
        ) : actionHref ? (
          <a href={actionHref}>
            <Button variant="primary" className="py-2.5 px-6 rounded-xl text-xs font-bold shadow-md shadow-hive-gold/15">
              {actionLabel}
            </Button>
          </a>
        ) : null
      )}
    </Card>
  );
}
