"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/api";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("hive_pwa_device_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("hive_pwa_device_id", id);
  }
  return id;
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export function useTrackPWAInstall() {
  const recordInstall = useMutation(api.pwaAnalytics.recordPWAInstall);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const deviceId = getDeviceId();
    const platform = detectPlatform();
    const userAgent = navigator.userAgent;

    const sendReport = () => {
      recordInstall({ deviceId, platform, userAgent }).catch((err) =>
        console.warn("[PWA Analytics] Failed to record install:", err)
      );
    };

    // Case 1: Listener for immediate install action on Android/Desktop
    const handleAppInstalled = () => {
      console.log("[PWA Analytics] appinstalled event fired!");
      sendReport();
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Case 2: User opens app in standalone window (covers iOS Safari & past installs)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      sendReport();
    }

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [recordInstall]);
}
