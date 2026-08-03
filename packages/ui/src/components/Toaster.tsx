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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 w-full max-w-md px-4 pointer-events-none font-sans">
      {toasts.map((t) => {
        let Icon = Sparkles;
        let iconContainerClass = "bg-[#E8890C]/15 text-[#E8890C] ring-1 ring-[#E8890C]/40 shadow-[0_0_12px_rgba(232,137,12,0.3)]";
        let cardBorderClass = "border-[#d4af37]/35 shadow-[0_20px_45px_-10px_rgba(26,18,0,0.85),0_0_20px_rgba(212,175,55,0.15)]";
        
        if (t.type === "success") {
          Icon = CheckCircle2;
          iconContainerClass = "bg-[#d4af37]/15 text-[#d4af37] ring-1 ring-[#d4af37]/45 shadow-[0_0_12px_rgba(212,175,55,0.3)]";
          cardBorderClass = "border-[#d4af37]/40 shadow-[0_20px_45px_-10px_rgba(26,18,0,0.85),0_0_22px_rgba(212,175,55,0.18)]";
        } else if (t.type === "error") {
          Icon = AlertCircle;
          iconContainerClass = "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/35 shadow-[0_0_12px_rgba(251,113,133,0.3)]";
          cardBorderClass = "border-rose-500/30 shadow-[0_20px_45px_-10px_rgba(26,18,0,0.85),0_0_20px_rgba(244,63,94,0.15)]";
        }

        const isMultiLine = Boolean(t.description);

        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3.5 w-full p-4 bg-[#1A1200]/95 backdrop-blur-xl border pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95 slide-in-from-top-4",
              isMultiLine ? "rounded-2xl" : "rounded-full py-2.5 px-4 items-center",
              cardBorderClass
            )}
          >
            <div className={cn("p-1.5 rounded-full flex-shrink-0 mt-0.5", iconContainerClass, !isMultiLine && "mt-0")}>
              <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-[13.5px] font-bold text-white leading-snug tracking-wide">
                {t.title}
              </h4>
              {t.description && (
                <p className="text-[12px] text-[#F0E4C8]/90 font-normal leading-relaxed mt-0.5">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#F0E4C8]/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 active:scale-90 flex-shrink-0"
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

