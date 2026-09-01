"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
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
    <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm animate-in slide-in-from-top-5 duration-300">
      <div className="bg-white px-4 py-3.5 rounded-2xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-3 backdrop-blur-md">
        
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-hive-gold/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-hive-gold" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-[15px] font-bold text-slate-900 leading-tight">
              Update Available
            </span>
            <span className="text-sm text-slate-500 mt-0.5 leading-snug">
              A new version of Hive is ready. Reload to get the latest features.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowUpdate(false)}
            className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Later
          </button>
          
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            <span>{isUpdating ? "Updating..." : "Reload App"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
