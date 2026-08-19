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

  useEffect(() => {
    if (showUpdate) {
      toast(
        (t) => (
          <div className="flex flex-col gap-3 p-1">
            <div className="flex items-start gap-3">
              <div className="bg-[#F5C22B]/20 p-2 rounded-full shrink-0 flex items-center justify-center h-9 w-9">
                <Sparkles className="w-5 h-5 text-[#F5C22B]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-[15px]">Update Available</h3>
                <p className="text-slate-500 text-sm mt-0.5 leading-snug">
                  A new version of Hive is ready. Reload to get the latest features.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowUpdate(false);
                  toast.dismiss(t.id);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Later
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  handleApplyUpdate();
                  toast.dismiss(t.id);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
                {isUpdating ? "Updating..." : "Reload App"}
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: "top-center",
          style: {
            maxWidth: "400px",
            padding: "16px",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(0,0,0,0.05)"
          }
        }
      );
    }
  }, [showUpdate, isUpdating, handleApplyUpdate]);

  return null;
}
