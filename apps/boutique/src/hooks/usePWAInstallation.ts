"use client";
import { useEffect, useState } from "react";

export function usePWAInstallation() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Check if the application is currently running inside standalone/app mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes("android-app://");

    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    // 2. Check if this specific user has explicitly tapped 'Skip' or 'Dismiss' before
    const hasDismissed = localStorage.getItem("hive_seller_pwa_dismissed") === "true";
    if (hasDismissed) {
      setShowPrompt(false);
      return;
    }

    // 3. Detect if the user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDetected);

    if (iosDetected && !hasDismissed) {
      // Safari prompt manual guide
      setShowPrompt(true);
    }

    // 4. Intercept Chrome/Android's native prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    // 5. Listen for successful installation
    const handleAppInstalled = () => {
      setShowPrompt(false);
      localStorage.setItem("hive_seller_pwa_installed", "true");
      console.log("Hive Seller successfully added to home screen.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("hive_seller_pwa_dismissed", "true"); // Ensures you never force the user again
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return { showPrompt, deferredPrompt, handleDismiss, handleInstall, isIOS };
}
