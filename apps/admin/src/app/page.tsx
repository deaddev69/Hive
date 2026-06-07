"use client";

import { useEffect, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserLandingPage } from "@hive/utils";
import { Loader2 } from "lucide-react";

function RootPageContent() {
  const me = useQuery(api.users.getMe);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (me === undefined) return;

    const redirectUrl = searchParams.get("redirect_url");
    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }

    const landingPage = getUserLandingPage(me?.role);
    if (landingPage.startsWith("http")) {
      window.location.href = landingPage;
    } else {
      router.replace(landingPage);
    }
  }, [me, router, searchParams]);

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
