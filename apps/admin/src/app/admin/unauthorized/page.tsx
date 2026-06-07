"use client";

import React, { useState } from "react";
import { ShieldAlert, Loader2, LogOut } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const me = useQuery(api.users.getMe);
  const makeMeAdmin = useMutation(api.users.makeMeAdmin);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePromote = async () => {
    setLoading(true);
    try {
      await makeMeAdmin();
      alert("Role updated to ADMIN! Please refresh the page.");
      window.location.reload();
    } catch (err: any) {
      alert("Failed to promote: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <Card className="max-w-md w-full border border-hive-border rounded-3xl shadow-xl p-8 flex flex-col gap-6 bg-white">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-serif font-black text-hive-dark">Access Denied</h1>
          <p className="text-sm text-hive-text-muted">
            Only accounts with the <strong>ADMIN</strong> role are permitted to view the central marketplace registry console.
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
          <div className="text-xs text-hive-text-muted bg-hive-cream/40 p-3 rounded-xl">
            No synced profile session detected.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button 
            variant="primary" 
            onClick={handlePromote} 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Promoting...
              </>
            ) : (
              "Promote Account to Admin"
            )}
          </Button>
          
          <SignOutButton>
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </SignOutButton>
        </div>
      </Card>
    </div>
  );
}
