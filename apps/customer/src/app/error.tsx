"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { RotateCcw, Home, AlertCircle } from "lucide-react";

/**
 * Route-level error boundary. Without one, a single failing query took the whole route down to the
 * browser's own "Application error: a client-side exception has occurred" — no branding, no way
 * back, and nothing telling the shopper whether the fault was theirs. A backend function that is
 * momentarily unavailable should cost the page, not the session.
 *
 * The error is reported here rather than only logged, because a boundary that swallows what it
 * catches is worse than none: the shopper sees a handled state and nobody finds out it happened.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-[70vh] w-full flex flex-col items-center justify-center px-6 py-20 text-center">
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: "#1A120012", border: "1.5px dashed #1A120040" }}
      >
        <AlertCircle className="w-8 h-8 text-hive-dark" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-serif font-extrabold text-hive-dark mb-2">
        This page didn&apos;t load
      </h1>
      <p className="text-sm text-hive-text-muted max-w-sm leading-relaxed mb-8">
        Something on our side went wrong — nothing you did. Your bag and your order history are
        untouched.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold uppercase tracking-widest text-white hover:opacity-90 transition-all duration-200 shadow-md cursor-pointer"
          style={{ background: "#1A1200", boxShadow: "0 4px 18px #1A120030" }}
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
          Try Again
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-hive-border/60 text-hive-dark hover:border-hive-dark/30 hover:bg-hive-dark/5 transition-all duration-200"
        >
          <Home className="w-3.5 h-3.5 text-hive-dark" strokeWidth={2} />
          Back to Home
        </Link>
      </div>

      {/*
        The digest is Next's own identifier for this error, and the only thing that links what the
        shopper saw to the report in Sentry. Shown quietly so support can ask for it, rather than
        the raw exception text, which is what currently reaches shoppers through some toasts.
      */}
      {error.digest && (
        <p className="mt-8 text-[11px] text-hive-text-muted/70 font-mono">
          Reference: {error.digest}
        </p>
      )}
    </main>
  );
}
