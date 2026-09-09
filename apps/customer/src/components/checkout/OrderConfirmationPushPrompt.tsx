"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Bell, X, CheckCircle2 } from "lucide-react";

export function OrderConfirmationPushPrompt({
  userId,
  className = "",
}: {
  userId?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const saveSubscription = useMutation(api.customerPush.saveCustomerPushSubscription);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      setStatus("granted");
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, []);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setIsSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");

      if (!p256dh || !auth) {
        setIsSubscribing(false);
        return;
      }

      // Persist to Convex DB
      await saveSubscription({
        userId: userId as any,
        subscription: {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: {
            p256dh: ArrayBufferToBase64(p256dh),
            auth: ArrayBufferToBase64(auth),
          },
        },
      });

      setStatus("granted");
    } catch (error) {
      console.error("Failed to enable push notifications:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (status === "granted" || status === "unsupported" || status === "denied" || isDismissed) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-stone-50/80 p-3.5 flex items-center justify-between gap-3 text-left transition-all ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-800 shrink-0 shadow-2xs">
          <Bell className="w-4 h-4 stroke-[1.8]" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-serif font-bold text-stone-900 tracking-tight leading-snug">
            Live Delivery Alerts
          </h4>
          <p className="text-[11px] text-stone-500 truncate leading-normal mt-0.5">
            Get instant updates as your order moves
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEnablePush}
          disabled={isSubscribing}
          className="h-8 px-3.5 bg-stone-950 hover:bg-stone-800 text-white text-[11px] font-bold rounded-full transition-all active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {isSubscribing ? "Enabling..." : "Notify Me"}
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss notifications prompt"
          className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ArrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
