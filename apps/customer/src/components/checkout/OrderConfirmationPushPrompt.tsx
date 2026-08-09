"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Bell } from "lucide-react";

export function OrderConfirmationPushPrompt({ userId }: { userId?: string }) {
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
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
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");

      if (!p256dh || !auth) return;

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
        }
      });

      setStatus("granted");
    } catch (error) {
      console.error("Failed to enable push notifications:", error);
    }
  };

  if (status === "granted" || status === "unsupported") return null;

  return (
    <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-600">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Get Instant Order & Delivery Updates
          </h4>
          <p className="text-xs text-neutral-500">
            Receive browser notifications when your items ship or arrive.
          </p>
        </div>
      </div>
      <button
        onClick={handleEnablePush}
        className="w-full sm:w-auto px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium text-xs rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        Enable Notifications
      </button>
    </div>
  );
}

function ArrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
