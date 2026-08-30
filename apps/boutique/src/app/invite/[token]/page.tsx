"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useSellerAuth } from "@/context/SellerAuthContext";
import { api } from "../../../../../../convex/_generated/api";
import { Store, CheckCircle2, Loader2, AlertTriangle, LogIn, ArrowRight, Sparkles } from "lucide-react";


export default function InviteClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { isAuthenticated: isSignedIn, isLoading, user: firebaseUser } = useFirebaseAuth();
  const { signInWithGoogle } = useSellerAuth();

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query boutique info by invite token (unauthenticated)
  const boutiqueInfo = useQuery(api.boutiques.getBoutiqueByInviteToken, { inviteToken: token });
  const claimInvite = useMutation(api.boutiques.claimBoutiqueInvite);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await claimInvite({ inviteToken: token });
      setClaimed(true);
      // Small delay then redirect to dashboard
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (e: any) {
      const msg = e?.data || e?.message || "Failed to claim invite";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setClaiming(false);
    }
  };

  // Auto-claim when user is signed in and boutique info is loaded
  useEffect(() => {
    if (isSignedIn && boutiqueInfo && !boutiqueInfo.ownerUserId && !claiming && !claimed && !error) {
      handleClaim();
    }
  }, [isSignedIn, boutiqueInfo]);

  // --- Loading State ---
  if (isLoading || boutiqueInfo === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-sm text-slate-500 font-medium">Loading invite details...</p>
        </div>
      </div>
    );
  }

  // --- Invalid / Expired Token ---
  if (boutiqueInfo === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Invalid Invite Link</h1>
            <p className="text-sm text-slate-500">
              This invite link is invalid, has expired, or has already been claimed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Already Claimed ---
  if (boutiqueInfo.ownerUserId && !claimed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Already Claimed</h1>
            <p className="text-sm text-slate-500">
              This merchant account has already been claimed by another user.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Claimed Successfully ---
  if (claimed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Hive! 🎉</h1>
            <p className="text-sm text-slate-500">
              Your merchant account for <strong className="text-slate-700">{boutiqueInfo.boutiqueName}</strong> has been activated.
            </p>
            <p className="text-xs text-slate-400 mt-2">Redirecting to your dashboard...</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  // --- Main Invite Page ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center gap-6">
        {/* Store Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
          <Store className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">You&apos;re Invited!</h1>
          <p className="text-sm text-slate-500">
            You&apos;ve been invited to manage <strong className="text-slate-700">{boutiqueInfo.boutiqueName}</strong> on the Hive Seller Platform.
          </p>
        </div>

        {/* Boutique Details */}
        <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 text-left flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Store</span>
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 font-medium">
              {boutiqueInfo.inviteStatus === "sent" ? "Pending Claim" : boutiqueInfo.inviteStatus}
            </span>
          </div>
          <span className="font-bold text-slate-900 text-lg">{boutiqueInfo.boutiqueName}</span>
          {boutiqueInfo.inviteExpiresAt && (
            <span className="text-xs text-slate-400">
              Expires: {new Date(boutiqueInfo.inviteExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Action */}
        {!isSignedIn ? (
          <div className="w-full flex flex-col gap-3">
            <p className="text-xs text-slate-500 text-center">Sign in with Google to activate your store</p>
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign in with Google & Activate Store
            </button>
          </div>
        ) : claiming ? (

          <div className="w-full flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-sm text-slate-500">Claiming your merchant account...</p>
          </div>
        ) : (
          <button
            onClick={handleClaim}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            Claim Account
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Signed in as */}
        {isSignedIn && firebaseUser && (
          <p className="text-xs text-slate-400">
            Signed in as <strong className="text-slate-600">{firebaseUser.email}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
