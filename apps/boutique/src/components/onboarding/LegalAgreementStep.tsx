"use client";

import { useState, useRef, UIEvent } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LegalAgreementStep() {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();
  const acceptTermsMutation = useMutation(api.boutiques.acceptLegalTerms);
  const partnerAgreement = useQuery(api.legal.getLatestBySlug, { slug: "partner-agreement" });

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Check if the user has scrolled within 15px of the true absolute bottom
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 15;
    
    if (isBottom) {
      setHasReadToBottom(true);
    }
  };

  const handleComplete = async () => {
    try {
      await acceptTermsMutation();
      toast.success("Legal terms accepted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept legal terms. Please try again.");
    }
  };

  if (partnerAgreement === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
        <span className="text-xs text-hive-text-muted">Loading secure legal documents...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] p-4 bg-slate-50">
      <div className="w-full max-w-2xl mx-auto bg-[#FAF6F0] p-8 rounded-[32px] border border-hive-border">
        {/* Title Segment */}
        <span className="text-[10px] uppercase tracking-widest text-hive-gold font-bold">Step 3 of 4</span>
        <h2 className="font-serif font-extrabold text-2xl text-hive-malt mt-1 mb-6">Review Merchant Partnership Agreement</h2>
        
        {/* Premium Controlled Scroll Container */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-80 overflow-y-auto bg-hive-white rounded-[20px] border border-hive-border p-6 text-sm text-hive-malt/80 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-hive-gold/20"
        >
          {partnerAgreement ? (
            <div className="prose prose-sm prose-hive max-w-none">
              <ReactMarkdown>{partnerAgreement.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-red-500 text-sm">Error: Partnership Agreement document not found.</p>
          )}

          <p className="mb-4 text-center font-mono text-xs text-hive-gold pt-4 border-t border-dashed border-hive-border mt-8">
            --- End of Document Structure ---
          </p>
        </div>

        {/* Stateful Action Row */}
        <div className="mt-6 flex flex-col gap-4">
          <label 
            className={`flex items-start gap-3 p-4 rounded-[18px] border transition-all duration-200 cursor-pointer ${
              !hasReadToBottom ? "opacity-40 cursor-not-allowed bg-transparent border-transparent" : "bg-hive-white border-hive-border hover:border-hive-gold/50"
            }`}
          >
            <input 
              type="checkbox" 
              className="sr-only"
              disabled={!hasReadToBottom}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
              agreed ? "bg-hive-gold border-hive-gold text-hive-white" : "border-hive-border bg-hive-white"
            }`}>
              {agreed && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
            <div className="flex-1 text-xs text-hive-malt leading-normal">
              {!hasReadToBottom ? (
                <span className="text-hive-muted italic">Please read the agreement entirely to unlock authorization.</span>
              ) : (
                <span>I acknowledge and explicitly execute the legal commercial terms of the Hive Boutique Partner Agreement.</span>
              )}
            </div>
          </label>

          {/* Action Button */}
          <button
            disabled={!agreed}
            onClick={handleComplete}
            className={`w-full py-4 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
              agreed 
                ? "bg-hive-gold text-hive-white shadow-md hover:bg-hive-gold/90" 
                : "bg-[#E6E1DA] text-hive-muted cursor-not-allowed"
            }`}
          >
            Confirm & Advance to Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
