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
          
          {/* Scannable Value Props (Premium SVGs instead of emojis) */}
          <div className="mt-6 space-y-4 text-sm text-slate-600 text-left">
            
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 text-[#a47a24] shrink-0">
                {/* Minimalist Star/Sparkle SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <p><strong className="text-slate-900 font-medium">On-demand luxury.</strong> Your ultimate destination for high-end fashion.</p>
            </div>
            
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 text-[#a47a24] shrink-0">
                {/* Minimalist Shopping Bag SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <p><strong className="text-slate-900 font-medium">Real-time curation.</strong> An exclusive catalog from the best stores around you.</p>
            </div>
            
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 text-[#a47a24] shrink-0">
                {/* Minimalist Clock/Timer SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <p><strong className="text-slate-900 font-medium">Skip the traffic.</strong> Get your outfit delivered in under 60 minutes.</p>
            </div>
          </div>

          {/* Conditional Install Action or iOS instructions fallback */}
          {isIOS ? (
            /* iOS Safari Fallback State (Platform agnostic text) */
            <div className="mt-8 w-full bg-[#111827] rounded-xl p-4 flex items-center gap-4 text-white shadow-lg border border-slate-800">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm md:text-base tracking-wide text-white">Install Hive App</p>
                <p className="text-[11px] md:text-xs text-slate-300 mt-0.5 leading-tight">
                  Tap the <strong className="text-white">Share</strong> icon below, then select <strong className="text-white">Add to Home Screen</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* Standard Android / Desktop Button */
            <button 
              onClick={handleInstall} 
              className="mt-8 w-full bg-[#111827] hover:bg-black text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] focus:outline-none"
            >
              <span>Install Hive</span> 
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          )}
          
          {/* Secondary Action: Continue on Web */}
          <button 
            onClick={handleDismiss}
            className="mt-3 w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-800 transition focus:outline-none"
          >
            Continue on web
          </button>

        </div>
      </div>
    </>
  );
}
