"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, Volume2, X, CheckCircle2, BellRing, Smartphone, Store, VolumeX } from "lucide-react";
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

type AlertMode = "store" | "mobile" | "chime";

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

  // Swiggy/Zomato style continuous alarm state & mode
  const [isRinging, setIsRinging] = useState(false);
  const [alertMode, setAlertMode] = useState<AlertMode>("mobile");
  const [activeAlert, setActiveAlert] = useState<AlarmPayload | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveSubscription = useMutation(api.pushNotifications.savePushSubscription);

  // Load saved device preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = (localStorage.getItem("hive_alert_mode") as AlertMode) || "mobile";
      setAlertMode(savedMode);
    }
  }, []);

  const handleModeChange = (mode: AlertMode) => {
    setAlertMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("hive_alert_mode", mode);
    }
  };

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

    if (autoSilenceTimerRef.current) {
      clearTimeout(autoSilenceTimerRef.current);
      autoSilenceTimerRef.current = null;
    }

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
      } else if (alertMode === "mobile") {
        // Loop with 10-second auto-timeout safeguard for personal phones
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => startSynthesizedSiren());

        if (autoSilenceTimerRef.current) clearTimeout(autoSilenceTimerRef.current);
        autoSilenceTimerRef.current = setTimeout(() => {
          stopOrderAlarm();
        }, 10000);
      } else {
        // Single chime mode
        audioRef.current.loop = false;
        audioRef.current.play().catch(() => startSynthesizedSiren());
      }
    },
    [alertMode, startSynthesizedSiren, stopOrderAlarm]
  );

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
        if (event.data?.type === "STOP_ORDER_ALARM") {
          console.log("[PushNotificationManager] Received STOP_ORDER_ALARM event from lockscreen!");
          stopOrderAlarm();
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
      {/* Dev / Staff Test Trigger & Mode Switcher */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
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

      {/* Ringing Overlay (Rendered on 'store' and 'mobile' modes) */}
      {isRinging && alertMode !== "chime" && (
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

      {/* Subscription & Alert Preference Card */}
      {!dismissed && isSupported && permission !== "denied" && !isRinging && (
        <div className="mx-4 my-3 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-500 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                Order Sound Alert Mode
                <span className="bg-amber-500/20 text-amber-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  {alertMode.toUpperCase()}
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Choose how this device alerts shop staff or owners when a customer orders.
              </p>

              {/* Mode Selector Buttons */}
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => handleModeChange("store")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    alertMode === "store"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-white/80 hover:bg-white text-slate-700 border border-slate-200"
                  }`}
                  title="Endless looping siren & overlay for shop tablet"
                >
                  <Store className="w-3 h-3" />
                  Store Terminal
                </button>

                <button
                  onClick={() => handleModeChange("mobile")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    alertMode === "mobile"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-white/80 hover:bg-white text-slate-700 border border-slate-200"
                  }`}
                  title="10-second auto-timeout loop for owner phone"
                >
                  <Smartphone className="w-3 h-3" />
                  Owner Mobile
                </button>

                <button
                  onClick={() => handleModeChange("chime")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    alertMode === "chime"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white/80 hover:bg-white text-slate-700 border border-slate-200"
                  }`}
                  title="Single short chime notification"
                >
                  <VolumeX className="w-3 h-3" />
                  Single Chime
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
            {!isSubscribed ? (
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-sm text-xs rounded-xl flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                {loading ? "Enabling..." : "Turn On Alerts"}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300/60 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Alerts Active
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
