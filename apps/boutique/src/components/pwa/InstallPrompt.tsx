"use client";
import React, { useEffect } from "react";
import { usePWAInstallation } from "../../hooks/usePWAInstallation";

export function InstallPrompt() {
  const { showPrompt, handleDismiss, handleInstall, isIOS } = usePWAInstallation();

  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.update());
      });
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <>
      {/* Self-contained styling for display-mode standalone safety switch */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (display-mode: standalone) {
          .hive-partners-install-modal-overlay {
            display: none !important;
          }
        }
      `}} />

      <div className="hive-partners-install-modal-overlay fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4">
        <div className="relative w-full md:max-w-4xl bg-stone-900 text-stone-100 rounded-t-[32px] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border-t md:border border-stone-800 animate-in slide-in-from-bottom md:zoom-in duration-300">
          
          {/* Skip / Close Button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-10 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-stone-800 rounded-full text-sm font-medium text-stone-300 hover:bg-black/80 transition flex items-center gap-1 focus:outline-none"
            aria-label="Skip installation"
          >
            <span>Skip</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Left Panel: Content & Call to Actions */}
          <div className="flex-1 p-6 md:p-12 flex flex-col justify-between">
            <div className="space-y-4 md:space-y-6">
              {/* App Brand Identity */}
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-serif font-black tracking-tight text-white">Hive Partners</span>
              </div>

              {/* Hook Copy */}
              <div className="space-y-1.5 md:space-y-3">
                <h2 className="text-2xl md:text-5xl font-serif font-bold text-white leading-tight">
                  Manage your boutique <span className="text-amber-500 font-semibold">on the go.</span>
                </h2>
                <p className="text-stone-300 text-sm md:text-lg">
                  Add Hive Partners to your home screen for quick access to orders, inventory, and analytics.
                </p>
              </div>

              {/* Value Propositions */}
              <div className="py-2 md:py-4 grid grid-cols-3 md:grid-cols-1 gap-2 md:gap-4">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-4 text-center md:text-left">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 md:w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-100 text-xs md:text-base leading-tight">Order Alerts</h3>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-4 text-center md:text-left">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 md:w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-100 text-xs md:text-base leading-tight">Easy Delivery</h3>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-4 text-center md:text-left">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 md:w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-100 text-xs md:text-base leading-tight">Stock Updates</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Install Call-to-Actions */}
            <div className="space-y-4 pt-4 md:pt-6 border-t border-stone-850 mt-4">
              {!isIOS ? (
                <div className="space-y-2">
                  <button 
                    onClick={handleInstall}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-white text-stone-950 font-semibold rounded-xl hover:bg-stone-100 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span>Install Hive Partners</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </button>
                  <p className="text-center text-[10px] md:text-xs text-stone-400">
                    Add Hive Partners to your home screen for the best experience.
                  </p>
                </div>
              ) : (
                <div className="bg-[#1a1a1a] border border-stone-800 rounded-2xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-stone-800 rounded-lg shadow-sm text-stone-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-stone-200 text-sm font-medium">
                      Install Hive Partners on iOS Safari:
                    </p>
                    <p className="text-stone-400 text-xs">
                      Tap the <span className="font-semibold text-white">Share</span> icon in the browser menu, then choose <span className="font-semibold text-white">Add to Home Screen</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Showcase Graphic (Hidden on mobile) */}
          <div className="hidden md:block w-[40%] bg-stone-950 relative opacity-90">
            <img 
              src="/boutique_sketch.png" 
              alt="Watercolor Storefront Sketch" 
              className="w-full h-full object-cover grayscale brightness-90 contrast-110"
            />
            {/* Soft overlay gradient to blend with dark card */}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-transparent to-transparent pointer-events-none" />
          </div>

        </div>
      </div>
    </>
  );
}
