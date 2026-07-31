"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Card, CardContent } from "@hive/ui";
import { formatCurrency, toast } from "@hive/utils";
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
  FileText,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Check
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

function RazorpayOnboarding({ boutique }: { boutique: any }) {
  const createLinkedAccountAction = useAction(api.razorpayRoute.createLinkedAccount);
  const getKYCOnboardingLinkAction = useAction(api.razorpayRoute.getKYCOnboardingLink);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState<"individual" | "proprietorship" | "partnership" | "private_limited" | "llp">("individual");
  const [pan, setPan] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [holderName, setHolderName] = useState("");

  useEffect(() => {
    if (boutique) {
      setLegalName(boutique.boutiqueName || "");
      setPan(boutique.pan || "");
      setHolderName(boutique.ownerName || "");
    }
  }, [boutique]);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName || !pan || !accountNumber || !ifsc || !holderName) {
      setFormError("All bank and business fields are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await createLinkedAccountAction({
        boutiqueId: boutique._id,
        legalName,
        businessType,
        pan: pan.toUpperCase().trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.toUpperCase().trim(),
        holderName,
      });
      toast.success("Account created successfully!");
      if (res.onboardingUrl) {
        window.open(res.onboardingUrl, "_blank");
      }
    } catch (err: any) {
      const msg = err.data || err.message || "Failed to submit onboarding details";
      const cleanMsg = typeof msg === "string" ? msg.replace(/^\[CONVEX .*?\]\s*/, "") : String(msg);
      setFormError(cleanMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteKYC = async () => {
    if (!boutique.razorpayAccountId) return;
    setLoadingLink(true);
    try {
      const res = await getKYCOnboardingLinkAction({
        razorpayAccountId: boutique.razorpayAccountId,
      });
      if (res.onboardingUrl) {
        window.open(res.onboardingUrl, "_blank");
      } else {
        toast.error("Failed to generate KYC onboarding link.");
      }
    } catch (err: any) {
      const msg = err.data || err.message || "Error generating onboarding link";
      const cleanMsg = typeof msg === "string" ? msg.replace(/^\[CONVEX .*?\]\s*/, "") : String(msg);
      toast.error(cleanMsg);
    } finally {
      setLoadingLink(false);
    }
  };

  // State 1: Active
  if (boutique.razorpayAccountId && boutique.razorpayAccountStatus === "active") {
    return (
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-2xl text-emerald-600 border border-emerald-100 shadow-sm shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800">Split Payouts Active</h4>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                <Check className="w-2.5 h-2.5" /> Active
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-xl">
              Earnings from online sales are automatically split and settled to your registered bank account:
            </p>
            {boutique.bankAccount && (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono font-semibold text-slate-600">
                <span>Holder: {boutique.bankAccount.holderName}</span>
                <span>IFSC: {boutique.bankAccount.ifsc}</span>
                <span>A/C: {boutique.bankAccount.accountNoLast4}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-mono self-end sm:self-center">
          ID: {boutique.razorpayAccountId}
        </div>
      </div>
    );
  }

  // State 2: Created (KYC Pending)
  if (boutique.razorpayAccountId) {
    return (
      <div className="bg-amber-50/40 border border-amber-100 rounded-3xl p-5 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-2xl text-amber-600 border border-amber-100 shadow-sm shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1 text-left">
            <h4 className="text-xs font-bold text-slate-800">Complete KYC Onboarding</h4>
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-xl">
              Your settlement account is registered on Razorpay Route (ID: <span className="font-mono text-slate-700">{boutique.razorpayAccountId}</span>), but payouts are on hold. You must complete Razorpay's KYC verification to start receiving payouts.
            </p>
          </div>
        </div>
        <button
          onClick={handleCompleteKYC}
          disabled={loadingLink}
          className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold text-xs rounded-2xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          {loadingLink ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              Complete KYC <ExternalLink className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
    );
  }

  // State 3: Setup Form / Missing Account
  return (
    <div className="mt-2 transition-all">
      {!showForm ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white rounded-2xl text-slate-500 border border-slate-200/50 shadow-sm shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <h4 className="text-xs font-bold text-slate-800">Setup Split Settlements</h4>
              <p className="text-[11px] font-medium text-hive-text-muted leading-relaxed max-w-xl">
                Hive uses Razorpay Route to split customer checkout payments and disburse earnings automatically. Register your legal business entity and bank account details below to link your account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Setup Settlements
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Link Bank Account for Automated Settlements</h3>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleOnboard} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Legal Business Name</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Acme Clothing Inc."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-slate-800 transition-colors"
              >
                <option value="individual">Individual / Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited</option>
                <option value="llp">LLP</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Business PAN</label>
              <input
                type="text"
                required
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCD1234E"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Account Holder Name</label>
              <input
                type="text"
                required
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Name as in Bank Account"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Bank Account Number</label>
              <input
                type="password"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Full Bank Account Number"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Bank IFSC Code</label>
              <input
                type="text"
                required
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0000001"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-slate-800 transition-colors"
              />
            </div>

            {formError && (
              <div className="md:col-span-2 text-xs text-red-500 font-bold bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-300 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Create Account & Onboard"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function BoutiqueFinance() {
  const me = useQuery(api.users.getMe);
  const finance = useQuery(api.boutiques.getBoutiqueFinance);
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const [activeTab, setActiveTab] = useState<"settlements" | "payouts">("settlements");

  if (me === undefined || finance === undefined || boutique === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading finance records...</p>
      </div>
    );
  }

  if (me && me.role === "boutique") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-serif font-bold text-hive-dark">Access Denied</h2>
        <p className="text-xs text-hive-text-muted max-w-sm">
          Financial metrics and payout details are restricted to boutique owners.
        </p>
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
            <div className="w-8 h-8 rounded-2xl bg-emerald-50/50 text-emerald-600 flex items-center justify-center border border-emerald-500/10">
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
            <div className="w-8 h-8 rounded-2xl bg-amber-50/50 text-amber-600 flex items-center justify-center border border-amber-500/10">
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
            <div className="w-8 h-8 rounded-2xl bg-blue-50/50 text-blue-600 flex items-center justify-center border border-blue-500/10">
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

      {/* Razorpay Route Onboarding Section */}
      <RazorpayOnboarding boutique={boutique} />

      {/* Tabs list */}
      <div className="flex items-center gap-2 border-b border-hive-border mt-6">
        <button
          onClick={() => setActiveTab("settlements")}
          className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "settlements"
              ? "border-[#F5C22B] text-[#D9A71E]"
              : "border-transparent text-hive-text-muted hover:text-hive-text"
          }`}
        >
          Recent Settlements ({settlements.length})
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "payouts"
              ? "border-[#F5C22B] text-[#D9A71E]"
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
                                <span className="font-mono font-bold text-[#D9A71E]">{s.orderNumber}</span>
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
                          <td className="py-4 px-6 text-right flex flex-col items-end gap-0.5">
                            <span className={`font-extrabold text-sm ${isNegative ? "text-red-500" : "text-slate-800"}`}>
                              {isNegative ? "-" : ""}{formatCurrency(Math.abs(s.amount) / 100)}
                            </span>
                            {s.snapshotMath && !isNegative && (
                              <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                                {formatCurrency(s.snapshotMath.basePrice / 100)} base - {formatCurrency(s.snapshotMath.platformFee / 100)} fee
                              </span>
                            )}
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
