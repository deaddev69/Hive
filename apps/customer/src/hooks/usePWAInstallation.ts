"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";

export function usePWAInstallation() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  
  const pathname = usePathname();
  const cartItemsCount = useCartStore((state) => state.items.length);
  const wishlistItemsCount = useWishlistStore((state) => state.items.length);

  // Track product detail page views in localStorage
  useEffect(() => {
    if (pathname && pathname !== "/products" && pathname.startsWith("/products/")) {
      const currentViews = parseInt(localStorage.getItem("hive_pwa_product_views") || "0", 10);
      localStorage.setItem("hive_pwa_product_views", (currentViews + 1).toString());
    }
  }, [pathname]);

  // Initial standalone and iOS checks
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes("android-app://");

    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDetected);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      localStorage.setItem("hive_pwa_installed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Monitor user journey qualifications to show prompt
  useEffect(() => {
    const hasDismissed = localStorage.getItem("hive_pwa_dismissed") === "true";
    if (hasDismissed) {
      setShowPrompt(false);
      return;
    }

    const productViews = parseInt(localStorage.getItem("hive_pwa_product_views") || "0", 10);
    const isQualified = productViews >= 2 || cartItemsCount > 0 || wishlistItemsCount > 0;

    if (isQualified) {
      if (isIOS) {
        setShowPrompt(true);
      } else if (deferredPrompt) {
        setShowPrompt(true);
      }
    }
  }, [pathname, cartItemsCount, wishlistItemsCount, isIOS, deferredPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("hive_pwa_dismissed", "true");
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return { showPrompt, deferredPrompt, handleDismiss, handleInstall, isIOS };
}
