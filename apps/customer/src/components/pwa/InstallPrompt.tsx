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

  // Dedicated Apple-style iOS instructions screen
  if (isIOS && showIOSInstructions) {
    return (
      <div className="hive-install-modal-overlay fixed inset-0 z-[100] flex flex-col items-center justify-end bg-black/40 backdrop-blur-sm sm:p-6 transition-opacity">
        <div className="relative w-full md:max-w-md bg-[#fdfbf7] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col p-6 md:p-8 border border-stone-200/40 text-center items-center overflow-hidden">
          
          {/* Radial concentric rings pattern */}
          <svg className="absolute inset-0 pointer-events-none opacity-30" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="80" r="100" stroke="url(#goldGrad)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="140" stroke="url(#goldGrad)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="180" stroke="url(#goldGrad)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="220" stroke="url(#goldGrad)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="260" stroke="url(#goldGrad)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="300" stroke="url(#goldGrad)" strokeWidth="0.5" />
            <defs>
              <radialGradient id="goldGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 80) rotate(90) scale(300)">
                <stop offset="0%" stopColor="#a47a24" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#a47a24" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          {/* Premium Gold Hive Logo */}
          <div className="mb-4 mt-2">
            <HiveLogo noLink size="sm" />
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            Add to Home Screen
          </h2>
          
          <div className="my-6 w-14 h-14 bg-[#a47a24]/10 rounded-2xl flex items-center justify-center text-[#a47a24] shrink-0 animate-bounce">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
          </div>

          <p className="text-stone-600 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Tap the <span className="font-semibold text-stone-900">Share</span> icon in your Safari browser menu below, then select <span className="font-semibold text-stone-900">Add to Home Screen</span>.
          </p>

          <button 
            onClick={handleDismiss}
            className="w-full bg-neutral-950 hover:bg-neutral-900 text-white py-3 rounded-xl font-bold transition active:scale-[0.98] focus:outline-none"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

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
        <div className="relative w-full md:max-w-md bg-[#fdfbf7] rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-in slide-in-from-bottom duration-350 flex flex-col px-5 pb-6 pt-5 md:p-8 border border-stone-200/40 text-center items-center overflow-hidden">
          
          {/* Faint Concentric Lines Background */}
          <svg className="absolute inset-0 pointer-events-none opacity-40" viewBox="0 0 400 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="80" r="80" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="100" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="120" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="140" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="160" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="180" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="200" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="220" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="240" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="260" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="280" stroke="url(#radialGold)" strokeWidth="0.5" />
            <circle cx="200" cy="80" r="300" stroke="url(#radialGold)" strokeWidth="0.5" />
            <defs>
              <radialGradient id="radialGold" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 80) rotate(90) scale(300)">
                <stop offset="0%" stopColor="#a47a24" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#a47a24" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          {/* Minimalist Close Button */}
          <button 
            onClick={handleDismiss} 
            className="absolute top-4 right-4 p-1.5 bg-stone-200/50 hover:bg-stone-200/80 rounded-full text-slate-600 transition focus:outline-none z-10"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Branded Golden Hive Logo */}
          <div className="mb-1 mt-2 animate-in fade-in zoom-in-95 duration-500 relative z-10">
            <HiveLogo noLink size="sm" />
          </div>

          {/* Editorial Headline */}
          <h2 className="text-2xl md:text-3xl font-serif text-slate-900 tracking-tight leading-[1.15] mt-4 relative z-10">
            Fashion, made<br />
            <span className="text-[#a47a24] italic font-normal">effortless.</span>
          </h2>
          
          {/* Supporting Statement */}
          <p className="text-stone-500 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed relative z-10">
            The fastest way to shop and get your style delivered to you.
          </p>

          {/* Main Action Button */}
          <button 
            onClick={handleInstallClick}
            className="mt-5 w-full max-w-[300px] bg-neutral-950 hover:bg-neutral-900 text-white py-3 sm:py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] focus:outline-none relative z-10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            <span>Install Hive</span>
          </button>

          {/* Metadata Captions */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px] text-stone-500 font-medium relative z-10">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Safe</span>
            <span className="text-stone-300">•</span>
            <span>Fast</span>
            <span className="text-stone-300">•</span>
            <span>No App Store</span>
          </div>

          {/* 3-Column Benefits List */}
          <div className="grid grid-cols-3 divide-x divide-stone-200/60 mt-6 w-full max-w-sm relative z-10">
            
            {/* Benefit 1 */}
            <div className="px-1 text-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a47a24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5 text-[#a47a24]">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <h3 className="text-[11px] font-bold text-slate-900 leading-tight">Opens instantly</h3>
              <p className="text-[9px] text-stone-500 leading-normal mt-0.5 max-w-[85px] mx-auto">Faster than browser.</p>
            </div>
            
            {/* Benefit 2 */}
            <div className="px-1 text-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a47a24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5 text-[#a47a24]">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <h3 className="text-[11px] font-bold text-slate-900 leading-tight">Live tracking</h3>
              <p className="text-[9px] text-stone-500 leading-normal mt-0.5 max-w-[85px] mx-auto">Track in real time.</p>
            </div>
            
            {/* Benefit 3 */}
            <div className="px-1 text-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a47a24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1.5 text-[#a47a24]">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <h3 className="text-[11px] font-bold text-slate-900 leading-tight">Easy checkout</h3>
              <p className="text-[9px] text-stone-500 leading-normal mt-0.5 max-w-[85px] mx-auto">One tap to shop.</p>
            </div>

          </div>
          
          {/* Minimal "Not now" link */}
          <button 
            onClick={handleDismiss}
            className="mt-5 text-stone-400 hover:text-stone-700 text-xs font-semibold tracking-wide underline decoration-stone-300 hover:decoration-stone-600 underline-offset-4 transition focus:outline-none relative z-10"
          >
            Not now
          </button>
        </div>
      </div>
    </>
  );
}
