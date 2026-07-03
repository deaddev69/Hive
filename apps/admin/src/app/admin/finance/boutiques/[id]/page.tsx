"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Card, CardContent } from "@hive/ui";
import { formatINR } from "@hive/utils";
import { ArrowLeft, Loader2, Wallet, ArrowDownRight, ArrowUpRight, Plus, HelpCircle, CheckCircle2, AlertCircle, Coins, CreditCard, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function BoutiqueFinanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boutiqueId = params.id as string;

  const boutique = useQuery(api.boutiques.getBoutiqueById, { id: boutiqueId as any });
  const wallet = useQuery(api.adminFinance.getBoutiqueWallet, { boutiqueId: boutiqueId as any });
  const settlements = useQuery(api.adminFinance.getSettlementsAdmin, { boutiqueId: boutiqueId as any });
  const payouts = useQuery(api.adminFinance.getPayoutsAdmin, { boutiqueId: boutiqueId as any });
  const commissions = useQuery(api.adminFinance.getCommissionsAdmin, { boutiqueId: boutiqueId as any });

  const triggerPayout = useMutation(api.adminFinance.triggerBoutiquePayoutAdmin);
  const postAdjustment = useMutation(api.adminFinance.postManualAdjustmentAdmin);

  // UI Tabs: "settlements" | "payouts" | "refunds" | "adjustments" | "commissions"
  const [activeTab, setActiveTab] = useState<"settlements" | "payouts" | "refunds" | "adjustments" | "commissions">("settlements");
  const [processingPayout, setProcessingPayout] = useState(false);

  // Manual Adjustment form state
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"bonus" | "penalty" | "commission_correction" | "refund_correction" | "manual_credit" | "manual_debit">("manual_credit");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Formatter helper (paise to INR)
  const formatCurrency = (paise?: number) => {
    if (paise === undefined) return "₹0.00";
    return formatINR(paise);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleProcessPayout = async () => {
    setProcessingPayout(true);
    try {
      await triggerPayout({ boutiqueId: boutiqueId as any });
      alert("Payout successfully processed!");
    } catch (err: any) {
      alert("Payout failed: " + err.message);
    } finally {
      setProcessingPayout(false);
    }
  };

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(adjustAmount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      alert("Please enter a valid non-zero amount.");
      return;
    }
    if (!adjustNotes.trim()) {
      alert("Please enter an explanation note for the adjustment.");
      return;
    }

    const amountInPaise = Math.round(parsedAmount * 100);

    setSubmittingAdjustment(true);
    try {
      await postAdjustment({
        boutiqueId: boutiqueId as any,
        amount: amountInPaise,
        adjustmentType: adjustType,
        notes: adjustNotes,
      });
      alert("Adjustment successfully posted!");
      setAdjustAmount("");
      setAdjustNotes("");
    } catch (err: any) {
      alert("Failed to post adjustment: " + err.message);
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  if (boutique === undefined || wallet === undefined || settlements === undefined || payouts === undefined || commissions === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading boutique ledger records...</p>
      </div>
    );
  }

  if (boutique === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <h2 className="text-lg font-serif font-bold text-hive-dark">Merchant Not Found</h2>
        <p className="text-xs text-hive-text-muted">No boutique matches the provided ID.</p>
        <Link href="/admin/payouts" className="text-xs underline text-hive-amber mt-2">
          Back to Payout Control Panel
        </Link>
      </div>
    );
  }

  // Filter listings based on active tab
  const tabSettlements = settlements.filter((s) => s.type === "accrual");
  const tabRefundDeductions = settlements.filter((s) => s.type === "refund_deduction");
  const tabAdjustments = settlements.filter((s) => s.type === "adjustment");

  return (
    <div className="flex flex-col gap-8 text-left font-sans">
      {/* Header Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/admin/payouts" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Boutique Ledger History</h1>
          <p className="text-sm text-hive-text-muted">Comprehensive transaction audit sheets for {boutique.boutiqueName}.</p>
        </div>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border border-hive-border bg-white p-5 flex flex-col justify-between min-h-[105px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">Pending Balance</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-xl font-black text-amber-950 tracking-tight">{formatCurrency(wallet.pendingBalance)}</span>
            <span className="text-[9px] text-[#A89F91] font-semibold mt-1">Escrowed in Claim Windows</span>
          </div>
        </Card>

        <Card className="border border-emerald-200 bg-emerald-50/20 p-5 flex flex-col justify-between min-h-[105px]">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Available Balance</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-xl font-black text-emerald-950 tracking-tight">{formatCurrency(wallet.availableBalance)}</span>
            <span className="text-[9px] text-emerald-700 font-bold mt-1">Cleared for Immediate Payout</span>
          </div>
        </Card>

        <Card className="border border-hive-border bg-white p-5 flex flex-col justify-between min-h-[105px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">Total Paid Out</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-xl font-black text-hive-dark tracking-tight">{formatCurrency(wallet.totalPaidOut)}</span>
            <span className="text-[9px] text-[#A89F91] font-semibold mt-1">Settled to Bank Accounts</span>
          </div>
        </Card>

        <Card className="border border-hive-border bg-white p-5 flex flex-col justify-between min-h-[105px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">Lifetime Accruals</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-xl font-black text-hive-dark tracking-tight">{formatCurrency(wallet.lifetimeEarnings)}</span>
            <span className="text-[9px] text-[#A89F91] font-semibold mt-1">Total Sales Earnings Accrued</span>
          </div>
        </Card>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Ledger tables (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Tab selector */}
          <div className="flex flex-wrap gap-2 border-b border-hive-border/60 pb-2">
            {[
              { id: "settlements", label: `Accruals (${tabSettlements.length})` },
              { id: "payouts", label: `Payouts (${payouts.length})` },
              { id: "refunds", label: `Refunds (${tabRefundDeductions.length})` },
              { id: "adjustments", label: `Adjustments (${tabAdjustments.length})` },
              { id: "commissions", label: `Commissions (${commissions.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-hive-dark text-white font-extrabold shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Tables */}
          <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
            {activeTab === "settlements" && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Accrued At</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tabSettlements.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-3.5 font-mono text-[10px] text-slate-500">
                        {s.orderId || "—"}
                      </td>
                      <td className="px-6 py-3.5">{formatDate(s.accruedAt)}</td>
                      <td className="px-6 py-3.5">
                        {s.status === "available" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                            ✓ {s.payoutId ? "Paid Out" : "Available"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Loader2 className="w-2 animate-spin text-amber-500" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-slate-900">
                        {formatCurrency(s.amount)}
                      </td>
                    </tr>
                  ))}
                  {tabSettlements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No accrual records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "payouts" && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Payout Number / Ref</th>
                    <th className="px-6 py-3.5">Settled At</th>
                    <th className="px-6 py-3.5">Bank Snapshot</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payouts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-bold text-slate-900">{p.payoutNumber}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">UTR: {p.utrReference || "Pending"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-3.5 text-slate-550 leading-relaxed font-mono text-[10px]">
                        {p.bankAccount.holderName}<br />
                        {p.bankAccount.accountNo} ({p.bankAccount.ifsc})
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-emerald-850">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No payouts logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "refunds" && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Deducted At</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tabRefundDeductions.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-3.5 font-mono text-[10px] text-slate-550">
                        {r.orderId || "—"}
                      </td>
                      <td className="px-6 py-3.5">{formatDate(r.accruedAt)}</td>
                      <td className="px-6 py-3.5 capitalize text-slate-500">{r.source}</td>
                      <td className="px-6 py-3.5 text-right font-black text-red-650">
                        {formatCurrency(r.amount)}
                      </td>
                    </tr>
                  ))}
                  {tabRefundDeductions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No refund deductions logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "adjustments" && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Adjustment Type</th>
                    <th className="px-6 py-3.5">Posted At</th>
                    <th className="px-6 py-3.5">Source / Note</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tabAdjustments.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3E0] text-amber-800 border border-amber-200 capitalize">
                          {a.adjustmentType ? a.adjustmentType.replace("_", " ") : "Manual Correction"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">{formatDate(a.createdAt)}</td>
                      <td className="px-6 py-3.5 text-slate-550 font-bold max-w-sm truncate">
                        {a.source === "admin" ? "Admin Correction" : a.source}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-black ${
                        a.amount < 0 ? "text-red-650" : "text-emerald-850"
                      }`}>
                        {formatCurrency(a.amount)}
                      </td>
                    </tr>
                  ))}
                  {tabAdjustments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No manual adjustments posted.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "commissions" && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Order Item</th>
                    <th className="px-6 py-3.5">Version</th>
                    <th className="px-6 py-3.5">Rate / Price</th>
                    <th className="px-6 py-3.5">GST (18% cuts)</th>
                    <th className="px-6 py-3.5 text-right">Net Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {commissions.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/30">
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-slate-500">Item: {c.orderItemId}</span>
                          <span className="text-[10px] text-[#A89F91] mt-0.5 font-semibold">Order: {c.orderId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono">
                          {c.commissionVersion}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{c.commissionRate}% cut</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Purchased: {formatCurrency(c.priceAtPurchase * c.quantity)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono">
                        {formatCurrency(c.gstAmount)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-slate-900">
                        {formatCurrency(c.commissionAmount)}
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No commission cuts logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Right Column: Actions Forms (Manual Adjustments & Trigger Payout) */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-serif font-black text-hive-dark">Wallet Operations</h2>
          
          {/* 1. Trigger Payout action */}
          <Card className="border border-hive-border bg-white shadow-sm rounded-3xl p-5 flex flex-col gap-4 text-left">
            <h3 className="text-xs font-bold text-hive-text-muted uppercase tracking-wider">
              Payout Batch Processor
            </h3>
            <div className="p-3.5 rounded-2xl border border-slate-150 bg-slate-50/50 flex flex-col gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Destination Bank Details</span>
              <span className="font-extrabold text-slate-800">{boutique.ownerName}</span>
              <span className="font-mono text-slate-600">Account No: 9999{boutique.phone.replace(/\D/g, "").slice(-8)}</span>
              <span className="font-mono text-slate-600">IFSC: HDFC0004321</span>
            </div>
            
            <button
              onClick={handleProcessPayout}
              disabled={wallet.availableBalance <= 0 || processingPayout}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition-all ${
                wallet.availableBalance > 0 && !processingPayout
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-100 text-slate-400 border-none cursor-not-allowed"
              }`}
            >
              {processingPayout ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>Disburse {formatCurrency(wallet.availableBalance)}</span>
            </button>
            {wallet.availableBalance <= 0 && (
              <p className="text-[10px] text-slate-400 italic text-center">No outstanding settled balance to pay out.</p>
            )}
          </Card>

          {/* 2. Manual Adjustment Form */}
          <Card className="border border-hive-border bg-white shadow-sm rounded-3xl p-5 flex flex-col gap-4 text-left">
            <h3 className="text-xs font-bold text-hive-text-muted uppercase tracking-wider">
              Post Ledger Adjustment
            </h3>
            
            <form onSubmit={handlePostAdjustment} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white text-xs font-bold text-slate-700"
                >
                  <option value="manual_credit">Manual Credit (Add Funds)</option>
                  <option value="bonus">Bonus / Incentive (Add Funds)</option>
                  <option value="commission_correction">Commission Correction (Add/Deduct)</option>
                  <option value="refund_correction">Refund Correction (Add/Deduct)</option>
                  <option value="penalty">Penalty Fee (Deduct Funds)</option>
                  <option value="manual_debit">Manual Debit (Deduct Funds)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450 text-xs font-extrabold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 500.00 (positive or negative)"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Explanation Notes</label>
                <textarea
                  required
                  rows={3}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Explain the reason for this manual correction..."
                  className="w-full p-3 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs text-slate-700 resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAdjustment}
                className="w-full py-2.5 px-4 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 disabled:opacity-50 font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {submittingAdjustment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Submit Manual Adjustment</span>
              </button>
            </form>
          </Card>
        </div>

      </div>
    </div>
  );
}
