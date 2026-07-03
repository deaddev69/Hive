"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Card, CardContent } from "@hive/ui";
import { Loader2, ArrowRight, Wallet, ArrowDownRight, ArrowUpRight, Plus, HelpCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function PayoutControlPanel() {
  const boutiques = useQuery(api.boutiques.getBoutiques, {});
  const queue = useQuery(api.adminBoutiques.getComplianceQueueAdmin);
  const triggerPayout = useMutation(api.adminFinance.triggerBoutiquePayoutAdmin);
  const postAdjustment = useMutation(api.adminFinance.postManualAdjustmentAdmin);

  // States
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  
  // Manual Adjustment Form states
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"bonus" | "penalty" | "commission_correction" | "refund_correction" | "manual_credit" | "manual_debit">("manual_credit");
  const [adjustNotes, setAdjustNotes] = useState<string>("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // Formatter helper (paise to INR)
  const formatCurrency = (paise?: number) => {
    if (paise === undefined) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const handleProcessPayout = async (boutiqueId: string) => {
    setProcessingPayoutId(boutiqueId);
    try {
      const payoutId = await triggerPayout({ boutiqueId: boutiqueId as any });
      alert(`Payout successfully batch-processed! UTR reference and snapshot recorded.`);
    } catch (err: any) {
      alert("Failed to process payout: " + err.message);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoutiqueId) return;

    const parsedAmount = parseFloat(adjustAmount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      alert("Please enter a valid non-zero amount.");
      return;
    }

    if (!adjustNotes.trim()) {
      alert("Please enter a note explaining the ledger adjustment.");
      return;
    }

    // Convert Rupees to paise
    const amountInPaise = Math.round(parsedAmount * 100);

    setSubmittingAdjustment(true);
    try {
      await postAdjustment({
        boutiqueId: selectedBoutiqueId as any,
        amount: amountInPaise,
        adjustmentType: adjustType,
        notes: adjustNotes,
      });
      alert("Compensating ledger adjustment entry posted successfully!");
      setSelectedBoutiqueId(null);
      setAdjustAmount("");
      setAdjustNotes("");
    } catch (err: any) {
      alert("Failed to post ledger adjustment: " + err.message);
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  if (boutiques === undefined || queue === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading merchant wallet balances...</p>
      </div>
    );
  }

  // Calculate global outstanding
  return (
    <div className="flex flex-col gap-8 text-left font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Payouts Control Panel</h1>
        <p className="text-sm text-hive-text-muted">Manage available merchant balances, verify compliance bank proofs, trigger payouts, and apply adjustments.</p>
      </div>

      {/* Main Table Card */}
      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Boutique / Owner</th>
                <th className="px-6 py-4">Compliance Status</th>
                <th className="px-6 py-4 text-right">Pending Balance</th>
                <th className="px-6 py-4 text-right">Available Balance</th>
                <th className="px-6 py-4 text-right">Total Paid Out</th>
                <th className="px-6 py-4 text-center">Wallet Action</th>
                <th className="px-6 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {queue.map((b) => {
                // Fetch live wallet balances from local query helper or do standard counts
                // To fetch Wallet in table, let's query it or use precomputed stats if available.
                // Wait! Since getBoutiqueWallet is a separate query, we can query it using a sub-component,
                // or compute it from the settlements we fetch, or create a boutique wallet list.
                // Let's create a beautiful sub-row/sub-component for the wallet fields to prevent full page re-fetches!
                return (
                  <MerchantRow
                    key={b._id}
                    boutique={b}
                    onTriggerPayout={() => handleProcessPayout(b._id)}
                    isProcessing={processingPayoutId === b._id}
                    onOpenAdjustment={() => setSelectedBoutiqueId(b._id)}
                    formatCurrency={formatCurrency}
                  />
                );
              })}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-450 italic">
                    No boutiques found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual Adjustment Modal Dialog */}
      {selectedBoutiqueId && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl border border-hive-border max-w-md w-full overflow-hidden shadow-xl animate-scale-up text-left">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h3 className="font-serif font-black text-slate-900 text-base">
                Post Ledger Adjustment
              </h3>
              <button
                onClick={() => setSelectedBoutiqueId(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-extrabold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handlePostAdjustment} className="p-6 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl flex gap-2.5 text-xs leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                <span>
                  <strong>Warning:</strong> Adjustments are compensating ledger lines that immediately affect the available wallet balance. Ensure audit notes are comprehensive.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white text-xs font-bold text-slate-800"
                >
                  <option value="manual_credit">Manual Credit (Add Funds)</option>
                  <option value="bonus">Bonus / Incentive (Add Funds)</option>
                  <option value="commission_correction">Commission Correction (Add/Deduct)</option>
                  <option value="refund_correction">Refund Correction (Add/Deduct)</option>
                  <option value="penalty">Penalty Fee (Deduct Funds)</option>
                  <option value="manual_debit">Manual Debit (Deduct Funds)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-455 text-xs font-extrabold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 250.00 (positive or negative)"
                    className="w-full pl-8 pr-4 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs font-extrabold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Justification Notes</label>
                <textarea
                  required
                  rows={3}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Enter details explaining this adjustment..."
                  className="w-full p-3 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs text-slate-700 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="submit"
                  disabled={submittingAdjustment}
                  className="flex-1 py-2.5 px-4 bg-hive-gold text-hive-dark font-extrabold text-xs rounded-xl shadow-sm hover:bg-hive-gold/90 transition-all flex items-center justify-center gap-1.5"
                >
                  {submittingAdjustment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Submit Adjustment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBoutiqueId(null)}
                  className="py-2.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sub-row component to fetch and render boutique specific wallet balances
 */
function MerchantRow({ boutique, onTriggerPayout, isProcessing, onOpenAdjustment, formatCurrency }: any) {
  const wallet = useQuery(api.adminFinance.getBoutiqueWallet, { boutiqueId: boutique._id });

  const isCompliant = boutique.compliance.verifiedCount >= 4;

  return (
    <tr className="hover:bg-slate-50/40 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col text-left">
          <span className="font-bold text-hive-dark">{boutique.boutiqueName}</span>
          <span className="text-[10px] text-hive-text-muted mt-0.5">{boutique.ownerName}</span>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        {isCompliant ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 border border-green-200 text-green-700">
            Compliant ({boutique.compliance.verifiedCount}/{boutique.compliance.totalCount})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
            Incomplete ({boutique.compliance.verifiedCount}/{boutique.compliance.totalCount})
          </span>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-800">
        {wallet ? formatCurrency(wallet.pendingBalance) : <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-slate-400" />}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right font-black text-emerald-850">
        {wallet ? formatCurrency(wallet.availableBalance) : <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-slate-400" />}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-550">
        {wallet ? formatCurrency(wallet.totalPaidOut) : <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-slate-400" />}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-center">
        <button
          onClick={onTriggerPayout}
          disabled={!wallet || wallet.availableBalance <= 0 || !isCompliant || isProcessing}
          className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold shadow-sm flex items-center justify-center gap-1 mx-auto transition-all ${
            wallet && wallet.availableBalance > 0 && isCompliant && !isProcessing
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-slate-100 text-slate-400 border-none cursor-not-allowed"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Wallet className="w-3 h-3" />
          )}
          <span>Process Payout</span>
        </button>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end gap-3 items-center">
          <button
            onClick={onOpenAdjustment}
            className="text-[10px] font-extrabold text-[#8E867C] hover:text-[#5C564E] border border-slate-200 rounded-xl px-2 py-1 bg-slate-50/50 hover:bg-slate-100"
          >
            Adjust Balance
          </button>
          
          <Link href={`/admin/finance/boutiques/${boutique._id}`}>
            <span className="text-[11px] text-hive-amber font-extrabold hover:underline cursor-pointer flex items-center gap-0.5">
              History <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </td>
    </tr>
  );
}
