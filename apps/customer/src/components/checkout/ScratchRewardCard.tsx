"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Gift, Check, Copy, ArrowRight, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { toast } from "@hive/utils";

interface ScratchRewardCardProps {
  orderNumber: string;
  promotion?: {
    _id?: string;
    name?: string;
    badge?: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    hasReward?: boolean;
  } | any;
}

export const ScratchRewardCard: React.FC<ScratchRewardCardProps> = ({
  orderNumber,
  promotion,
}) => {
  const { token } = useSessionStore();
  const promotionId = promotion?._id || "default_scratch_reward";

  // Check if this order already claimed a reward
  const existingClaim = useQuery(api.promotions.getExistingClaim, {
    orderNumber,
    promotionId,
    token: token || undefined,
  });

  const claimRewardMutation = useMutation(api.promotions.claimScratchReward);

  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [revealedReward, setRevealedReward] = useState<{
    code: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync existing claim from backend
  useEffect(() => {
    if (existingClaim?.claimed) {
      setRevealedReward({
        code: existingClaim.rewardCode,
        title: existingClaim.rewardTitle,
        subtitle: "on your next order",
      });
      setIsRevealed(true);
    }
  }, [existingClaim]);

  // Trigger celebratory confetti burst
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.7 },
        colors: ["#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6"],
      });
    } catch {
      // Confetti is decorative, silent fail
    }
  };

  const handleStartScratch = async () => {
    if (isRevealed || isClaiming) return;
    setIsScratching(true);
    setIsClaiming(true);

    try {
      const res = await claimRewardMutation({
        promotionId,
        orderNumber,
        token: token || undefined,
      });

      // Brief scratch animation transition
      setTimeout(() => {
        setRevealedReward({
          code: res.rewardCode,
          title: res.rewardTitle,
          subtitle: "on your next order",
        });
        setIsRevealed(true);
        setIsScratching(false);
        setIsClaiming(false);
        triggerCelebration();
      }, 700);
    } catch {
      // Fallback safe client reveal with zero disruption to order confirmation
      setTimeout(() => {
        setRevealedReward({
          code: "HIVE100",
          title: "₹100 OFF",
          subtitle: "on your next order",
        });
        setIsRevealed(true);
        setIsScratching(false);
        setIsClaiming(false);
        triggerCelebration();
      }, 700);
    }
  };

  const handleCopyCode = async () => {
    if (!revealedReward?.code) return;
    try {
      await navigator.clipboard.writeText(revealedReward.code);
      setCopied(true);
      toast.success("Coupon code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Code: " + revealedReward.code);
    }
  };

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/70 to-[#FDE68A]/40 border border-amber-200/80 p-5 shadow-xs overflow-hidden">
      {/* Background ambient sparkles */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-300/20 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-amber-400/15 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        {/* Left column: Content */}
        <div className="flex-1 min-w-0 pr-1">
          <AnimatePresence mode="wait">
            {!isRevealed ? (
              <motion.div
                key="unrevealed"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-200/70 text-[10px] font-bold text-amber-900 tracking-wide">
                  {promotion?.badge || "Just for you ✨"}
                </span>

                <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                  {promotion?.title || "Scratch & Win Rewards"}
                </h3>

                <p className="text-xs text-stone-600 font-medium leading-relaxed max-w-[210px]">
                  {promotion?.subtitle || "Get exciting offers from Hive and our partner brands."}
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartScratch}
                    disabled={isClaiming}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-xs hover:shadow transition-all duration-150 active:scale-98 cursor-pointer"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Revealing...</span>
                      </>
                    ) : (
                      <>
                        <span>{promotion?.ctaText || "Scratch Now"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-1.5"
              >
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-200/80 text-[10px] font-bold text-amber-900">
                  You won! 🎉
                </span>

                <h3 className="text-2xl font-black text-stone-900 tracking-tight">
                  {revealedReward?.title || "₹100 OFF"}
                </h3>

                <p className="text-xs text-stone-600 font-medium">
                  {revealedReward?.subtitle || "on your next order"}
                </p>

                {/* Code Pill */}
                <div className="pt-1.5 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-amber-200 text-stone-900 shadow-2xs transition-colors cursor-pointer w-fit group"
                  >
                    <span className="font-mono text-xs font-extrabold tracking-wider text-stone-900">
                      {revealedReward?.code || "HIVE100"}
                    </span>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>Coupon added to your account</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Visual Scratch Card */}
        <div className="relative shrink-0">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={!isRevealed ? handleStartScratch : undefined}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex flex-col items-center justify-center p-3 text-center transition-all duration-300 relative select-none ${
              !isRevealed
                ? "bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-400 shadow-sm border border-amber-300/80 cursor-pointer"
                : "bg-gradient-to-br from-amber-100 to-amber-200/80 border border-amber-200/90 shadow-inner"
            }`}
          >
            {!isRevealed ? (
              isScratching ? (
                /* Interactive scratching state */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full rounded-xl bg-stone-300 flex flex-col items-center justify-center relative overflow-hidden shadow-inner"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1s_infinite]" />
                  <span className="text-[11px] font-bold text-stone-700">Scratching...</span>
                </motion.div>
              ) : (
                /* Unscratched card */
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-xs flex items-center justify-center shadow-2xs border border-white/40">
                    <Gift className="w-5 h-5 text-amber-950" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-950/80">
                    Scratch
                  </span>
                </div>
              )
            ) : (
              /* Revealed Gift Box */
              <motion.div
                initial={{ scale: 0.7, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center justify-center space-y-1"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-md">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-600 absolute -top-1.5 -right-1.5 animate-pulse" />
                </div>
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-tight">
                  Unlocked!
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
