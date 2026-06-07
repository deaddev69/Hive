"use client";

import { useEffect, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserLandingPage } from "@hive/utils";
import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

function RootPageContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useQuery(api.users.getMe);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    if (me === undefined || me === null) return;

    const redirectUrl = searchParams.get("redirect_url");
    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }

    const landingPage = getUserLandingPage(me.role);
    
    console.log("[AUTH DEBUG] User ID:", me._id);
    console.log("[AUTH DEBUG] Role:", me.role);
    console.log("[AUTH DEBUG] Computed landing page:", landingPage);
    
    if (landingPage.startsWith("http")) {
      console.log("[AUTH DEBUG] Redirecting to external URL:", landingPage);
      window.location.href = landingPage;
    } else {
      console.log("[AUTH DEBUG] Redirecting to internal route:", landingPage);
      router.replace(landingPage);
    }
  }, [isLoaded, isSignedIn, me, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center">
      <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
      <div className="flex flex-col gap-1">
        <span className="text-base font-serif font-black text-hive-dark">Hive Secure Access</span>
        <span className="text-xs text-hive-text-muted">Routing to your workspace...</span>
      </div>
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
        <div className="flex flex-col gap-1">
          <span className="text-base font-serif font-black text-hive-dark">Hive Secure Access</span>
        </div>
      </div>
    }>
      <RootPageContent />
    </Suspense>
  );
}
