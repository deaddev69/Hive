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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-serif font-black text-slate-900 tracking-tight">Hive</h1>
            {/* Replaced 'Skip' with a clean, minimal X icon */}
            <button 
              onClick={handleDismiss} 
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition focus:outline-none"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Punchy Headline (Tightened leading) */}
          <h2 className="text-3xl font-serif text-slate-900 tracking-tight leading-[1.1] text-left">
            Premium fashion.<br />
            <span className="text-[#a47a24] font-semibold">Delivered instantly.</span>
          </h2>
          
          {/* Scannable Value Props (Replaces the 1, 2, 3 wall of text) */}
          <div className="mt-6 space-y-4 text-sm text-slate-600 text-left">
            <div className="flex gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100/50 flex items-center justify-center flex-shrink-0 text-amber-600 text-xs">✨</div>
              <p><strong className="text-slate-800 font-bold">On-demand luxury.</strong> Your ultimate destination for high-end fashion.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100/50 flex items-center justify-center flex-shrink-0 text-amber-600 text-xs">📍</div>
              <p><strong className="text-slate-800 font-bold">Real-time curation.</strong> An exclusive catalog from the best stores around you.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100/50 flex items-center justify-center flex-shrink-0 text-amber-600 text-xs">⚡</div>
              <p><strong className="text-slate-800 font-bold">Skip the traffic.</strong> Get your outfit delivered in under 60 minutes.</p>
            </div>
          </div>

          {/* Primary Action: Install or iOS instructions */}
          {!isIOS ? (
            <button 
              onClick={handleInstall}
              className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] focus:outline-none"
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
