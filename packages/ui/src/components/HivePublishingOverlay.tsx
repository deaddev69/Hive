"use client";

import React, { useEffect } from "react";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { cn } from "../utils/cn";

export interface HivePublishingOverlayProps {
  isOpen: boolean;
  productName?: string;
  isComplete?: boolean;
  onFinished?: () => void;
}

export const HivePublishingOverlay: React.FC<HivePublishingOverlayProps> = ({
  isOpen,
  productName = "Product",
  isComplete = false,
  onFinished,
}) => {
  useEffect(() => {
    if (isComplete && onFinished) {
      const timer = setTimeout(() => {
        onFinished();
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onFinished]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans select-none">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        
        {!isComplete ? (
          <>
            {/* Clean Minimal Spinner */}
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Saving Product
            </h3>

            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Uploading photos and saving details for <span className="font-semibold text-slate-700">&ldquo;{productName}&rdquo;</span>...
            </p>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-900 h-full rounded-full w-2/3 animate-pulse" />
            </div>
          </>
        ) : (
          <>
            {/* Clean Success State */}
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600 animate-in zoom-in duration-300">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Product Added
            </h3>

            <p className="text-xs text-slate-500 max-w-xs mb-5">
              <span className="font-semibold text-slate-700">&ldquo;{productName}&rdquo;</span> is now saved in your catalog.
            </p>

            {onFinished && (
              <button
                type="button"
                onClick={onFinished}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>Back to Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

      </div>
    </div>
  );
};
