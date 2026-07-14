"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Card, CardContent } from "@hive/ui";
import { formatCurrency } from "@hive/utils";
import {
  Loader2,
  Wallet,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Building,
  ArrowDownRight,
  FileText
} from "lucide-react";

function StatusBadge({ variant, label }: { variant: "success" | "info" | "warning" | "danger"; label: string }) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    info: "bg-blue-50 text-blue-700 border-blue-200/50",
    warning: "bg-amber-50 text-amber-800 border-amber-200/50",
    danger: "bg-rose-50 text-rose-700 border-rose-200/50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles[variant]}`}>
      {label}
    </span>
  );
}

export default function BoutiqueFinance() {
  const finance = useQuery(api.boutiques.getBoutiqueFinance);
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const [activeTab, setActiveTab] = useState<"settlements" | "payouts">("settlements");

  if (finance === undefined || boutique === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading finance records...</p>
      </div>
    );
  }

  const { metrics, settlements, payouts } = finance;

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getReleaseDate = (settlement: any) => {
    // Hold is weekly (7 days) post delivery/accrual
    const deliveryTime = settlement.accruedAt || settlement.createdAt;
    return formatDate(deliveryTime + 7 * 24 * 3600 * 1000);
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl w-full pt-2 pb-14 font-sans px-2 lg:px-6">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-[32px] md:text-[38px] leading-tight font-serif font-bold text-hive-text">
          Finance & Payouts
        </h1>
        <p className="text-xs font-semibold text-hive-text-muted font-sans">
          Track your boutique’s earnings, pending settlements, and payouts.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        
        {/* Available Balance */}
        <div className="bg-white border border-hive-border rounded-[24px] p-6 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.015)]">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider">Available Balance</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Wallet className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <span className="text-2xl font-bold text-slate-800">
              {formatCurrency(metrics.availableBalance / 100)}
            </span>
            <span className="text-[10px] text-hive-text-muted font-medium mt-1">
              Released funds ready for next automatic sweep.
            </span>
          </div>
        </div>

        {/* Pending Settlements */}
        <div className="bg-white border border-hive-border rounded-[24px] p-6 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.015)]">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider">Pending Settlements</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <span className="text-2xl font-bold text-slate-800">
              {formatCurrency(metrics.pendingBalance / 100)}
            </span>
            <span className="text-[10px] text-hive-text-muted font-medium mt-1">
              Held in weekly (7-day post-delivery) hold window.
            </span>
          </div>
        </div>

        {/* Total Paid Out */}
        <div className="bg-white border border-hive-border rounded-[24px] p-6 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.015)]">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider">Total Paid Out</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <span className="text-2xl font-bold text-slate-800">
              {formatCurrency(metrics.totalPaidOut / 100)}
            </span>
            <span className="text-[10px] text-hive-text-muted font-medium mt-1">
              Total earnings settled to your bank account.
            </span>
          </div>
        </div>
      </div>

      {/* Bank Account Settings Info box */}
      <div className="bg-hive-cream/40 border border-[#F0E4C8]/60 rounded-3xl p-5 mt-2 flex items-start gap-4 select-none">
        <div className="p-2 bg-white rounded-2xl text-hive-gold border border-[#EBE3D0] shadow-sm shrink-0">
          <Building className="w-4.5 h-4.5" />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <h4 className="text-xs font-bold text-hive-dark">Settlement Destination Account</h4>
          {boutique.bankAccount ? (
            <p className="text-[11px] font-medium text-hive-text-muted leading-relaxed">
              Payouts are auto-processed to <span className="font-extrabold text-slate-700">{boutique.bankAccount.holderName}</span> (Account: <span className="font-mono font-bold text-slate-700">•••• {boutique.bankAccount.accountNoLast4}</span>, IFSC: <span className="font-mono font-bold text-slate-700">{boutique.bankAccount.ifsc}</span>) on a weekly basis.
            </p>
          ) : (
            <p className="text-[11px] font-medium text-red-600/90 leading-relaxed">
              No bank account configured. Please complete your bank account details under the Profile tab to receive payments.
            </p>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-2 border-b border-hive-border mt-6">
        <button
          onClick={() => setActiveTab("settlements")}
          className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "settlements"
              ? "border-hive-gold text-hive-gold"
              : "border-transparent text-hive-text-muted hover:text-hive-text"
          }`}
        >
          Recent Settlements ({settlements.length})
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "payouts"
              ? "border-hive-gold text-hive-gold"
              : "border-transparent text-hive-text-muted hover:text-hive-text"
          }`}
        >
          Payout Transactions ({payouts.length})
        </button>
      </div>

      {/* Tables section */}
      <div className="bg-white border border-hive-border rounded-3xl overflow-hidden mt-2 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
        
        {activeTab === "settlements" ? (
          <div>
            {settlements.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-hive-text-muted italic font-medium">No settlements logged yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-hive-border/60 text-[10px] font-extrabold uppercase tracking-wider text-hive-text-muted select-none">
                      <th className="py-3.5 px-6">Reference / Date</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Release Date</th>
                      <th className="py-3.5 px-6 text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s: any) => {
                      const isNegative = s.amount < 0;
                      return (
                        <tr key={s._id} className="border-b border-hive-border/30 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-0.5">
                              {s.orderNumber ? (
                                <span className="font-mono font-bold text-hive-gold">{s.orderNumber}</span>
                              ) : (
                                <span className="text-slate-500 font-semibold text-[11px] italic">System Adj</span>
                              )}
                              <span className="text-[10px] text-hive-text-muted font-medium">{formatDate(s.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-bold text-slate-700 capitalize">
                              {s.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge
                              variant={s.status === "available" ? "success" : "warning"}
                              label={s.status === "available" ? "Available" : "Pending Hold"}
                            />
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-slate-500">
                            {s.status === "available" ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Released
                              </span>
                            ) : (
                              <span>{getReleaseDate(s)}</span>
                            )}
                          </td>
                          <td className={`py-4 px-6 text-right font-extrabold text-sm ${isNegative ? "text-red-500" : "text-slate-800"}`}>
                            {isNegative ? "-" : ""}{formatCurrency(Math.abs(s.amount) / 100)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {payouts.length === 0 ? (
              <div className="py-16 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-hive-text-muted italic font-medium">No payout transactions processed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-hive-border/60 text-[10px] font-extrabold uppercase tracking-wider text-hive-text-muted select-none">
                      <th className="py-3.5 px-6">Payout Reference</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Destination Bank</th>
                      <th className="py-3.5 px-4">Processed Date</th>
                      <th className="py-3.5 px-6 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p: any) => {
                      let statusVariant: "success" | "info" | "warning" | "danger" = "warning";
                      if (p.status === "success") statusVariant = "success";
                      if (p.status === "processing") statusVariant = "info";
                      if (p.status === "failed") statusVariant = "danger";

                      return (
                        <tr key={p._id} className="border-b border-hive-border/30 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-bold text-slate-800">{p.payoutNumber}</span>
                              {p.utrReference && (
                                <span className="text-[9px] font-mono text-hive-text-muted">UTR: {p.utrReference}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge variant={statusVariant} label={p.status} />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-slate-700">{p.bankAccount?.holderName || "Boutique Owner"}</span>
                              <span className="text-[10px] font-mono text-slate-400">•••• {p.bankAccount?.accountNo?.slice(-4) || "••••"}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-slate-500">
                            {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                          </td>
                          <td className="py-4 px-6 text-right font-extrabold text-slate-800 text-sm">
                            {formatCurrency(p.amount / 100)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
