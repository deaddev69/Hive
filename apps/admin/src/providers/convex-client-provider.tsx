"use client";

import { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Resilient check against missing, empty, or fallback strings
const isConfigInvalid = 
  !convexUrl || 
  convexUrl === "undefined" || 
  convexUrl.trim() === "" || 
  convexUrl.includes("placeholder-url.convex.cloud");

// Self-contained, lightweight fallback UI
function ConvexConfigErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100/50">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-100 animate-pulse text-lg">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Configuration Required
        </h2>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The backend services connection is missing. Please ensure <code className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-xs text-rose-600 border border-rose-100">NEXT_PUBLIC_CONVEX_URL</code> is set correctly in your environment variables.
        </p>
        <div className="mt-6 text-xs text-left text-slate-500 rounded-xl bg-slate-50 p-4 border border-slate-100 flex flex-col gap-3">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Next Steps:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-655 leading-normal">
            <li>Check your local <code className="font-mono text-[11px] bg-slate-200/50 px-1 rounded">.env.local</code> file.</li>
            <li>Verify your Vercel Project Environment Variables.</li>
            <li>Trigger a fresh deployment after saving changes.</li>
          </ul>
        </div>
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
  if (isConfigInvalid) {
    return <ConvexConfigErrorScreen />;
  }

  // Safe to initialize now that we have a valid absolute URL
  const convex = new ConvexReactClient(convexUrl);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
