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

      const duration = newToast.duration ?? (newToast.description ? 5000 : 4000);
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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 w-full max-w-md px-4 pointer-events-none">
      {toasts.map((t) => {
        let Icon = Info;
        let iconContainerClass = "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.25)]";
        let cardBorderClass = "border-sky-500/20";
        
        if (t.type === "success") {
          Icon = CheckCircle2;
          iconContainerClass = "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.25)]";
          cardBorderClass = "border-emerald-500/20";
        } else if (t.type === "error") {
          Icon = AlertCircle;
          iconContainerClass = "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 shadow-[0_0_12px_rgba(251,113,133,0.25)]";
          cardBorderClass = "border-rose-500/20";
        }

        const isMultiLine = Boolean(t.description);

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 w-full p-3.5 bg-slate-900/95 backdrop-blur-xl border shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-top-4",
              isMultiLine ? "rounded-2xl" : "rounded-full py-2.5 items-center",
              cardBorderClass
            )}
          >
            <div className={cn("p-1.5 rounded-full flex-shrink-0 mt-0.5", iconContainerClass, !isMultiLine && "mt-0")}>
              <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-[13px] font-semibold text-white leading-tight tracking-wide">
                {t.title}
              </h4>
              {t.description && (
                <p className="text-xs text-slate-300 font-normal leading-relaxed mt-0.5">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 active:scale-90 flex-shrink-0"
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

