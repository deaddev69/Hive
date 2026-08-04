"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, Volume2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@hive/ui";
import { Id } from "../../../../convex/_generated/dataModel";

interface PushNotificationManagerProps {
  boutiqueId?: Id<"boutiques">;
  userId?: Id<"users">;
}

/**
 * Utility to convert base64 VAPID key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({
  boutiqueId,
  userId,
}: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const saveSubscription = useMutation(api.pushNotifications.savePushSubscription);

  const playOrderChime = useCallback(() => {
    try {
      const mp3Audio = new Audio("/sounds/order-chime.mp3");
      mp3Audio.volume = 1.0;
      mp3Audio.play().catch((err) => {
        console.log("Audio autoplay prevented or error playing mp3 sound, trying wav fallback:", err);
        const wavAudio = new Audio("/sounds/order-chime.wav");
        wavAudio.volume = 1.0;
        wavAudio.play().catch((e) => console.log("Wav fallback audio play error:", e));
      });
    } catch (e) {
      console.error("Failed to play order chime audio:", e);
    }
  }, []);

  // Real-time Convex order count listener (chimes when a new order arrives in DB)
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const prevOrderCountRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (orders !== undefined) {
      if (prevOrderCountRef.current !== null && orders.length > prevOrderCountRef.current) {
        console.log("[PushNotificationManager] New order detected via real-time query! Playing chime...");
        playOrderChime();
      }
      prevOrderCountRef.current = orders.length;
    }
  }, [orders, playOrderChime]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          }
        });
      });

      const messageListener = (event: MessageEvent) => {
        if (event.data && event.data.type === "PLAY_ORDER_CHIME") {
          console.log("[PushNotificationManager] Received PLAY_ORDER_CHIME postMessage from SW!");
          playOrderChime();
        }
      };
      navigator.serviceWorker.addEventListener("message", messageListener);
      return () => {
        navigator.serviceWorker.removeEventListener("message", messageListener);
      };
    }
  }, [playOrderChime]);

  const handleSubscribe = async () => {
    if (!isSupported) {
      alert("Push notifications are not supported by this browser.");
      return;
    }

    if (!boutiqueId || !userId) {
      console.warn("[PushNotificationManager] Missing boutiqueId or userId");
      return;
    }

    try {
      setLoading(true);

      // Unlock AudioContext immediately upon user interaction by playing a silent buffer
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.001);
        }
      } catch (e) {
        console.warn("Failed to unlock AudioContext:", e);
      }

      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);

      if (requestedPermission !== "granted") {
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error(
          "[PushNotificationManager] NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing. Subscriptions cannot be generated."
        );
        alert("Server configuration error: Missing VAPID Public Key.");
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });

      // Save subscription to Convex DB
      await saveSubscription({
        boutiqueId,
        userId,
        subscription: JSON.parse(JSON.stringify(subscription)),
      });

      setIsSubscribed(true);
      setShowSuccessToast(true);
      playOrderChime();
    } catch (err) {
      console.error("[PushNotificationManager] Error subscribing to push:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Active Subscription Toast */}
      {isSubscribed && showSuccessToast && (
        <div className="fixed bottom-20 right-4 z-50 bg-emerald-900 text-emerald-100 border border-emerald-700/50 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-white">Order Sound Alerts Active 🔔</p>
            <p className="text-emerald-200/80">Instant chime alerts active for new orders.</p>
          </div>
          <button
            onClick={() => playOrderChime()}
            className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg text-[10px] font-bold transition-colors ml-1 border border-emerald-600/40 shrink-0"
          >
            Test Sound 🔊
          </button>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="text-emerald-300 hover:text-white ml-1 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscription Banner */}
      {!isSubscribed && !dismissed && isSupported && permission !== "denied" && (
        <div className="mx-4 my-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-500 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                Enable Instant Order Sound Alerts
                <span className="bg-amber-500/20 text-amber-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Get instant loud chimes and vibration alerts when a customer places an order — even when your screen is locked.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => playOrderChime()}
              className="px-2.5 py-1.5 text-xs text-amber-700 hover:text-amber-900 font-semibold transition-colors bg-amber-100/50 hover:bg-amber-100 rounded-xl border border-amber-300/50 flex items-center gap-1"
            >
              Test 🔊
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Dismiss
            </button>
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-sm text-xs rounded-xl flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              {loading ? "Enabling..." : "Turn On Alerts"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
