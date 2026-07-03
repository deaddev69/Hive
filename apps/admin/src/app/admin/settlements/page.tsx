"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Card } from "@hive/ui";
import { Loader2, ArrowLeft, Coins, FileText, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function SettlementsLogPage() {
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<"" | "pending" | "available">("");

  const boutiques = useQuery(api.boutiques.getBoutiques, {});
  const settlements = useQuery(api.adminFinance.getSettlementsAdmin, {
    boutiqueId: selectedBoutiqueId ? (selectedBoutiqueId as any) : undefined,
    status: selectedStatus ? selectedStatus : undefined,
  });

  // Formatter helper (paise to INR)
  const formatCurrency = (paise?: number) => {
    if (paise === undefined) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (boutiques === undefined || settlements === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading settlements queue...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Settlement Queue Log</h1>
          <p className="text-sm text-hive-text-muted">Double-entry ledger of all boutique accruals, claim deductions, and manual corrections.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-b border-hive-border/60 pb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Boutique</span>
            <select
              value={selectedBoutiqueId}
              onChange={(e) => setSelectedBoutiqueId(e.target.value)}
              className="px-4 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white text-xs font-bold text-slate-700"
            >
              <option value="">All Boutiques</option>
              {boutiques.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.boutiqueName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white text-xs font-bold text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Accruals</option>
              <option value="available">Available / Settled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Settlement ID</th>
                <th className="px-6 py-4">Boutique</th>
                <th className="px-6 py-4">Type / Source</th>
                <th className="px-6 py-4">Linked Reference</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Accrued / Settled Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {settlements.map((s) => {
                const isNegative = s.amount < 0;

                return (
                  <tr key={s._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Settlement ID */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                      {s._id}
                    </td>

                    {/* Boutique Name */}
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {s.boutiqueName}
                    </td>

                    {/* Type & Source */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-800 capitalize">
                          {s.type.replace("_", " ")}
                        </span>
                        {s.adjustmentType && (
                          <span className="text-[10px] text-hive-amber font-semibold uppercase mt-0.5">
                            {s.adjustmentType.replace("_", " ")}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                          Source: {s.source}
                        </span>
                      </div>
                    </td>

                    {/* Linked Reference */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-left">
                        {s.orderId && (
                          <span className="font-mono text-[10px] text-slate-500">
                            Order: {s.orderId}
                          </span>
                        )}
                        {s.payoutId && (
                          <span className="font-mono text-[10px] text-emerald-800 font-bold mt-0.5">
                            Payout: {s.payoutId}
                          </span>
                        )}
                        {!s.orderId && !s.payoutId && <span className="text-slate-400">—</span>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {s.status === "available" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {s.payoutId ? "Paid Out" : "Available"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </td>

                    {/* Accrued / Settled Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-700">
                          Accrued: {formatDate(s.accruedAt)}
                        </span>
                        {s.settledAt && (
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Settled: {formatDate(s.settledAt)}
                          </span>
                        )}
                        {s.claimWindowDays && s.status === "pending" && (
                          <span className="text-[9px] text-amber-700 font-semibold mt-0.5">
                            Claim Window: {s.claimWindowDays} Days
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className={`px-6 py-4 whitespace-nowrap text-right font-black ${
                      isNegative ? "text-red-650" : "text-slate-900"
                    }`}>
                      {formatCurrency(s.amount)}
                    </td>
                  </tr>
                );
              })}

              {settlements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-450 italic">
                    No matching settlement records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
