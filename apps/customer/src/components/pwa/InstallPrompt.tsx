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

          {/* Premium Gold Shopping Bag Logo / Brand Mark */}
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-[#a47a24] mb-4 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 1.75 0zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 1.75 0z" />
            </svg>
          </div>

          {/* Punchy Onboarding Copy */}
          <h2 className="text-2xl md:text-3xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            Shop faster with Hive
          </h2>
          <p className="text-stone-500 text-xs md:text-sm mt-2 max-w-sm leading-relaxed">
            Install Hive for a faster, smoother shopping experience with instant access to your favourite boutiques.
          </p>

          {/* Divider line */}
          <div className="w-full h-px bg-stone-200/60 my-5" />

          {/* Clean, Checklist Benefits List */}
          <div className="space-y-3.5 text-sm text-slate-800 font-semibold w-full text-left px-4">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Opens instantly</span>
            </div>
            
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Live order tracking</span>
            </div>
            
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>One-tap checkout</span>
            </div>
          </div>

          {/* Divider line */}
          <div className="w-full h-px bg-stone-200/60 my-5" />

          {/* Primary Action / Install or iOS instructions fallback */}
          {!isIOS ? (
            <button 
              onClick={handleInstall}
              className="w-full bg-[#a47a24] hover:bg-[#8f6a1e] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] focus:outline-none"
            >
              <span>Install Hive</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          ) : (
            <div className="w-full bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3">
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
          
          {/* Softer opt-out link */}
          <button 
            onClick={handleDismiss}
            className="mt-4 w-full py-2 text-sm font-semibold text-stone-400 hover:text-stone-700 transition focus:outline-none"
          >
            Maybe later
          </button>

        </div>
      </div>
    </>
  );
}
