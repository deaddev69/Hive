// Sentry initialisation for the Edge runtime (middleware, edge routes).
// No-op without SENTRY_DSN.

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  });
}
