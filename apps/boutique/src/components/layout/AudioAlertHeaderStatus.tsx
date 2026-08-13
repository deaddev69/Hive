"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Store, ChevronDown } from "lucide-react";

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
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-900 hover:bg-amber-500/20 transition-all text-xs font-bold cursor-pointer shadow-2xs"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="flex items-center gap-1.5">
          {mode === "mobile" ? (
            <>
              <Smartphone className="w-3.5 h-3.5 text-amber-700" />
              <span>Owner Mobile</span>
            </>
          ) : (
            <>
              <Store className="w-3.5 h-3.5 text-amber-700" />
              <span>Store Terminal</span>
            </>
          )}
        </span>
        <ChevronDown className={`w-3 h-3 text-amber-700/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl z-50 p-3.5 space-y-2.5 text-xs text-slate-800 animate-in fade-in slide-in-from-top-2">
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] px-1">
              Order Alert Sound Mode
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => handleSelectMode("store")}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  mode === "store"
                    ? "bg-[#E9B929] text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Terminal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("mobile")}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  mode === "mobile"
                    ? "bg-[#E9B929] text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

