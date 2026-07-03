"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, Button } from "@hive/ui";
import { Loader2, ShieldX, AlertTriangle, ArrowRight, Check, Plus } from "lucide-react";
import Link from "next/link";

export default function BoutiqueDashboard() {
  const { isLoading: convexAuthLoading } = useConvexAuth();
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);

  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    if (convexAuthLoading) return;
    const t = setTimeout(() => setWaitedLong(true), 6000);
    return () => clearTimeout(t);
  }, [convexAuthLoading]);

  if (boutique === undefined) {
    if (waitedLong) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <ShieldX className="w-10 h-10 text-red-400" />
          <p className="text-base font-bold text-slate-700">Access Denied</p>
          <p className="text-sm text-slate-500 max-w-sm">
            Your account does not have boutique privileges, or no boutique is linked to your account.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading dashboard...</p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = boutique.ownerName ? boutique.ownerName.split(' ')[0] : "Partner";

  return (
    <div className="flex flex-col gap-6 text-left max-w-2xl mx-auto w-full pt-2 pb-10 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-tight font-serif font-bold text-hive-dark">
          Good Morning, {firstName}.
        </h1>
        <p className="text-sm font-semibold text-hive-text-muted">{currentDate}</p>
      </div>

      {/* Top Status Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Store Status: {boutique.status === "APPROVED" ? "Approved" : "Pending"}
          <Check className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Setup Progress: 71%
          <Check className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Stock Verified: Never Verified
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAFAF9] border border-slate-200 text-[11px] font-bold text-amber-700 shadow-sm">
          ⭐ Bronze Seller
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm w-full sm:w-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Fulfillment Score: <strong className="text-hive-dark">100</strong> <span className="text-slate-500">(Excellent)</span>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-transparent py-1">
        <span className="text-base">⏳</span> <span className="italic text-slate-500 font-medium">Progress: Fulfill 1 order to reach Silver.</span>
      </div>

      <hr className="border-t border-slate-200/80 my-1" />

      {/* Alerts */}
      <div className="flex flex-col gap-6">
        <Card className="border border-amber-200 bg-[#FFFAF0] shadow-sm rounded-3xl overflow-hidden p-6 md:p-7 relative">
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" /> Verify Inventory
            </div>
            <h2 className="text-2xl font-serif font-black text-amber-950">Reconciliation Needed</h2>
            <p className="text-sm font-medium text-amber-800/80 leading-relaxed mb-3">
              Your stock levels have not been verified yet. Please reconcile offline sales to prevent oversells.
            </p>
            <div>
              <Link href="/boutique/inventory">
                <Button className="bg-amber-700 hover:bg-amber-800 text-white rounded-full px-6 py-2.5 font-bold text-xs flex items-center gap-2 w-max shadow-md">
                  VERIFY STOCK <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Onboarding */}
        <Card className="border border-slate-200 bg-[#FAFAF9] shadow-sm rounded-3xl overflow-hidden p-6 md:p-7 relative pb-8">
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-600">
              🚀 Boutique Onboarding
            </div>
            <h2 className="text-2xl font-serif font-black text-hive-dark leading-tight">
              Welcome to Hive! Let's get your boutique launch-ready.
            </h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed mb-2">
              Complete setup to start receiving orders. Follow this simple checklist to establish your digital storefront and start selling.
            </p>
            
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex gap-1.5 w-1/2">
                <div className="h-2 rounded-full bg-[#BFA36F] w-1/2" />
                <div className="h-2 rounded-full bg-[#BFA36F] w-1/2" />
                <div className="h-2 rounded-full bg-slate-200 w-full" />
              </div>
              <span className="text-xs font-black text-hive-dark">5/7 Complete</span>
            </div>

            {/* Premium, functional action button replacing the broken FAB */}
            <div className="mt-6">
              <Link href="/boutique/products">
                <Button className="bg-[#C89653] hover:bg-[#b08143] text-white rounded-full px-6 py-2.5 font-bold text-xs flex items-center gap-2 w-max shadow-md uppercase tracking-wider transition-all select-none active:scale-95">
                  <Plus className="w-4 h-4" /> ADD FIRST PRODUCT
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
