"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/context/SessionContext";
import { X, Sparkles, ShoppingBag, Truck, ShieldCheck, ArrowRight } from "lucide-react";

export function FirstVisitAuthModal() {
  const router = useRouter();
  const { isAuthenticated, isGuest, setGuestMode, isLoading } = useSessionStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show modal only if not loading, not authenticated, and not already flagged as guest
    if (!isLoading && !isAuthenticated && !isGuest) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isAuthenticated, isGuest, isLoading]);

  if (!isOpen) return null;

  const handleClose = () => {
    setGuestMode(true);
    setIsOpen(false);
  };

  const handleLogin = () => {
    setGuestMode(true); // set guest mode so if they cancel signin they can browse
    router.push("/sign-in");
  };

  const handleSignUp = () => {
    setGuestMode(true);
    router.push("/sign-up");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-md border border-slate-200/60 dark:border-neutral-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-[popIn_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards] z-10 text-left">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-full border border-slate-100 dark:border-neutral-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Content */}
        <div className="text-center space-y-2 mt-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center border border-hive-border/30 mx-auto">
            <Sparkles className="w-6 h-6 text-hive-gold" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
            Welcome to Hive
          </h2>
          <p className="text-xs text-hive-text-muted font-medium max-w-[280px] mx-auto leading-relaxed">
             hyper-local designer apparel and custom alterations delivered to your door same-day.
          </p>
        </div>

        {/* Benefits list */}
        <div className="my-6 space-y-3 bg-slate-50 dark:bg-neutral-950 p-4 rounded-2xl border border-slate-100 dark:border-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-hive-gold/10 flex items-center justify-center text-hive-gold flex-shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Browse & buy from verified local designers
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-hive-gold/10 flex items-center justify-center text-hive-gold flex-shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Hyperlocal same-day delivery inside zones
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-hive-gold/10 flex items-center justify-center text-hive-gold flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Secure payments & easy 3-day returns
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleSignUp}
            className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-hive-dark/10 cursor-pointer"
          >
            <span>Create an Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleLogin}
            className="w-full h-11 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/40 active:scale-[0.98] transition-all rounded-2xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Log In to Account</span>
          </button>

          <button
            onClick={handleClose}
            className="w-full text-center py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer bg-transparent mt-1"
          >
            Continue as Guest
          </button>
        </div>

      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
