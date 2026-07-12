"use client";
import React, { useState } from "react";
import { usePWAInstallation } from "../../hooks/usePWAInstallation";
import { HiveLogo } from "@/components/shared/HiveLogo";

export function InstallPrompt() {
  const { showPrompt, handleDismiss, handleInstall, isIOS } = usePWAInstallation();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (!showPrompt) return null;

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      handleInstall();
    }
  };

  return (
    <>
      {/* Self-contained styling for display-mode standalone safety switch */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (display-mode: standalone) {
          .hive-install-modal-overlay {
            display: none !important;
          }
        }
      `}} />

      <div className="hive-install-modal-overlay fixed inset-0 z-[100] flex flex-col items-center justify-end bg-black/40 backdrop-blur-sm sm:p-6 transition-opacity">
        
        {/* The Bottom Sheet Card */}
        <div className="relative w-full md:max-w-md bg-[#fdfbf7] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col p-6 md:p-8 border border-stone-200/40 text-center items-center">
          
          {/* Header minimal close */}
          <button 
            onClick={handleDismiss} 
            className="absolute top-4 right-4 p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-slate-500 transition focus:outline-none"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Premium Gold Hive Logo */}
          <div className="mb-4 mt-2 animate-in fade-in zoom-in-95 duration-500">
            <HiveLogo noLink size="md" className="scale-105" />
          </div>

          {/* Punchy Onboarding Copy */}
          <h2 className="text-2xl md:text-3xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            Your favourite boutiques.<br />
            <span className="text-[#a47a24] font-semibold">One tap away.</span>
          </h2>
          
          <p className="text-stone-500 text-sm mt-3 max-w-xs mx-auto leading-relaxed">
            The fastest way to shop nearby boutiques.
          </p>

          {/* Primary Action Button (dominates layout) */}
          <button 
            onClick={handleInstallClick}
            className="mt-6 w-full bg-[#a47a24] hover:bg-[#8f6a1e] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] focus:outline-none"
          >
            <span>Install Hive</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>

          {/* iOS Safari Fallback State - slides out only on click */}
          {isIOS && showIOSInstructions && (
            <div className="mt-4 w-full bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
              <div className="p-2 bg-[#a47a24]/10 rounded-lg text-[#a47a24] flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </div>
              <div className="space-y-0.5 text-left">
                <p className="text-stone-850 text-sm font-bold">Add to Home Screen</p>
                <p className="text-stone-600 text-xs leading-normal">
                  Tap the <span className="font-semibold text-stone-900">Share</span> icon in Safari, then select <span className="font-semibold text-stone-900">Add to Home Screen</span>.
                </p>
              </div>
            </div>
          )}

          {/* Clean, Checklist Benefits List */}
          <div className="mt-8 space-y-3.5 text-sm text-slate-800 font-semibold w-full text-left px-6">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Shop nearby boutiques</span>
            </div>
            
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Live delivery tracking</span>
            </div>
            
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Faster checkout</span>
            </div>
          </div>
          
          {/* Softer opt-out link */}
          <button 
            onClick={handleDismiss}
            className="mt-6 w-full py-2 text-sm font-semibold text-stone-400 hover:text-stone-700 transition focus:outline-none"
          >
            Not now
          </button>

        </div>
      </div>
    </>
  );
}
