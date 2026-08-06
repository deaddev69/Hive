"use client";

import React, { useState, useEffect } from "react";
import { toast, ToastEvent } from "@hive/utils";
import { CheckCircle2, AlertCircle, Sparkles, X } from "lucide-react";
import { cn } from "../utils/cn";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      const duration = newToast.duration ?? (newToast.description ? 5500 : 4200);
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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 w-full max-w-sm px-4 pointer-events-none font-sans">
      {toasts.map((t) => {
        let Icon = Sparkles;
        let iconContainerClass = "text-slate-400";
        
        if (t.type === "success") {
          Icon = CheckCircle2;
          iconContainerClass = "text-emerald-500";
        } else if (t.type === "error") {
          Icon = AlertCircle;
          iconContainerClass = "text-rose-500";
        }

        const isMultiLine = Boolean(t.description);

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 w-full p-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 pointer-events-auto transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in zoom-in-95 slide-in-from-top-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
              isMultiLine ? "rounded-2xl" : "rounded-full items-center py-2.5 px-4"
            )}
          >
            <div className={cn("flex-shrink-0 mt-0.5", iconContainerClass, !isMultiLine && "mt-0")}>
              <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug tracking-tight">
                {t.title}
              </h4>
              {t.description && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 flex-shrink-0"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

