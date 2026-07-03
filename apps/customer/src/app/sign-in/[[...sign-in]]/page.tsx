"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";
import { useLocation } from "@/context/LocationContext";

export default function SignInPage() {
  const { locality } = useLocation();

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-amber-50/40 via-hive-cream/30 to-orange-50/40 dark:from-neutral-950 dark:via-neutral-900/40 dark:to-neutral-950 flex flex-col justify-center pt-12 pb-28 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        {locality && (
          <div className="mb-4">
            <p className="text-[10px] font-medium tracking-[0.2em] text-hive-text-muted dark:text-neutral-400 uppercase text-center">
              Shopping near {locality}
            </p>
          </div>
        )}
        
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto w-full max-w-md",
              cardBox: "shadow-2xl border border-hive-border/30 dark:border-neutral-800/40 rounded-[2.5rem] overflow-hidden",
              card: "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-10 flex flex-col gap-6",
              header: "mb-4 flex flex-col gap-2 items-center",
              headerTitle: "font-serif text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white tracking-tight normal-case text-center",
              headerSubtitle: "text-xs sm:text-sm text-hive-text-muted font-sans font-normal tracking-wide normal-case text-center",
              socialButtonsBlockButton: "h-12 border border-slate-300 dark:border-neutral-700/80 bg-transparent rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-all font-medium text-slate-800 dark:text-neutral-200 mt-2 mb-1",
              socialButtonsProviderIcon: "w-[22px] h-[22px] transition-transform duration-200 hover:scale-105",
              socialButtonsBlockButtonText: "font-sans text-xs font-semibold tracking-wider uppercase text-slate-800 dark:text-neutral-200",
              dividerRow: "my-5 text-slate-300 dark:text-neutral-700",
              formField: "mb-4 flex flex-col gap-1.5",
              formFieldLabel: "text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400",
              formFieldInput: "h-11 rounded-xl border-slate-300 dark:border-neutral-800 focus:ring-hive-gold/45 focus:border-hive-gold text-xs font-medium bg-white dark:bg-neutral-900 transition-all",
              formButtonPrimary: "bg-hive-dark text-hive-gold hover:bg-hive-dark/95 border-none h-12 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all mt-4 hover:shadow-lg active:scale-[0.98]",
              footerActionLink: "text-hive-amber dark:text-hive-gold hover:text-hive-amber/80 font-bold transition-all",
              identityPreviewText: "text-xs font-medium text-hive-dark dark:text-hive-gold",
              footerLogoLink: "hidden",
              footerLogo: "hidden",
              internalBadge: "hidden",
            },
          }}
        />
      </div>
    </div>
  );
}
