"use client";

import React, { useState, useEffect } from "react";
import { toast, ToastEvent } from "@hive/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      const duration = newToast.duration ?? 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, duration);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none md:max-w-md">
      {toasts.map((t) => {
        let Icon = Info;
        let borderClass = "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/90 dark:text-sky-200";
        let iconClass = "text-sky-500";
        
        if (t.type === "success") {
          Icon = CheckCircle2;
          borderClass = "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-200";
          iconClass = "text-emerald-500";
        } else if (t.type === "error") {
          Icon = AlertCircle;
          borderClass = "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/90 dark:text-rose-200";
          iconClass = "text-rose-500";
        }

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm pointer-events-auto transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 md:slide-in-from-right-4",
              borderClass
            )}
          >
            <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconClass)} />
            <div className="flex-1 text-sm font-medium leading-5">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
