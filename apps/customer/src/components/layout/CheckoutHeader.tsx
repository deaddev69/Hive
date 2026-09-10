"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { HiveLogo } from "@/components/shared/HiveLogo";

interface CheckoutHeaderProps {
  backHref: string;
  subline?: string;
}

export const CheckoutHeader: React.FC<CheckoutHeaderProps> = ({ backHref }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-hive-dark/95 backdrop-blur-md border-b border-stone-200/70 dark:border-neutral-800/80 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-14 flex items-center justify-between gap-4">
        {/* Left Side: Deterministic Back button */}
        <div className="flex-1 flex justify-start items-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors duration-150 group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#F5C22B]" />
            <span>Back</span>
          </Link>
        </div>

        {/* Center: Brand Logo - Perfectly centered */}
        <div className="flex-shrink-0 flex justify-center items-center">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <HiveLogo noLink />
          </Link>
        </div>

        {/* Right Side: Whisper-quiet Luxury Security Badge (Anti-slop) */}
        <div className="flex-1 flex justify-end items-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100/80 dark:bg-neutral-800/80 border border-stone-200/60 dark:border-neutral-700/50 text-stone-500 dark:text-stone-400">
            <Lock className="w-3 h-3 text-stone-400 dark:text-stone-500 stroke-[1.75]" />
            <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-stone-600 dark:text-stone-300">
              Secure
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

