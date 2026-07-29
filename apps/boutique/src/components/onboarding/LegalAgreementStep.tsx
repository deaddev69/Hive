"use client";

import { useState } from "react";
import { Check, ArrowRight, Loader2, Sparkles, Tag, Percent, RefreshCcw, AlertTriangle, Settings, Wallet, Box, Info } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LegalAgreementStep() {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();
  const acceptTermsMutation = useMutation(api.boutiques.acceptLegalTerms);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await acceptTermsMutation();
      toast.success("Welcome to Hive! Your store is ready.");
      // It should naturally advance based on parent state listening to `hasAcceptedLegalTerms`
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept legal terms. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const rules = [
    {
      title: "You Set Your Own Price",
      icon: <Tag className="w-4 h-4 text-hive-gold" />,
      content: "The price you enter is the amount you receive. If you list a product for ₹1,000, you receive ₹1,000 (subject to the return policy below)."
    },
    {
      title: "No Commission for Your First 30 Days*",
      icon: <Sparkles className="w-4 h-4 text-hive-gold" />,
      content: "For your first 30 days, Hive charges 0% commission on products with returns enabled."
    },
    {
      title: "If You Disable Returns",
      icon: <Percent className="w-4 h-4 text-hive-gold" />,
      content: "If you choose not to offer returns, a 2% platform fee will be deducted from the price you set for every order."
    },
    {
      title: "Wrong Items Must Be Accepted Back",
      icon: <RefreshCcw className="w-4 h-4 text-hive-gold" />,
      content: "If the wrong product is sent, the customer will be refunded and the item will be returned to you. Wrong-item returns are mandatory."
    },
    {
      title: "Repeated Wrong Orders",
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      content: "Sending the wrong product 3 times in one week will flag your account. If this continues over 3 different weeks, your store may be removed from Hive. Any pending payments will still be settled."
    },
    {
      title: "Choose Your Return Policy",
      icon: <Settings className="w-4 h-4 text-hive-gold" />,
      content: (
        <div className="flex flex-col gap-2 mt-1">
          <span>You can either:</span>
          <div className="flex flex-col gap-1 ml-2">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-600" /> Enable returns for all products</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Disable returns for all products</span>
          </div>
          <span className="text-hive-text-muted mt-1 italic">This setting applies to your entire store, not individual products.</span>
        </div>
      )
    },
    {
      title: "When You'll Be Paid",
      icon: <Wallet className="w-4 h-4 text-hive-gold" />,
      content: (
        <ul className="list-disc pl-4 space-y-1 marker:text-hive-gold mt-1">
          <li><strong>Returns enabled:</strong> Your payment is released after the return/exchange window closes.</li>
          <li><strong>Returns disabled:</strong> Your payment is released according to the normal settlement schedule.</li>
        </ul>
      )
    },
    {
      title: "Keep Your Stock Updated",
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
      title: "Sell Only Available Products",
      icon: <Info className="w-4 h-4 text-hive-gold" />,
      content: "Only list products that are actually available. If an item goes out of stock, update it immediately."
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
        <div className="flex flex-col gap-6 mb-10">
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

        {/* Action Row */}
        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-6">
          <div className="text-center">
            <span className="text-sm font-bold text-hive-dark">You're Ready to Sell</span>
            <p className="text-xs text-hive-text-muted mt-1">By continuing, you agree to Hive's Seller Terms & Conditions.</p>
          </div>

          <label 
            className={`flex items-center gap-3 p-4 rounded-[18px] border transition-all duration-200 cursor-pointer ${
              agreed ? "bg-hive-white border-hive-amber" : "bg-hive-cream/10 border-hive-border hover:border-hive-amber/50"
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
            <div className="flex-1 text-sm font-medium text-hive-dark select-none">
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
    </div>
  );
}
