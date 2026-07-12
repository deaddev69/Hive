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

      <div className="hive-install-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-4xl bg-[#fdfbf7] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-stone-200/50 animate-in fade-in zoom-in duration-200">
          
          {/* Skip / Close Button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-6 right-6 z-10 px-3 py-1.5 bg-white/60 backdrop-blur-md border border-stone-200/20 rounded-full text-sm font-medium text-stone-850 hover:bg-white/80 transition flex items-center gap-1 focus:outline-none"
            aria-label="Skip installation"
          >
            <span>Skip</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Left Panel: Content & Call to Actions */}
          <div className="flex-1 p-8 md:p-12 flex flex-col justify-between">
            <div className="space-y-6">
              {/* App Brand Identity */}
              <div className="flex items-center gap-2">
                <span className="text-2xl font-serif font-black tracking-tight text-stone-950">Hive</span>
              </div>

              {/* Hook Copy */}
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-950 leading-tight">
                  Fashion that feels like <span className="text-[#a47a24] font-semibold">your city.</span>
                </h2>
                <p className="text-stone-600 text-lg">
                  Curated local fashion delivered to your door.
                </p>
              </div>

              {/* Value Propositions */}
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100/50 flex items-center justify-center text-[#a47a24]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.43a1.902 1.902 0 001.096-1.704V8.303a1.902 1.902 0 00-1.096-1.704L9 2.167v13.737z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">Local Finds</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-pink-100/50 flex items-center justify-center text-pink-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125V11.25c0-.446-.26-.846-.663-1.018l-3.125-1.34A1.125 1.125 0 0014.25 9.9V18.75m-9-4.75h10.5M5.25 7.5h6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">Fast Delivery</h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100/50 flex items-center justify-center text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">New Arrivals Daily</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Install Call-to-Actions */}
            <div className="space-y-6 pt-6 border-t border-stone-200/60">
              {!isIOS ? (
                <div className="space-y-3">
                  <button 
                    onClick={handleInstall}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-stone-950 text-white font-semibold rounded-xl hover:bg-stone-850 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span>Open Hive</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                  <p className="text-center text-xs text-stone-500">
                    Add Hive to your home screen for the best experience.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50/50 border border-amber-200/40 rounded-2xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-stone-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-stone-800 text-sm font-medium">
                      Install Hive on iOS Safari:
                    </p>
                    <p className="text-stone-600 text-xs">
                      Tap the <span className="font-semibold">Share</span> icon in the browser menu, then choose <span className="font-semibold text-stone-900">Add to Home Screen</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Showcase Graphic (Hidden on mobile) */}
          <div className="hidden md:block w-[40%] bg-stone-100 relative">
            <img 
              src="/boutique_sketch.png" 
              alt="Hive Local Fashion Storefront" 
              className="w-full h-full object-cover"
            />
            {/* Soft overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#fdfbf7] via-transparent to-transparent pointer-events-none" />
          </div>

        </div>
      </div>
    </>
  );
}
