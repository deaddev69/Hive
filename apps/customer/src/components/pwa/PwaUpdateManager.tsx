"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";

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
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3 backdrop-blur-md">
        
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#F5C22B]/20 text-[#F5C22B] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight text-white truncate">
              Update Available
            </span>
            <span className="text-[10px] text-slate-400 font-medium truncate">
              A newer version of Hive is ready
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-3.5 py-1.5 bg-[#F5C22B] hover:bg-[#E9B929] text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${isUpdating ? "animate-spin" : ""}`} />
            <span>{isUpdating ? "Updating..." : "Reload"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUpdate(false)}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Dismiss update banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
