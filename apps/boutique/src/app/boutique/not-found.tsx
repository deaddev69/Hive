"use client";

import React, { useEffect } from "react";
import { Store, ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  useEffect(() => {
    // Self-heal mobile PWA by purging stale Workbox Cache Storage when 404 is hit
    if (typeof window !== "undefined" && "caches" in window) {
      window.caches.keys().then((names) => {
        names.forEach((name) => window.caches.delete(name));
      });
    }
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.update());
      });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-6 text-center">
      <div className="max-w-md w-full bg-slate-800/80 border border-amber-500/20 rounded-2xl p-8 backdrop-blur-md shadow-2xl flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
          <Store className="w-8 h-8 text-amber-400" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Hive Partners Portal</span>
        </div>

        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-amber-200 mb-3">Page Not Found</h2>

        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          The requested section might have been moved, updated, or requires you to log into your boutique partner workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <a
            href="/boutique"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/boutique";
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </a>
          <a
            href="/sign-in"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/sign-in";
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-600/80 transition-colors cursor-pointer"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
