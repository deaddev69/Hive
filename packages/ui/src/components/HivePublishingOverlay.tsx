"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

export interface HivePublishingOverlayProps {
  isOpen: boolean;
  productName?: string;
  isComplete?: boolean;
  statusText?: string;
  onFinished?: () => void;
}

export const HivePublishingOverlay: React.FC<HivePublishingOverlayProps> = ({
  isOpen,
  productName = "Product",
  isComplete = false,
  statusText,
  onFinished,
}) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }

    const timer1 = setTimeout(() => setStage(1), 1200);
    const timer2 = setTimeout(() => setStage(2), 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isComplete && onFinished) {
      const timer = setTimeout(() => {
        onFinished();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onFinished]);

  if (!isOpen) return null;

  const stageMessages = [
    `Crafting luxury listing for "${productName}"...`,
    "Optimizing photos & color specifications...",
    "Notifying Hive Quality Ops in #ops-alert...",
  ];

  const currentMessage = statusText || stageMessages[Math.min(stage, 2)];

  return (
    <div className="fixed inset-0 z-[999] bg-[#1A1200]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300 font-sans overflow-hidden">
      
      {/* CSS Keyframe Animations for Wing Flutter & Bee Flight */}
      <style>{`
        @keyframes beeWingFlutter {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          50% { transform: rotate(18deg) scaleY(0.65); }
        }
        @keyframes beeFlightFloat {
          0% { transform: translate(-10px, 0px) rotate(-3deg); }
          25% { transform: translate(12px, -14px) rotate(4deg); }
          50% { transform: translate(0px, -24px) rotate(-2deg); }
          75% { transform: translate(-14px, -10px) rotate(3deg); }
          100% { transform: translate(-10px, 0px) rotate(-3deg); }
        }
        @keyframes sparklePulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }
        .animate-bee-wings {
          animation: beeWingFlutter 0.12s infinite ease-in-out;
          transform-origin: bottom center;
        }
        .animate-bee-flight {
          animation: beeFlightFloat 3.2s infinite ease-in-out;
        }
        .animate-sparkle-1 { animation: sparklePulse 2s infinite ease-in-out 0.2s; }
        .animate-sparkle-2 { animation: sparklePulse 2.4s infinite ease-in-out 0.8s; }
        .animate-sparkle-3 { animation: sparklePulse 1.8s infinite ease-in-out 1.4s; }
      `}</style>

      {/* Honeycomb Ambient Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="honeycomb-pattern" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
              <path d="M28 66L0 50L0 16L28 0L56 16L56 50Z M28 100L0 84L0 66L28 50L56 66L56 84Z" fill="none" stroke="#F5C22B" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#honeycomb-pattern)" />
        </svg>
      </div>

      {/* Floating Shimmer Sparkles */}
      <div className="absolute top-1/4 left-1/5 text-[#F5C22B]/40 animate-sparkle-1 pointer-events-none">
        <Sparkles className="w-8 h-8" />
      </div>
      <div className="absolute bottom-1/4 right-1/5 text-[#F5C22B]/40 animate-sparkle-2 pointer-events-none">
        <Sparkles className="w-10 h-10" />
      </div>
      <div className="absolute top-1/3 right-1/4 text-[#F5C22B]/30 animate-sparkle-3 pointer-events-none">
        <Sparkles className="w-6 h-6" />
      </div>

      {/* Central Interactive Animation Box */}
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full z-10">

        {!isComplete ? (
          <>
            {/* Flying Honeybee Container */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              
              {/* Glowing Golden Ambient Pulsing Ring */}
              <div className="absolute inset-0 rounded-full bg-[#F5C22B]/20 blur-xl animate-pulse" />
              <div className="absolute w-28 h-28 rounded-full border border-[#F5C22B]/30 animate-ping opacity-25" />
              
              {/* Flying Bee SVG */}
              <div className="animate-bee-flight relative z-10">
                <svg width="84" height="84" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  
                  {/* Left & Right Wings with flutteringWing animation */}
                  <g className="animate-bee-wings">
                    <ellipse cx="34" cy="32" rx="14" ry="24" fill="#F0E4C8" fillOpacity="0.75" stroke="#F5C22B" strokeWidth="1.5" transform="rotate(-30 34 32)" />
                    <ellipse cx="66" cy="32" rx="14" ry="24" fill="#F0E4C8" fillOpacity="0.75" stroke="#F5C22B" strokeWidth="1.5" transform="rotate(30 66 32)" />
                  </g>

                  {/* Bee Body Base (Warm Gold) */}
                  <ellipse cx="50" cy="58" rx="28" ry="34" fill="#F5C22B" />

                  {/* Dark Charcoal Stripes */}
                  <path d="M26 50 C38 46, 62 46, 74 50 C72 56, 68 60, 50 60 C32 60, 28 56, 26 50 Z" fill="#1A1200" />
                  <path d="M28 66 C38 62, 62 62, 72 66 C70 72, 64 76, 50 76 C36 76, 30 72, 28 66 Z" fill="#1A1200" />

                  {/* Cute Head & Eyes */}
                  <circle cx="50" cy="30" r="15" fill="#1A1200" />
                  <circle cx="44" cy="27" r="3.5" fill="#FFFFFF" />
                  <circle cx="56" cy="27" r="3.5" fill="#FFFFFF" />
                  <circle cx="45" cy="28" r="1.5" fill="#1A1200" />
                  <circle cx="57" cy="28" r="1.5" fill="#1A1200" />

                  {/* Antennae */}
                  <path d="M44 18 C40 10, 36 10, 34 12" stroke="#1A1200" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M56 18 C60 10, 64 10, 66 12" stroke="#1A1200" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Golden Stinger */}
                  <polygon points="50,92 46,86 54,86" fill="#D9A71E" />
                </svg>
              </div>

            </div>

            {/* Stage Message */}
            <h3 className="text-xl font-serif font-black text-[#F0E4C8] tracking-tight mb-2 transition-all duration-300">
              Publishing to Hive
            </h3>
            
            <p className="text-sm font-medium text-[#F0E4C8]/80 min-h-[40px] px-4 leading-relaxed transition-all duration-300 mb-6">
              {currentMessage}
            </p>

            {/* Glowing Golden Progress Bar */}
            <div className="w-56 h-2 bg-[#1A1200] border border-[#F5C22B]/30 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-[#D9A71E] via-[#F5C22B] to-[#FFE885] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,194,43,0.7)]"
                style={{ width: stage === 0 ? "35%" : stage === 1 ? "70%" : "92%" }}
              />
            </div>
          </>
        ) : (
          /* Completion Success Burst State */
          <div className="flex flex-col items-center animate-in zoom-in-90 duration-300">
            <div className="w-20 h-20 rounded-full bg-[#F5C22B] text-[#1A1200] flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(245,194,43,0.7)] border-2 border-[#FFE885]">
              <CheckCircle2 className="w-11 h-11 stroke-[2.5]" />
            </div>

            <h3 className="text-2xl font-serif font-black text-[#F0E4C8] tracking-tight mb-2">
              Listing Submitted to Hive! 🎉
            </h3>
            
            <p className="text-xs font-semibold text-[#F0E4C8]/80 max-w-xs leading-relaxed">
              Your product is saved and under admin review. Redirecting to catalog...
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
