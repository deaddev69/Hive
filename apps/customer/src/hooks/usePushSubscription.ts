"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "@clerk/nextjs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();
  const saveSubscription = useMutation(api.customerPush.saveCustomerPushSubscription);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      if (Notification.permission === "granted") {
        setIsSubscribed(true);
      }
    }
    setIsLoading(false);
  }, []);

  const subscribeToPush = async () => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setIsSubscribed(false);
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error("[Push] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
          setIsLoading(false);
          return false;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await saveSubscription({
        userId: userId || undefined,
        subscription: JSON.parse(JSON.stringify(subscription)),
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("[Push] Failed to subscribe:", error);
      setIsLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
  };
}
