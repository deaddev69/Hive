"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { BellRing, ShoppingBag, ArrowRight } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface PushNotificationManagerProps {
  boutiqueId?: Id<"boutiques">;
  userId?: Id<"users">;
}

interface AlarmPayload {
  title?: string;
  body?: string;
  orderNumber?: string;
  url?: string;
}

type AlertMode = "store" | "mobile";

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
  const router = useRouter();

  // Alert state & mode ("store" terminal vs "mobile" owner)
  const [isRinging, setIsRinging] = useState(false);
  const [alertMode, setAlertMode] = useState<AlertMode>("mobile");
  const [activeAlert, setActiveAlert] = useState<AlarmPayload | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const saveSubscription = useMutation(api.pushNotifications.savePushSubscription);

  // Sync mode with localStorage & listen for header changes
  const syncAlertMode = useCallback(() => {
    if (typeof window !== "undefined") {
      const savedMode = (localStorage.getItem("hive_alert_mode") as AlertMode) || "mobile";
      setAlertMode(savedMode === "store" ? "store" : "mobile");
    }
  }, []);

  useEffect(() => {
    syncAlertMode();
    window.addEventListener("hive_alert_mode_change", syncAlertMode);
    return () => {
      window.removeEventListener("hive_alert_mode_change", syncAlertMode);
    };
  }, [syncAlertMode]);

  // Web Audio Synthesizer Fallback (Alternating 880Hz / 1046Hz Siren for Store Mode)
  const startSynthesizedSiren = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      let highFreq = false;
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);

      sirenIntervalRef.current = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(highFreq ? 1046.5 : 880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        highFreq = !highFreq;
      }, 300);
    } catch (e) {
      console.error("Web Audio API synthesis failed:", e);
    }
  }, []);

  const stopOrderAlarm = useCallback(() => {
    setIsRinging(false);
    setActiveAlert(null);

    // Stop HTML5 Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop Synthesizer
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.suspend();
    }
  }, []);

  const startOrderAlarm = useCallback(
    (payload?: AlarmPayload) => {
      setIsRinging(true);
      if (payload) setActiveAlert(payload);

      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/order-chime.mp3");
      }

      audioRef.current.currentTime = 0;

      if (alertMode === "store") {
        // Endless loop for in-shop terminal
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => startSynthesizedSiren());
      } else {
        // Single chime for owner mobile phone (no looping)
        audioRef.current.loop = false;
        audioRef.current.play().catch(() => startSynthesizedSiren());
      }
    },
    [alertMode, startSynthesizedSiren]
  );

  const handleAcceptViewOrder = () => {
    stopOrderAlarm();
    router.push("/boutique/orders");
  };

  // Real-time Convex order count listener
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const prevOrderCountRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (orders !== undefined) {
      if (prevOrderCountRef.current !== null && orders.length > prevOrderCountRef.current) {
        console.log("[PushNotificationManager] New order detected via real-time query! Triggering alarm...");
        startOrderAlarm({
          title: "🚨 NEW ORDER RECEIVED!",
          body: `A new order has been placed on your store.`,
        });
      }
      prevOrderCountRef.current = orders.length;
    }
  }, [orders, startOrderAlarm]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      const messageListener = (event: MessageEvent) => {
        if (event.data?.type === "TRIGGER_ORDER_ALARM" || event.data?.type === "PLAY_ORDER_CHIME") {
          console.log("[PushNotificationManager] Received SW alarm event:", event.data);
          startOrderAlarm(event.data.payload);
        }
        if (event.data?.type === "STOP_ORDER_ALARM") {
          console.log("[PushNotificationManager] Received STOP_ORDER_ALARM event from lockscreen!");
          stopOrderAlarm();
        }
      };
      navigator.serviceWorker.addEventListener("message", messageListener);

      // Auto subscribe if granted
      if (Notification.permission === "granted" && boutiqueId && userId) {
        navigator.serviceWorker.ready.then(async (registration) => {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidPublicKey) {
            const existingSub = await registration.pushManager.getSubscription();
            if (!existingSub) {
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
              });
              await saveSubscription({
                boutiqueId,
                userId,
                subscription: JSON.parse(JSON.stringify(subscription)),
              }).catch(console.error);
            }
          }
        });
      }

      return () => {
        navigator.serviceWorker.removeEventListener("message", messageListener);
        stopOrderAlarm();
      };
    }
  }, [boutiqueId, userId, saveSubscription, startOrderAlarm, stopOrderAlarm]);

  return (
    <>
      {/* Dev / Staff Test Trigger */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() =>
            startOrderAlarm({
              title: "🚨 NEW ORDER RECEIVED!",
              body: "Order #HIVE-TEST-001 • 1 Item",
            })
          }
          className="bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-zinc-700 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Test Alarm 🚨</span>
        </button>
      </div>

      {/* Premium Swiggy/Zomato Partner Style Ringing Overlay (Full Viewport z-[100]) */}
      {isRinging && alertMode === "store" && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-950 via-red-950 to-slate-950 text-white flex flex-col items-center justify-between p-6 select-none overflow-hidden h-screen w-screen">
          {/* Top Status Tag */}
          <div className="pt-6 flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            Live Store Terminal Alarm
          </div>

          {/* Central Animated Radar & Icon */}
          <div className="flex flex-col items-center justify-center my-auto relative">
            <div className="absolute w-64 h-64 bg-red-500/20 rounded-full animate-ping pointer-events-none" />
            <div className="absolute w-48 h-48 bg-amber-500/10 rounded-full animate-pulse pointer-events-none" />

            <div className="relative w-28 h-28 bg-gradient-to-br from-red-500 to-amber-500 rounded-3xl p-0.5 shadow-2xl animate-bounce mb-6 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-amber-400" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-center text-white mb-2">
              {activeAlert?.title || "NEW ORDER RECEIVED!"}
            </h1>

            <p className="text-sm font-medium text-slate-300 text-center max-w-sm mb-4">
              {activeAlert?.body || "A customer just placed a new order."}
            </p>

            {/* Price Badge */}
            <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-2xl sm:text-3xl px-6 py-2.5 rounded-2xl shadow-xl border border-amber-200/50 mb-2">
              NEW ORDER 🛍️
            </div>
          </div>

          {/* Bottom Dual Action Buttons */}
          <div className="w-full max-w-md pb-6 flex flex-col gap-3">
            <button
              onClick={handleAcceptViewOrder}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
            >
              <span>Accept & View Order</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={stopOrderAlarm}
              className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl backdrop-blur-md border border-white/20 active:scale-95 transition-all text-center cursor-pointer"
            >
              Silence Alarm 🔕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
