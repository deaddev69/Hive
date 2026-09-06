"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { cn } from "@hive/ui";
import { toast } from "@hive/utils";

export function PwaUpdateManager() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const handleApplyUpdate = useCallback(() => {
    setIsUpdating(true);
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      waitingWorkerRef.current.postMessage("SKIP_WAITING");
    } else if (registrationRef.current && registrationRef.current.waiting) {
      registrationRef.current.waiting.postMessage({ type: "SKIP_WAITING" });
      registrationRef.current.waiting.postMessage("SKIP_WAITING");
    } else {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    const onControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.ready.then((reg) => {
      registrationRef.current = reg;

      // Check if there is already a waiting worker
      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setShowUpdate(true);
      }

      // Listen for new workers discovered during lifecycle
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorkerRef.current = newWorker;
            setShowUpdate(true);
          }
        });
      });

      // Active Foreground check when user switches back to the PWA
      const checkForUpdate = () => {
        reg.update().catch(() => {
          // Ignore network errors while offline
        });
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          checkForUpdate();
        }
      };

      const onWindowFocus = () => {
        checkForUpdate();
      };

      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("focus", onWindowFocus);

      // Periodic check every 5 minutes while active
      const intervalId = setInterval(checkForUpdate, 5 * 60 * 1000);

      // Initial check on mount
      checkForUpdate();

      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("focus", onWindowFocus);
        clearInterval(intervalId);
      };
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm animate-in slide-in-from-top-5 duration-300 select-none">
      <div className="bg-[#FDFBF7]/95 dark:bg-stone-900/95 border border-stone-200/80 dark:border-stone-800 p-4 rounded-2xl shadow-[0_20px_45px_-12px_rgba(26,18,0,0.18)] backdrop-blur-xl flex flex-col gap-3.5 relative overflow-hidden">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 pr-2">
              <span className="font-serif text-[15px] font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-none">
                Hive Refined
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                A refreshed shopping experience is ready for you.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUpdate(false)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>

        <div className="flex items-center justify-end pt-0.5">
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="w-full sm:w-auto px-5 py-2 bg-stone-950 hover:bg-stone-800 dark:bg-hive-gold dark:hover:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold rounded-full shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isUpdating && "animate-spin")} />
            <span>{isUpdating ? "Refreshing..." : "Refresh Experience"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
