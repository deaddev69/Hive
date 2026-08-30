"use client";

import React, { useEffect } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card } from "@hive/ui";
import { useRouter } from "next/navigation";
import { useSellerAuth } from "@/context/SellerAuthContext";

export default function BoutiqueUnauthorizedPage() {
  const me = useQuery(api.users.getMe);
  const router = useRouter();
  const { signOut } = useSellerAuth();

  // Auto-redirect to dashboard if role is valid (e.g. after syncUser upgraded it)
  useEffect(() => {
    if (me && (me.role === "boutique" || me.role === "boutique_owner" || me.role === "admin")) {
      // With Firebase there's no JWT role claim to refresh — Convex reads role from DB directly.
      // A simple full-page reload ensures all Convex queries re-run with the correct role.
      window.location.href = "/boutique";
    }
  }, [me, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center bg-slate-50">
      <Card className="max-w-md w-full border border-hive-border rounded-3xl shadow-xl p-8 flex flex-col gap-6 bg-white">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-serif font-black text-hive-dark">Access Denied</h1>
          <p className="text-sm text-hive-text-muted">
            Only accounts with the <strong>Seller</strong> role are permitted to view the Seller Portal.
          </p>
        </div>

        {me ? (
          <div className="bg-hive-cream/40 p-4 rounded-2xl border border-hive-border/60 text-left flex flex-col gap-1.5 text-xs">
            <span className="font-semibold uppercase tracking-wider text-hive-text-muted">Current Session</span>
            <span className="font-bold text-hive-dark truncate">{me.email}</span>
            <span>
              Assigned Role: <span className="font-extrabold text-hive-amber capitalize">{me.role}</span>
            </span>
          </div>
        ) : (
          <div className="text-xs text-hive-text-muted bg-hive-cream/40 p-3 rounded-xl flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-hive-amber" />
            Loading profile...
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out / Switch Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
