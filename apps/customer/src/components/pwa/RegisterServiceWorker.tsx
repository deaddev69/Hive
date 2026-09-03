"use client";

import { useEffect } from "react";
import type { Workbox } from "workbox-window";

declare global {
  interface Window {
    workbox: Workbox;
  }
}

/**
 * Registers the PWA service worker via the `workbox-window` instance that
 * `@ducanh2912/next-pwa` attaches to `window.workbox` at build time.
 *
 * Why this exists instead of the library's default auto-registration:
 * The default `register: true` mode calls `window.workbox.register()` as
 * fire-and-forget (no `.catch()`). If Chrome rejects registration for any
 * reason — stale SW state, transient network failure, storage quota, browser
 * quirk — the rejection becomes an unhandled Promise rejection that Sentry
 * captures as a production error. Setting `register: false` in next.config.ts
 * disables that automatic call so we can handle the Promise here.
 *
 * This component does NOT change the Workbox lifecycle. The Workbox instance,
 * the generated `sw.js`, precaching, runtime caching, the custom worker, and
 * all event listeners are identical to the auto-registration path.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      typeof window.workbox === "undefined"
    ) {
      return;
    }

    window.workbox.register().catch((error: unknown) => {
      // Service worker registration is non-critical. Core shopping (browsing,
      // cart, checkout, auth) works without it. Only push notifications, PWA
      // install prompts, offline caching, and background update detection
      // require a registered SW.
      //
      // This catch prevents the rejection from surfacing as an unhandled
      // Promise rejection in Sentry. The diagnostic is intentionally minimal
      // and contains no URLs, tokens, user IDs, or other PII.
      console.warn(
        "[PWA] Service worker registration failed:",
        error instanceof Error ? error.message : String(error),
      );
    });
  }, []);

  return null;
}
