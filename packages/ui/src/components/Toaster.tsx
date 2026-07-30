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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 w-max max-w-[90vw] pointer-events-none">
      {toasts.map((t) => {
        let Icon = Info;
        let iconContainerClass = "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.2)]";
        
        if (t.type === "success") {
          Icon = CheckCircle2;
          iconContainerClass = "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]";
        } else if (t.type === "error") {
          Icon = AlertCircle;
          iconContainerClass = "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 shadow-[0_0_10px_rgba(251,113,133,0.2)]";
        }

        return (
          <div
            key={t.id}
            className="flex items-center gap-3 p-2.5 pr-4 rounded-full bg-[#121212]/95 backdrop-blur-xl border border-white/[0.08] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.4)] pointer-events-auto transition-all duration-400 ease-out animate-in fade-in zoom-in-95 slide-in-from-top-6"
          >
            <div className={cn("p-1.5 rounded-full flex-shrink-0", iconContainerClass)}>
              <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div className="text-[13px] font-sans font-medium tracking-wide text-stone-200">
              {t.message}
            </div>
            <div className="w-px h-4 bg-white/10 mx-1 rounded-full" />
            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 active:scale-90"
            >
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
