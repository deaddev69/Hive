"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser, SignInButton, useAuth } from "@clerk/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { Store, CheckCircle2, Loader2, AlertTriangle, LogIn, ArrowRight } from "lucide-react";

export default function InviteClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { user: clerkUser } = useUser();

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
  if (!clerkLoaded || boutiqueInfo === undefined) {
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
            <p className="text-xs text-slate-400 text-center">Sign in to claim your merchant account</p>
            <SignInButton mode="modal" forceRedirectUrl={`/invite/${token}`}>
              <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign In to Claim
              </button>
            </SignInButton>
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
        {isSignedIn && clerkUser && (
          <p className="text-xs text-slate-400">
            Signed in as <strong className="text-slate-600">{clerkUser.primaryEmailAddress?.emailAddress}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
