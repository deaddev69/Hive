"use client";
import React from "react";
import { usePWAInstallation } from "../../hooks/usePWAInstallation";

export function InstallPrompt() {
  const { showPrompt, handleDismiss, handleInstall, isIOS } = usePWAInstallation();

  if (!showPrompt) return null;

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
        <div className="relative w-full md:max-w-md bg-[#fdfbf7] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col p-6 md:p-8 border border-stone-200/40">
          
          {/* Header with minimal Hive branding */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-serif font-black text-slate-900 tracking-tight">Hive</h1>
            <button 
              onClick={handleDismiss} 
              className="px-3 py-1.5 bg-white/60 backdrop-blur-md border border-stone-200/20 rounded-full text-xs font-semibold text-slate-700 hover:bg-white transition focus:outline-none"
            >
              Skip ✕
            </button>
          </div>

          {/* Punchy Headline */}
          <h2 className="text-3xl font-serif text-slate-900 tracking-tight leading-snug text-left">
            Premium fashion.<br />
            <span className="text-[#a47a24] font-semibold">Delivered instantly.</span>
          </h2>
          
          {/* The 3-Liner (Who, What, How) */}
          <div className="mt-5 space-y-3 text-sm text-slate-600 leading-relaxed text-left">
            <p><strong>1.</strong> Hive is your ultimate destination for on-demand, high-end fashion.</p>
            <p><strong>2.</strong> We curate an exclusive, real-time catalog from the best stores around you.</p>
            <p><strong>3.</strong> Skip the traffic and get your outfit delivered in under 60 minutes.</p>
          </div>

          {/* Primary Action: Install or iOS instructions */}
          {!isIOS ? (
            <button 
              onClick={handleInstall}
              className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] focus:outline-none"
            >
              <span>Install Hive</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          ) : (
            <div className="mt-8 bg-amber-50/60 border border-amber-200/40 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-stone-700 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                </svg>
              </div>
              <div className="space-y-1 text-left">
                <p className="text-stone-850 text-xs font-bold uppercase tracking-wider">
                  Install Hive on iOS Safari:
                </p>
                <p className="text-stone-600 text-xs font-medium">
                  Tap the <span className="font-semibold text-stone-900">Share</span> icon in the browser menu, then choose <span className="font-semibold text-stone-900">Add to Home Screen</span>.
                </p>
              </div>
            </div>
          )}
          
          {/* Secondary Action: Continue on Web */}
          <button 
            onClick={handleDismiss}
            className="mt-4 w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition focus:outline-none"
          >
            Continue on web
          </button>

        </div>
      </div>
    </>
  );
}
