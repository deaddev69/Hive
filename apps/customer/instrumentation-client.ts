// Sentry browser initialisation for the customer PWA.
//
// Next 15 loads this automatically on the client; it replaces the older
// sentry.client.config.ts. Everything here is a no-op when no DSN is
// configured, so local development and any preview without the environment
// variable behave exactly as they did before Sentry was added.

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Hive signs customers in by phone OTP and takes payment in-page, so the
    // defaults that attach IPs, cookies and request bodies stay off. See
    // lib/sentryScrub.ts for the second layer.
    sendDefaultPii: false,

    // Errors are the point of this integration. Sample performance traces
    // lightly — this is a consumer storefront, and Speed Insights already
    // covers real-user timing.
    tracesSampleRate: 0.05,

    // Session Replay is deliberately not enabled: it would record the checkout
    // and OTP screens.
    integrations: [],

    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),

    // Noise that is not actionable: extensions, cancelled navigations, and the
    // benign ResizeObserver loop warning.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "AbortError",
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],
  });
}

// Lets Sentry tie errors to the navigation that caused them.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
