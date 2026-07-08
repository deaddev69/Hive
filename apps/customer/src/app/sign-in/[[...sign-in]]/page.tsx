"use client";

import React, { Suspense } from "react";
import { FirebaseAuthCard } from "@/components/auth/FirebaseAuthCard";
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
        
        <Suspense fallback={<div className="p-10 text-center text-xs">Loading secure sign in...</div>}>
          <FirebaseAuthCard title="Welcome back" subtitle="Secure sign in with Google or mobile OTP" />
        </Suspense>
      </div>
    </div>
  );
}
