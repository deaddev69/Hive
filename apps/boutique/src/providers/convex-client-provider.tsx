// apps/boutique/src/providers/convex-client-provider.tsx
"use client";

import { ReactNode } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const isConfigInvalid =
  !convexUrl ||
  convexUrl === "undefined" ||
  convexUrl.trim() === "" ||
  convexUrl.includes("placeholder-url.convex.cloud");

/**
 * Module-level singleton — created once, survives all re-renders.
 * Prevents WebSocket reconnect flicker on route navigation.
 */
const convex = isConfigInvalid ? null : new ConvexReactClient(convexUrl!);

function ConvexConfigErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100 animate-pulse text-lg">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configuration Required</h2>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The backend connection is missing. Ensure{" "}
          <code className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-xs text-rose-600 border border-rose-100">
            NEXT_PUBLIC_CONVEX_URL
          </code>{" "}
          is set in your environment variables.
        </p>
        <button
          onClick={() => typeof window !== "undefined" && window.location.reload()}
          className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <ConvexConfigErrorScreen />;

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
