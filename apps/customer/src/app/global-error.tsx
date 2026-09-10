"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last-resort boundary, for errors thrown in the root layout itself — the case error.tsx cannot
 * catch, because it renders inside that layout.
 *
 * It is also the file Sentry looks for to report React rendering errors at all. Its absence was
 * being reported on every build ("It seems like you don't have a global error handler set up"),
 * which meant render errors were reaching shoppers and no one else: the class of fault least
 * likely to be noticed was the one guaranteed not to be logged.
 *
 * This replaces the root layout when it fires, so it has to supply its own html and body. Styling
 * is inline for the same reason — nothing above it is guaranteed to have loaded.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          textAlign: "center",
          background: "#ffffff",
          color: "#1a1a1a",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "9999px",
            background: "#1A120012",
            border: "1.5px dashed #1A120040",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
            fontSize: 28,
            color: "#1A1200",
          }}
          aria-hidden="true"
        >
          !
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          Hive didn&apos;t load
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "#6b6b6b",
            maxWidth: "24rem",
            margin: "0 0 2rem",
          }}
        >
          Something on our side went wrong — nothing you did. Reloading usually sorts it.
        </p>

        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.65rem 1.35rem",
            borderRadius: "1rem",
            background: "#1A1200",
            color: "#ffffff",
            fontSize: "0.8rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
            boxShadow: "0 4px 18px #1A120030",
          }}
        >
          Reload Hive
        </a>

        {error.digest && (
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.7rem",
              color: "#9a9a9a",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            Reference: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
