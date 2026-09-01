// apps/boutique/src/app/sign-in/[[...sign-in]]/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { getRedirectResult } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useSellerAuth } from "@/context/SellerAuthContext";
import { Loader2 } from "lucide-react";
import Image from "next/image";

/** Only allow same-origin relative paths as post-login redirect targets (blocks open redirect). */
function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/boutique";
  return target;
}

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useFirebaseAuth();
  const { signInWithGoogle } = useSellerAuth();

  // Handle redirect result on page load (for PWA redirect flow)
  useEffect(() => {
    // getClientAuth() safely called inside useEffect — client-only
    const auth = getClientAuth();
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("[SignIn] Redirect result received:", result.user.email);
        }
      })
      .catch((err) => {
        // Ignore expected non-errors from getRedirectResult:
        // - auth/no-current-user: no redirect was in progress (normal on fresh page load)
        // - auth/argument-error: can occur if redirect resolver wasn't ready (safe to ignore)
        const ignorable = ["auth/no-current-user", "auth/argument-error", "auth/null-user"];
        if (err?.code && !ignorable.includes(err.code)) {
          console.error("[SignIn] Redirect error:", err);
          setError(err.message ?? "Sign-in failed after redirect.");
        }
      })
      .finally(() => setCheckingRedirect(false));
  }, []);

  // If already signed in, redirect away
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirect = safeRedirect(searchParams.get("redirect_url"));
      router.replace(redirect);
    }
  }, [isLoading, isAuthenticated, router, searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("[SignIn] Error:", err.code, err.message);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Check your connection and try again.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized. Contact the Hive team.");
      } else {
        setError(err.message ?? "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || checkingRedirect) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <span className="text-sm font-sans text-slate-500">Checking session...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100/60 p-4 font-sans relative overflow-hidden">
      {/* Subtle ambient luxury glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#F5C22B]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Single Unified Luxury Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] p-8 sm:p-10 flex flex-col items-center text-center gap-6">
          
          {/* Logo & Brand Pill */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 p-2.5 flex items-center justify-center shadow-lg border border-slate-800">
              <Image
                src="/logo-square.png?v=1"
                alt="Hive Partners"
                width={56}
                height={56}
                priority
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A71E]" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A67B10]">
                Partner Portal
              </span>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-[26px] font-serif font-black text-slate-900 tracking-tight">
              Sign In to Your Store
            </h1>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed mx-auto">
              Manage your boutique catalog, fulfill real-time orders, and track revenue.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="w-full p-3.5 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium rounded-xl text-left flex items-start gap-2 animate-in fade-in">
              <span className="text-rose-500 font-bold shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in Button */}
          <div className="w-full flex flex-col gap-3">
            <button
              id="google-sign-in-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-5 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50/80 text-slate-800 font-bold rounded-2xl transition-all duration-200 active:scale-[0.98] shadow-xs hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#D9A71E]" />
                  <span>Connecting account...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Access Note */}
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col items-center gap-1 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Access is reserved for verified partner Google accounts.
            </p>
            <p className="text-[11px] text-slate-500">
              Need access?{" "}
              <a 
                href="mailto:contact@hivenow.in" 
                className="font-bold text-slate-700 hover:text-slate-900 underline transition-colors"
              >
                Contact Hive Partner Team
              </a>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
