"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Card, CardContent } from "@hive/ui";
import { ArrowLeft, Loader2, ShieldAlert, CheckCircle2, AlertTriangle, Play, RefreshCw, BarChart2, Coins } from "lucide-react";
import Link from "next/link";

export default function LedgerReconciliationPage() {
  const reconciliation = useQuery(api.adminFinance.runLedgerReconciliationAdmin);
  const reconcileMutation = useMutation(api.adminFinance.reconcileFinanceLedgerAdmin);
  const [running, setRunning] = useState(false);

  // Formatter helper (paise to INR)
  const formatCurrency = (paise?: number) => {
    if (paise === undefined) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const handleRunScan = async () => {
    setRunning(true);
    try {
      const result = await reconcileMutation();
      if (result.reconciled) {
        alert("Scan complete: 100% Reconciled! Platform records are fully balanced.");
      } else {
        alert(`Mismatch Detected: Found ${result.exceptionsCount} exception(s). System alert raised.`);
      }
    } catch (err: any) {
      console.error("Ledger reconciliation run failed:", err);
      alert(err.message || "Failed to execute ledger reconciliation scan.");
    } finally {
      setRunning(false);
    }
  };

  if (reconciliation === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Initializing ledger reconciliation scan...</p>
      </div>
    );
  }

  const { orderReconciliation, payoutReconciliation, refundReconciliation, reconciled } = reconciliation;

  return (
    <div className="flex flex-col gap-8 text-left font-sans">
      {/* Header Back Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/finance" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-black text-hive-dark">Ledger Reconciliation</h1>
            <p className="text-sm text-hive-text-muted">Ecosystem smoke test verifying mathematics across order, commission, settlement, and payout tables.</p>
          </div>
        </div>
        
        <button
          onClick={handleRunScan}
          disabled={running}
          className="flex items-center gap-2 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 rounded-xl text-xs py-2.5 px-4 font-extrabold transition-all shadow-sm"
        >
          {running ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>Execute Scan</span>
        </button>
      </div>

      {/* Main Reconciliation Result Banner */}
      <Card className={`border rounded-3xl p-6 ${
        reconciled 
          ? "border-green-200 bg-green-50/70"
          : "border-red-200 bg-red-50/70"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${
            reconciled
              ? "bg-green-150 text-green-700 border-green-200"
              : "bg-red-150 text-red-700 border-red-200"
          }`}>
            {reconciled ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
              <span>Ledger Health Check:</span>
              {reconciled ? (
                <span className="text-green-700 font-extrabold text-xs bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full">
                  100% RECONCILED (Passed)
                </span>
              ) : (
                <span className="text-red-700 font-extrabold text-xs bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full animate-pulse">
                  MISMATCH DETECTED (Exceptions Found)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-650 mt-1 max-w-2xl leading-relaxed">
              {reconciled
                ? "Platform records are fully balanced. The sum of boutique settlements, platform commissions, and refunds perfectly match order total economics."
                : "An accounting mismatch has occurred. Check the exception listings below to identify discrepancies between settlements, commissions, or refunds."}
            </p>
          </div>
        </div>
      </Card>

      {/* Domain Results Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* A. Order Economics */}
        <Card className={`border p-5 rounded-3xl ${orderReconciliation.passed ? "border-green-150" : "border-red-150"}`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">
              Order Economics (A)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              orderReconciliation.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-750 font-black animate-pulse"
            }`}>
              {orderReconciliation.passed ? "✓ Passed" : "✕ Failed"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-xs">
            <div className="flex justify-between font-bold text-slate-600">
              <span>Paid Orders Checked:</span>
              <span>{orderReconciliation.totalChecked}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-600 mt-1">
              <span>Exceptions Found:</span>
              <span className={orderReconciliation.passed ? "text-slate-500" : "text-red-700 font-black"}>
                {orderReconciliation.exceptions.length}
              </span>
            </div>
          </div>
        </Card>

        {/* B. Payout Batches */}
        <Card className={`border p-5 rounded-3xl ${payoutReconciliation.passed ? "border-green-150" : "border-red-150"}`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">
              Payout Batches (B)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              payoutReconciliation.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-755 font-black animate-pulse"
            }`}>
              {payoutReconciliation.passed ? "✓ Passed" : "✕ Failed"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-xs">
            <div className="flex justify-between font-bold text-slate-600">
              <span>Payouts Checked:</span>
              <span>{payoutReconciliation.totalChecked}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-600 mt-1">
              <span>Exceptions Found:</span>
              <span className={payoutReconciliation.passed ? "text-slate-500" : "text-red-700 font-black"}>
                {payoutReconciliation.exceptions.length}
              </span>
            </div>
          </div>
        </Card>

        {/* C. Refund Deductions */}
        <Card className={`border p-5 rounded-3xl ${refundReconciliation.passed ? "border-green-150" : "border-red-150"}`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">
              Refund Deductions (C)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              refundReconciliation.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-755 font-black animate-pulse"
            }`}>
              {refundReconciliation.passed ? "✓ Passed" : "✕ Failed"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-xs">
            <div className="flex justify-between font-bold text-slate-600">
              <span>Refunds Checked:</span>
              <span>{refundReconciliation.totalChecked}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-600 mt-1">
              <span>Exceptions Found:</span>
              <span className={refundReconciliation.passed ? "text-slate-500" : "text-red-700 font-black"}>
                {refundReconciliation.exceptions.length}
              </span>
            </div>
          </div>
        </Card>

      </div>

      {/* Discrepancy details */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-serif font-black text-hive-dark">Reconciliation Exceptions log</h2>

        {/* Order Exceptions */}
        {orderReconciliation.exceptions.length > 0 && (
          <Card className="border border-red-200 bg-white overflow-hidden rounded-3xl p-5 text-left">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Order Mismatch Exceptions
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase">
                    <th className="py-2 text-left">Order Number</th>
                    <th className="py-2 text-left">Order ID</th>
                    <th className="py-2 text-right">Expected Total</th>
                    <th className="py-2 text-right">Actual Sum</th>
                    <th className="py-2 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {orderReconciliation.exceptions.map((ex: any) => (
                    <tr key={ex.orderId} className="border-b border-slate-50 py-2">
                      <td className="py-2 font-bold text-slate-900">{ex.orderNumber}</td>
                      <td className="py-2 font-mono text-[10px] text-slate-400">{ex.orderId}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(ex.expected)}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(ex.actual)}</td>
                      <td className="py-2 text-right font-bold text-red-650">{formatCurrency(ex.diff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Payout Exceptions */}
        {payoutReconciliation.exceptions.length > 0 && (
          <Card className="border border-red-200 bg-white overflow-hidden rounded-3xl p-5 text-left">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Payout Discrepancy Exceptions
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase">
                    <th className="py-2 text-left">Payout Number</th>
                    <th className="py-2 text-left">Payout ID</th>
                    <th className="py-2 text-right">Payout Ledger Total</th>
                    <th className="py-2 text-right">Settlements Sum</th>
                    <th className="py-2 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutReconciliation.exceptions.map((ex: any) => (
                    <tr key={ex.payoutId} className="border-b border-slate-50 py-2">
                      <td className="py-2 font-bold text-slate-900">{ex.payoutNumber}</td>
                      <td className="py-2 font-mono text-[10px] text-slate-400">{ex.payoutId}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(ex.expected)}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(ex.actual)}</td>
                      <td className="py-2 text-right font-bold text-red-650">{formatCurrency(ex.diff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Refund Exceptions */}
        {refundReconciliation.exceptions.length > 0 && (
          <Card className="border border-red-200 bg-white overflow-hidden rounded-3xl p-5 text-left">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Refund Deduction Mismatches
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase">
                    <th className="py-2 text-left">Refund Number</th>
                    <th className="py-2 text-left">Order ID</th>
                    <th className="py-2 text-right">Expected Deduction</th>
                    <th className="py-2 text-right">Actual Deduction</th>
                  </tr>
                </thead>
                <tbody>
                  {refundReconciliation.exceptions.map((ex: any) => (
                    <tr key={ex.refundId} className="border-b border-slate-50 py-2">
                      <td className="py-2 font-bold text-slate-900">{ex.refundNumber}</td>
                      <td className="py-2 font-mono text-[10px] text-slate-400">{ex.orderId}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(ex.expectedDeduction)}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(ex.actualDeduction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {reconciled && (
          <p className="text-xs text-slate-400 italic py-8 text-center bg-white border border-hive-border rounded-3xl">
            Clean Audit Report: No exceptions found in platform double-entry books.
          </p>
        )}
      </div>

    </div>
  );
}
