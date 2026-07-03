import React, { useState, useEffect } from "react";
import { Modal } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { MapPin, X, Shield, Store, Lock, ShieldCheck, ChevronRight } from "lucide-react";

export const UnsupportedArea: React.FC = () => {
  const {
    city,
    isServiceable,
    setDrawerOpen,
    browseAllProducts,
    setBrowseAllProducts
  } = useLocation();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Never reopen the modal once the user has chosen to browse anyway
    if (browseAllProducts) {
      setIsOpen(false);
      return;
    }
    // Only open if location is selected, is not serviceable, and user hasn't bypassed it
    if (city && !isServiceable) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isServiceable, city, browseAllProducts]);

  // Do not render anything if: no city, location is serviceable, or user chose browse-all
  if (!city || isServiceable || browseAllProducts) return null;

  const handleBrowseAnyway = () => {
    // Persist the bypass flag so the modal won't reopen
    setBrowseAllProducts(true);
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      hideHeader={true}
      className="w-[92vw] max-w-md sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] bg-white border border-hive-border rounded-[28px] sm:rounded-3xl shadow-2xl p-0 outline-none overflow-hidden px-safe pb-[max(20px,env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-col text-center items-center">
        {/* Custom Header with compressed padding */}
        <div className="flex justify-between items-center w-full pb-3 border-b border-slate-100 mb-3 sm:mb-4 text-left py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center text-hive-gold flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight">Service Area</h2>
              <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-semibold mt-0.5">Choose your location</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kochi Vector Skyline Illustration (Cropped to remove whitespace) */}
        <svg viewBox="0 30 400 120" className="w-full max-w-[280px] sm:max-w-[340px] h-[110px] sm:h-[140px] my-0.5 sm:my-1" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Soft background glow */}
          <circle cx="200" cy="85" r="75" fill="url(#glow)" />

          {/* Clouds */}
          <path d="M 50 45 Q 60 38, 70 45 Q 80 38, 90 45" stroke="#D97706" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
          <path d="M 310 40 Q 320 33, 330 40 Q 340 33, 350 40" stroke="#D97706" strokeWidth="1" opacity="0.25" strokeLinecap="round" />

          {/* Left bridge tower and cables */}
          <path d="M 80 140 L 80 95 M 95 140 L 95 95 M 80 102 L 95 102 M 80 115 L 95 115 M 80 128 L 95 128" stroke="#D97706" strokeWidth="1" opacity="0.3" />
          <path d="M 125 140 L 125 95 M 140 140 L 140 95 M 125 102 L 140 102 M 125 115 L 140 115 M 125 128 L 140 128" stroke="#D97706" strokeWidth="1" opacity="0.3" />
          {/* Bridge Deck */}
          <line x1="60" y1="130" x2="160" y2="130" stroke="#D97706" strokeWidth="1.5" opacity="0.3" />
          {/* Bridge main cable */}
          <path d="M 60 130 Q 87 95, 110 115 Q 132 95, 160 130" stroke="#D97706" strokeWidth="1" opacity="0.35" fill="none" />

          {/* Left palm trees */}
          <path d="M 40 140 Q 42 120, 36 105" stroke="#D97706" strokeWidth="1.5" opacity="0.4" fill="none" />
          <path d="M 36 105 Q 26 107, 24 113 M 36 105 Q 30 97, 26 95 M 36 105 Q 40 95, 46 95 M 36 105 Q 46 101, 50 107 M 36 105 Q 42 113, 44 121" stroke="#D97706" strokeWidth="1" opacity="0.4" fill="none" />
          <path d="M 50 140 Q 48 125, 45 115" stroke="#D97706" strokeWidth="1.2" opacity="0.35" fill="none" />
          <path d="M 45 115 Q 38 116, 36 121 M 45 115 Q 40 108, 38 106 M 45 115 Q 48 107, 53 107 M 45 115 Q 53 111, 56 116" stroke="#D97706" strokeWidth="0.8" opacity="0.35" fill="none" />

          {/* Right palm trees */}
          <path d="M 285 140 Q 283 120, 289 105" stroke="#D97706" strokeWidth="1.5" opacity="0.4" fill="none" />
          <path d="M 289 105 Q 279 107, 277 113 M 289 105 Q 283 97, 279 95 M 289 105 Q 293 95, 299 95 M 289 105 Q 299 101, 303 107 M 289 105 Q 295 113, 297 121" stroke="#D97706" strokeWidth="1" opacity="0.4" fill="none" />

          {/* Right lighthouse */}
          <path d="M 320 140 L 326 95 L 334 95 L 340 140 Z" fill="#FFF" stroke="#D97706" strokeWidth="1.2" opacity="0.4" />
          <path d="M 324 95 L 324 87 L 336 87 L 336 95 Z" stroke="#D97706" strokeWidth="1.2" opacity="0.4" />
          <path d="M 324 87 A 6 6 0 0 1 336 87 Z" fill="#FFF" stroke="#D97706" strokeWidth="1.2" opacity="0.4" />
          {/* Light rays */}
          <line x1="310" y1="80" x2="295" y2="75" stroke="#D97706" strokeWidth="1" strokeDasharray="2,2" opacity="0.35" />
          <line x1="310" y1="85" x2="290" y2="85" stroke="#D97706" strokeWidth="1" strokeDasharray="2,2" opacity="0.35" />
          <line x1="350" y1="80" x2="365" y2="75" stroke="#D97706" strokeWidth="1" strokeDasharray="2,2" opacity="0.35" />
          <line x1="350" y1="85" x2="370" y2="85" stroke="#D97706" strokeWidth="1" strokeDasharray="2,2" opacity="0.35" />

          {/* Horizon lines */}
          <line x1="20" y1="140" x2="380" y2="140" stroke="#D97706" strokeWidth="1" opacity="0.25" />
          <line x1="40" y1="144" x2="360" y2="144" stroke="#D97706" strokeWidth="0.8" opacity="0.15" />

          {/* Giant Pin in Center */}
          <path d="M 200 120 C 182 100, 175 88, 175 75 A 25 25 0 1 1 225 75 C 225 88, 218 100, 200 120 Z" fill="url(#pinGrad)" filter="drop-shadow(0px 4px 10px rgba(217, 119, 6, 0.25))" />
          <circle cx="200" cy="75" r="7" fill="#FFFFFF" />
        </svg>

        {/* Hero Section copy */}
        <div className="flex flex-col gap-1.5 sm:gap-2.5 mt-2 mb-6">
          <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            Fashion, Available <span className="text-hive-gold">Near You</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-[280px] sm:max-w-md mx-auto leading-relaxed font-medium">
            Choose a Kochi location to see what's available in your area.
          </p>
        </div>

        {/* CTA Section */}
        <div className="w-full flex flex-col items-center gap-3.5">
          <button
            onClick={() => {
              setIsOpen(false);
              setDrawerOpen(true);
            }}
            className="w-full h-12 sm:h-14 flex items-center justify-between bg-hive-amber hover:bg-[#B45309] text-white font-extrabold text-[11px] uppercase tracking-wider px-5 rounded-2xl transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>See What's Available Near You</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleBrowseAnyway}
            className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer mt-1 bg-transparent border-0 outline-none"
          >
            Continue without location
          </button>
        </div>

        {/* Footer Text */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium mt-4 sm:mt-5">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Your location helps us show what's available in your area.</span>
        </div>
      </div>
    </Modal>
  );
};

