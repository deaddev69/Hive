"use client";

import React, { useState, useEffect } from "react";

type SoundMode = "store" | "mobile";

export function AudioAlertHeaderStatus() {
  const [mode, setMode] = useState<SoundMode>("mobile");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = (localStorage.getItem("hive_alert_mode") as SoundMode) || "mobile";
      setMode(savedMode === "store" ? "store" : "mobile");
    }
  }, []);

  const handleSelectMode = (newMode: SoundMode) => {
    setMode(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("hive_alert_mode", newMode);
      window.dispatchEvent(new Event("hive_alert_mode_change"));
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-semibold cursor-pointer"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>{mode === "mobile" ? "📱 Owner Mobile" : "🏪 Store Terminal"}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-3 space-y-2 text-xs text-white animate-in fade-in slide-in-from-top-2">
            <div className="font-semibold text-zinc-400 px-1">Order Alert Sound Mode</div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectMode("store")}
                className={`px-2 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                  mode === "store" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                🏪 Terminal
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("mobile")}
                className={`px-2 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                  mode === "mobile" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                📱 Mobile
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
