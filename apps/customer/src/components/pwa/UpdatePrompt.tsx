"use client";

import { useEffect, useState } from "react";
import { toast } from "@hive/utils";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@hive/ui";

export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [wb, setWb] = useState<any>(null);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (window as any).workbox !== undefined
    ) {
      const workbox = (window as any).workbox;

      const handleWaiting = (event: any) => {
        setNeedRefresh(true);
        setWb(workbox);
      };

      workbox.addEventListener("waiting", handleWaiting);

      // Clean up
      return () => {
        workbox.removeEventListener("waiting", handleWaiting);
      };
    }
  }, []);

  useEffect(() => {
    if (needRefresh && wb) {
      toast(
        (t) => (
          <div className="flex flex-col gap-3 p-1">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-full shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-[15px]">Update Available</h3>
                <p className="text-slate-500 text-sm mt-0.5 leading-snug">
                  A new version of Hive is ready. Reload to get the latest features and bug fixes.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.dismiss(t.id)}
                className="h-8 px-3 text-xs"
              >
                Later
              </Button>
              <Button
                size="sm"
                className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                disabled={isReloading}
                onClick={() => {
                  setIsReloading(true);
                  wb.messageSkipWaiting();
                  toast.dismiss(t.id);
                  // Give it a tiny bit of time before reload
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
              >
                {isReloading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                Reload App
              </Button>
            </div>
          </div>
        ),
        {
          duration: Infinity, // Persistent
          position: "top-center",
          style: {
            maxWidth: "400px",
            padding: "16px",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(0,0,0,0.05)"
          }
        }
      );
    }
  }, [needRefresh, wb, isReloading]);

  return null;
}
