"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, Volume2, X, CheckCircle2, BellRing } from "lucide-react";
import { Button } from "@hive/ui";
import { Id } from "../../../../convex/_generated/dataModel";

interface PushNotificationManagerProps {
  boutiqueId?: Id<"boutiques">;
  userId?: Id<"users">;
}

interface AlarmPayload {
  title?: string;
  body?: string;
  orderNumber?: string;
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

  // Swiggy/Zomato style continuous alarm state
  const [isRinging, setIsRinging] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlarmPayload | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const saveSubscription = useMutation(api.pushNotifications.savePushSubscription);

  // Web Audio Synthesizer Fallback (Alternating 880Hz / 1046Hz Siren)
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

  const startOrderAlarm = useCallback((payload?: AlarmPayload) => {
    setIsRinging(true);
    if (payload) setActiveAlert(payload);

    // Initialize audio element if needed
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/order-chime.mp3");
      audioRef.current.loop = true;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.warn("[PushNotificationManager] Audio play error, starting synthesized siren:", err);
      startSynthesizedSiren();
    });
  }, [startSynthesizedSiren]);

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
        if (event.data?.type === "TRIGGER_ORDER_ALARM" || event.data?.type === "PLAY_ORDER_CHIME") {
          console.log("[PushNotificationManager] Received SW alarm event:", event.data);
          startOrderAlarm(event.data.payload);
        }
      };
      navigator.serviceWorker.addEventListener("message", messageListener);
      return () => {
        navigator.serviceWorker.removeEventListener("message", messageListener);
        stopOrderAlarm();
      };
    }
  }, [startOrderAlarm, stopOrderAlarm]);

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

      // Unlock AudioContext immediately upon user interaction
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

      // Unsubscribe any old/stale push token first to force generating a fresh token for current VAPID keys
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log("[PushNotificationManager] Unsubscribing stale push token...");
        await existingSub.unsubscribe().catch((e) => console.warn("Failed to unsubscribe old token:", e));
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
      startOrderAlarm({
        title: "🔔 Order Alerts Active!",
        body: "Test alarm triggered. Tap STOP ALARM to silence.",
      });
    } catch (err) {
      console.error("[PushNotificationManager] Error subscribing to push:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Dev / Staff Test Trigger */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() =>
            startOrderAlarm({
              title: "🚨 TEST ORDER ALARM",
              body: "Order #HIVE-TEST-001 • ₹1,438.00",
            })
          }
          className="bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-zinc-700 flex items-center gap-2"
        >
          <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Test Alarm 🚨</span>
        </button>
      </div>

      {/* Ringing Overlay (Swiggy/Zomato style continuous alarm banner) */}
      {isRinging && (
        <div className="fixed inset-0 z-50 bg-red-600/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 animate-pulse">
          <div className="text-7xl mb-4 animate-bounce">🛍️</div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-center mb-2">
            {activeAlert?.title || "NEW ORDER RECEIVED!"}
          </h1>
          <p className="text-lg font-medium text-red-100 text-center mb-8 max-w-sm">
            {activeAlert?.body || "A customer just placed a new order."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={stopOrderAlarm}
              className="flex-1 py-4 bg-white text-red-600 font-bold text-lg rounded-2xl shadow-xl active:scale-95 transition text-center"
            >
              STOP ALARM 🔕
            </button>
          </div>
        </div>
      )}

      {/* Active Subscription Toast */}
      {isSubscribed && showSuccessToast && !isRinging && (
        <div className="fixed bottom-20 right-4 z-50 bg-emerald-900 text-emerald-100 border border-emerald-700/50 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-white">Order Sound Alerts Active 🔔</p>
            <p className="text-emerald-200/80">Instant chime alerts active for new orders.</p>
          </div>
          <button
            onClick={() =>
              startOrderAlarm({
                title: "🚨 TEST ORDER ALARM",
                body: "Testing merchant order alarm.",
              })
            }
            className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg text-[10px] font-bold transition-colors ml-1 border border-emerald-600/40 shrink-0"
          >
            Test 🔊
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
      {!isSubscribed && !dismissed && isSupported && permission !== "denied" && !isRinging && (
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
              onClick={() =>
                startOrderAlarm({
                  title: "🚨 TEST ORDER ALARM",
                  body: "Testing merchant order alarm.",
                })
              }
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
