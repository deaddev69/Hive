"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Scissors, HelpCircle, ChevronRight } from "lucide-react";

function ClaimsFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [mounted, setMounted] = useState(false);
  const [issueType, setIssueType] = useState("sizing");
  const [description, setDescription] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-hive-cream/30 flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-3 border-hive-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-sm text-center space-y-6 animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-green-500">
          <CheckCircle2 className="w-10 h-10 stroke-[1.8]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-hive-dark">Claim Submitted</h1>
          <p className="text-xs text-hive-text-muted leading-relaxed">
            Your support request has been logged successfully. A boutique representative will contact you to coordinate sizes replacements or adjustments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/account/orders")}
          className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Back to Purchases</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="border-b border-hive-border/40 pb-4 text-left">
        <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block mb-1">
          fits & Quality Support
        </span>
        <h2 className="font-serif text-xl font-bold text-hive-dark">Report Order Issue</h2>
        <p className="text-[10px] text-hive-text-muted mt-1 leading-normal">
          Log fitting disputes or request replacements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        
        {/* Order ID */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="orderId" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
            Order Reference ID
          </label>
          <input
            id="orderId"
            type="text"
            required
            readOnly
            value={orderId}
            className="h-10 px-4 text-xs border border-hive-border rounded-xl focus:outline-none bg-hive-cream/30 text-hive-text-muted/80 font-semibold"
          />
        </div>

        {/* Issue Type */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="issueType" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
            Select Issue Category
          </label>
          <select
            id="issueType"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full"
          >
            <option value="sizing">Garment Sizing (Fits Tighter/Looser)</option>
            <option value="damage">Damaged Product / Weaving Flaw</option>
            <option value="incorrect">Incorrect Item Delivered</option>
            <option value="alterations">Request Additional Doorstep Alterations</option>
          </select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
            Describe the Issue
          </label>
          <textarea
            id="description"
            rows={4}
            required
            placeholder="Please detail chest, waist or length discrepancies or damage areas..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium placeholder:opacity-50"
          />
        </div>

        {/* CTA */}
        <button
          type="submit"
          className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Submit Request</span>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>

      </form>
    </div>
  );
}

export default function NewClaimPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-hive-cream/30 py-16 px-4 flex flex-col items-center justify-center gap-6 select-none text-left">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="self-start max-w-md mx-auto w-full flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200 pl-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <Suspense fallback={
        <div className="min-h-[300px] flex items-center justify-center">
          <span className="w-8 h-8 rounded-full border-3 border-hive-gold border-t-transparent animate-spin" />
        </div>
      }>
        <ClaimsFormContent />
      </Suspense>
      
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
