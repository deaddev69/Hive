"use client";

import { useState } from "react";
import { Check, ArrowRight, Loader2, Sparkles, Tag, Percent, RefreshCcw, AlertTriangle, Settings, Wallet, Box, Info, FileText, Download, Eye, X, ShieldCheck, Lock } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LegalAgreementStep() {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const router = useRouter();
  const acceptTermsMutation = useMutation(api.boutiques.acceptLegalTerms);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await acceptTermsMutation();
      toast.success("Welcome to Hive! Your store is ready.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept legal terms. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const rules = [
    {
      title: "1. You Set Your Own Price",
      icon: <Tag className="w-4 h-4 text-hive-gold" />,
      content: "The price you enter is the amount you receive. If you list a product for ₹1,000, you receive ₹1,000 (subject to the return policy below)."
    },
    {
      title: "2. No Commission for Your First 30 Days*",
      icon: <Sparkles className="w-4 h-4 text-hive-gold" />,
      content: "For your first 30 days, Hive charges 0% commission on products with returns enabled."
    },
    {
      title: "3. If You Disable Returns",
      icon: <Percent className="w-4 h-4 text-hive-gold" />,
      content: "If you choose not to offer returns, a 2% platform fee will be deducted from the price you set for every order."
    },
    {
      title: "4. Wrong Items Must Be Accepted Back",
      icon: <RefreshCcw className="w-4 h-4 text-hive-gold" />,
      content: "If the wrong product is sent, the customer will be refunded and the item will be returned to you. Wrong-item returns are mandatory."
    },
    {
      title: "5. Repeated Wrong Orders",
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      content: "Sending the wrong product 3 times in one week will flag your account. If this continues over 3 different weeks, your store may be removed from Hive. Any pending payments will still be settled."
    },
    {
      title: "6. Store Default Return Policy",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="flex flex-col gap-3 mt-1">
          <span className="text-[12px] text-slate-500 font-medium">Auto-applies when listing new products.</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {/* Option A: Accept 24h Returns */}
            <div className="p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 text-left bg-emerald-50/60 border-emerald-500/80 shadow-2xs relative">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Accept 24h Returns</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full whitespace-nowrap">Recommended</span>
                </div>
                <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-1">Allows 24-hour voluntary size exchanges & returns.</p>
              </div>
            </div>

            {/* Option B: Final Sale Default */}
            <div className="p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 text-left bg-white border-slate-200">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Final Sale Only</span>
                </div>
                <p className="text-[11.5px] text-slate-500 font-medium leading-snug mt-1">No voluntary returns. Damaged items remain covered.</p>
              </div>
            </div>
          </div>
        </div>

      )
    },
    {
      title: "7. When You'll Be Paid",
      icon: <Wallet className="w-4 h-4 text-hive-gold" />,
      content: (
        <ul className="list-disc pl-4 space-y-1 marker:text-hive-gold mt-1">
          <li><strong>Returns enabled:</strong> Your payment is released after the return/exchange window closes.</li>
          <li><strong>Returns disabled:</strong> Your payment is released according to the normal settlement schedule.</li>
        </ul>
      )
    },
    {
      title: "8. Keep Your Stock Updated",
      icon: <Box className="w-4 h-4 text-hive-gold" />,
      content: (
        <div className="flex flex-col gap-2 mt-1">
          <span>Please update your inventory:</span>
          <ul className="list-disc pl-4 space-y-1 marker:text-hive-gold">
            <li>Before closing your store each day.</li>
            <li>Whenever a product is sold offline.</li>
          </ul>
          <span className="text-hive-text-muted mt-1">This helps prevent cancelled orders.</span>
        </div>
      )
    },
    {
      title: "9. Sell Only Available Products",
      icon: <Info className="w-4 h-4 text-hive-gold" />,
      content: "Only list products that are actually available. If an item goes out of stock, update it immediately."
    },
    {
      title: "10. You're Ready to Sell",
      icon: <Check className="w-4 h-4 text-hive-gold" />,
      content: "By continuing, you agree to Hive's Seller Terms & Conditions."
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] py-12 px-4 bg-slate-50 font-sans">
      <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-[32px] border border-hive-border shadow-sm">
        {/* Header */}
        <div className="text-center mb-8 border-b border-slate-100 pb-8">
          <h2 className="font-serif font-extrabold text-3xl text-hive-dark mb-3">Welcome to Hive 👋</h2>
          <p className="text-sm text-hive-text-muted">Before you start selling, here are a few important things to know.</p>
        </div>
        
        {/* Rules Container */}
        <div className="flex flex-col gap-6 mb-8">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-hive-cream/30 border border-hive-border flex items-center justify-center font-serif font-bold text-hive-amber text-sm shadow-sm">
                {idx + 1}
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <h3 className="text-sm font-bold text-hive-dark flex items-center gap-2">
                  {rule.icon} {rule.title}
                </h3>
                <div className="text-xs text-hive-text-muted leading-relaxed">
                  {rule.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Attached Document Card */}
        <div className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300/60 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800">Hive_Seller_Terms_and_Conditions.pdf</span>
              <span className="text-[10px] text-slate-500">Official Merchant Policy Document • Ref: HIVE-STC-2026-V1</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> View Policy
            </button>
            <a 
              href="/docs/Hive_Seller_Terms_and_Conditions.html" 
              download="Hive_Seller_Terms_and_Conditions.html"
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-6">
          <label 
            className={`flex items-center gap-3 p-4 rounded-[18px] border transition-all duration-200 cursor-pointer ${
              agreed ? "bg-amber-50/20 border-hive-amber" : "bg-hive-cream/10 border-hive-border hover:border-hive-amber/50"
            }`}
          >
            <input 
              type="checkbox" 
              className="sr-only"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
              agreed ? "bg-hive-amber border-hive-amber text-white" : "border-slate-300 bg-white"
            }`}>
              {agreed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
            <div className="flex-1 text-xs sm:text-sm font-semibold text-hive-dark select-none">
              I have read and agree to the Seller Terms & Conditions
            </div>
          </label>

          <button
            disabled={!agreed || submitting}
            onClick={handleComplete}
            className={`w-full py-4 rounded-full font-bold text-[11px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
              agreed 
                ? "bg-hive-dark text-white shadow-md hover:bg-black" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                Confirm & Enter Dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document View Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-slate-800">Hive Seller Terms & Conditions (Official Policy)</span>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <iframe 
                src="/docs/Hive_Seller_Terms_and_Conditions.html" 
                className="w-full h-[60vh] rounded-2xl border border-slate-200 bg-white"
                title="Seller Terms & Conditions Document"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <a 
                href="/docs/Hive_Seller_Terms_and_Conditions.html" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Open Fullscreen ↗
              </a>
              <button 
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-hive-dark hover:bg-black rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

