"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Smartphone, Monitor, Apple, ArrowUpRight } from "lucide-react";

export function PWAStatsCard() {
  const stats = useQuery(api.pwaAnalytics.getPWAStats);

  if (!stats) {
    return (
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse text-white">
        <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4 font-mono text-xs">Loading analytics...</div>
        <div className="h-8 bg-zinc-800 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-950 border border-zinc-800/80 rounded-2xl text-white shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>Customer PWA Downloads</span>
        </h3>
        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
          <Smartphone className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-black tracking-tight text-white">
          {stats.totalInstalls.toLocaleString()}
        </span>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
          <ArrowUpRight className="w-3 h-3" /> Live
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
        <div className="bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-700/30">
          <span className="block font-black text-white text-sm mb-0.5 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-emerald-400" />
            {stats.breakdown.android}
          </span>
          <span className="text-[10px] text-zinc-400">Android</span>
        </div>
        <div className="bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-700/30">
          <span className="block font-black text-white text-sm mb-0.5 flex items-center gap-1">
            <Apple className="w-3 h-3 text-slate-300" />
            {stats.breakdown.ios}
          </span>
          <span className="text-[10px] text-zinc-400">iOS</span>
        </div>
        <div className="bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-700/30">
          <span className="block font-black text-white text-sm mb-0.5 flex items-center gap-1">
            <Monitor className="w-3 h-3 text-amber-400" />
            {stats.breakdown.desktop}
          </span>
          <span className="text-[10px] text-zinc-400">Desktop</span>
        </div>
      </div>
    </div>
  );
}
