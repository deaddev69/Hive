"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

export interface HivePublishingOverlayProps {
  isOpen: boolean;
  productName?: string;
  isComplete?: boolean;
  onFinished?: () => void;
}

export const HivePublishingOverlay: React.FC<HivePublishingOverlayProps> = ({
  isOpen,
  productName = "Product",
  isComplete = false,
  onFinished,
}) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }
    const t1 = setTimeout(() => setStage(1), 1200);
    const t2 = setTimeout(() => setStage(2), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isOpen]);

  useEffect(() => {
    if (isComplete && onFinished) {
      const t = setTimeout(() => onFinished(), 1400);
      return () => clearTimeout(t);
    }
  }, [isComplete, onFinished]);

  if (!isOpen) return null;

  const stageMessages = [
    `Preparing listing for "${productName}"...`,
    "Processing product images & details...",
    "Submitting for Hive Quality Verification...",
  ];

  const progressWidth = stage === 0 ? "30%" : stage === 1 ? "68%" : "90%";

  return (
    <div className="fixed inset-0 z-[999] bg-[#FFFDF5] flex flex-col items-center justify-center p-6 text-center select-none font-sans overflow-hidden">

      <style>{`
        @keyframes beeWingFlutter {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          50%       { transform: rotate(20deg) scaleY(0.6); }
        }
        @keyframes beeFlightFloat {
          0%   { transform: translate(-8px,  0px) rotate(-3deg); }
          25%  { transform: translate(10px, -14px) rotate(4deg);  }
          50%  { transform: translate( 0px, -22px) rotate(-2deg); }
          75%  { transform: translate(-12px, -8px) rotate(3deg);  }
          100% { transform: translate(-8px,  0px) rotate(-3deg); }
        }
        @keyframes softSparkle {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50%       { opacity: 0.55; transform: scale(1.15); }
        }
        .anim-bee-wings  { animation: beeWingFlutter 0.13s infinite ease-in-out; transform-origin: bottom center; }
        .anim-bee-flight { animation: beeFlightFloat 3.4s infinite ease-in-out; }
        .anim-spark-1    { animation: softSparkle 2.2s infinite ease-in-out 0.1s; }
        .anim-spark-2    { animation: softSparkle 2.8s infinite ease-in-out 0.9s; }
        .anim-spark-3    { animation: softSparkle 1.9s infinite ease-in-out 1.6s; }
      `}</style>

      {/* Subtle warm honeycomb grid background */}
      <div className="absolute inset-0 opacity-[0.055] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hc-light" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.3)">
              <path d="M28 66L0 50L0 16L28 0L56 16L56 50Z M28 100L0 84L0 66L28 50L56 66L56 84Z"
                fill="none" stroke="#C48B0A" strokeWidth="2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hc-light)" />
        </svg>
      </div>

      {/* Soft amber sparkles */}
      <div className="absolute top-[22%] left-[16%] text-amber-400 anim-spark-1 pointer-events-none"><Sparkles className="w-6 h-6" /></div>
      <div className="absolute bottom-[26%] right-[18%] text-amber-300 anim-spark-2 pointer-events-none"><Sparkles className="w-8 h-8" /></div>
      <div className="absolute top-[38%] right-[12%] text-amber-300 anim-spark-3 pointer-events-none"><Sparkles className="w-5 h-5" /></div>

      <div className="relative flex flex-col items-center max-w-xs w-full z-10">

        {!isComplete ? (
          <>
            {/* Bee container */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-5">
              {/* Warm ivory glow disc */}
              <div className="absolute inset-2 rounded-full bg-amber-100/80 blur-lg" />
              {/* Thin amber ring */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-300/50" />
              {/* Spinning arc */}
              <div className="absolute inset-[-6px] rounded-full border-[3px] border-transparent border-t-amber-400 animate-spin" style={{ animationDuration: "1.1s" }} />

              {/* Bee */}
              <div className="anim-bee-flight relative z-10">
                <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g className="anim-bee-wings">
                    <ellipse cx="34" cy="32" rx="14" ry="24" fill="#FEF3C7" fillOpacity="0.9" stroke="#F5C22B" strokeWidth="1.5" transform="rotate(-30 34 32)" />
                    <ellipse cx="66" cy="32" rx="14" ry="24" fill="#FEF3C7" fillOpacity="0.9" stroke="#F5C22B" strokeWidth="1.5" transform="rotate(30 66 32)" />
                  </g>
                  <ellipse cx="50" cy="58" rx="28" ry="34" fill="#F5C22B" />
                  <path d="M26 50 C38 46, 62 46, 74 50 C72 56, 68 60, 50 60 C32 60, 28 56, 26 50 Z" fill="#1C1200" />
                  <path d="M28 66 C38 62, 62 62, 72 66 C70 72, 64 76, 50 76 C36 76, 30 72, 28 66 Z" fill="#1C1200" />
                  <circle cx="50" cy="30" r="15" fill="#1C1200" />
                  <circle cx="44" cy="27" r="3.5" fill="#FFFFFF" />
                  <circle cx="56" cy="27" r="3.5" fill="#FFFFFF" />
                  <circle cx="45" cy="28" r="1.5" fill="#1C1200" />
                  <circle cx="57" cy="28" r="1.5" fill="#1C1200" />
                  <path d="M44 18 C40 10, 36 10, 34 12" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M56 18 C60 10, 64 10, 66 12" stroke="#1C1200" strokeWidth="2.5" strokeLinecap="round" />
                  <polygon points="50,92 46,86 54,86" fill="#D9A71E" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[17px] font-serif font-black text-slate-800 tracking-tight mb-1.5">
              Publishing to Hive
            </h3>

            {/* Stage message */}
            <p className="text-[13px] font-medium text-slate-400 min-h-[36px] px-2 leading-relaxed mb-5 transition-all duration-300">
              {stageMessages[Math.min(stage, 2)]}
            </p>

            {/* Progress bar — light track, amber fill */}
            <div className="w-52 h-[5px] bg-amber-100 border border-amber-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-[#F5C22B] to-amber-300 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,194,43,0.45)]"
                style={{ width: progressWidth }}
              />
            </div>
          </>
        ) : (
          /* Success state */
          <div className="flex flex-col items-center animate-in zoom-in-90 duration-300">
            <div className="w-[72px] h-[72px] rounded-full bg-[#F5C22B] text-slate-900 flex items-center justify-center mb-4 shadow-[0_6px_24px_rgba(245,194,43,0.35)] border-4 border-amber-200">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-serif font-black text-slate-800 tracking-tight mb-1.5">
              Listing Submitted! 🎉
            </h3>
            <p className="text-[13px] font-medium text-slate-400 max-w-[220px] leading-relaxed">
              Under review by the Hive team. Redirecting to catalog...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
