"use client";

import React, { useState, useEffect } from "react";
import { useAuth, SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { usePathname, useRouter } from "next/navigation";
import { Home, Tag, Package, ClipboardList, User, LogOut, Menu, X, Loader2, ShieldX, Wallet } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@hive/ui";
import { HiveLogo } from "@/components/shared/HiveLogo";
import LegalAgreementStep from "@/components/onboarding/LegalAgreementStep";

const BOUTIQUE_NAV_ITEMS = [
  { label: "Home", href: "/boutique", icon: Home },
  { label: "Products", href: "/boutique/products", icon: Tag },
  { label: "Stock", href: "/boutique/inventory", icon: Package },
  { label: "Orders", href: "/boutique/orders", icon: ClipboardList },
  { label: "Money", href: "/boutique/finance", icon: Wallet },
  { label: "More", href: "/boutique/profile", icon: User },
];

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.getMe);
  const myBoutiqueSafe = useQuery(api.boutiques.getMyBoutiqueSafe);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  console.log("[BoutiqueLayout] isLoaded:", isLoaded, "isSignedIn:", isSignedIn, "me:", me, "boutique:", myBoutiqueSafe);

  // Unauthenticated redirect
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Role-based redirect: customer goes to unauthorized portal
  useEffect(() => {
    if (me === undefined || myBoutiqueSafe === undefined) return;

    if (me) {
      if (me.role === "customer") {
        if (pathname !== "/boutique/unauthorized" && pathname !== "/unauthorized") {
          router.push("/boutique/unauthorized");
        }
        return;
      }
    }

    if (myBoutiqueSafe && !myBoutiqueSafe.exists) {
      // Allow user to view portal even without a boutique record, as requested.
      // We no longer redirect to /boutique/unauthorized here.
    }
  }, [me, myBoutiqueSafe, router, pathname]);

  // ── Loading guard ─────────────────────────────────────────────────────────
  // me===undefined → query in-flight → show spinner
  // me===null      → user not in Convex DB yet → show error (NOT loading)
  if (!isLoaded || me === undefined || myBoutiqueSafe === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
        <div className="flex flex-col gap-1">
          <span className="text-base font-serif font-black text-hive-dark">Hive Partners Portal</span>
          <span className="text-xs text-hive-text-muted">Loading secure session...</span>
        </div>
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center px-4">
        <ShieldX className="w-10 h-10 text-red-400" />
        <span className="text-base font-serif font-black text-hive-dark">Account Not Registered</span>
        <p className="text-xs text-hive-text-muted max-w-sm">
          Your Clerk account is not yet linked to a Convex user record.
          Sign out and sign back in — UserSync will register you automatically.
          If the problem persists, ensure your Convex user has{" "}
          <code className="bg-slate-100 px-1 rounded">role: &quot;boutique_owner&quot;</code> and a linked boutique.
        </p>
        <button
          onClick={() => router.push("/sign-in")}
          className="text-xs underline text-hive-amber mt-2"
        >
          Sign in again
        </button>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return null; // Hook redirects to sign-in
  }

  // Non-boutique signed in
  if ((me && me.role !== "boutique" && me.role !== "boutique_owner" && pathname !== "/boutique/unauthorized")) {
    return null; // Redirects to unauthorized
  }

  // Legal Gating Check
  if (myBoutiqueSafe && myBoutiqueSafe.exists && myBoutiqueSafe.boutique && !(myBoutiqueSafe.boutique as any).hasAcceptedLegalTerms) {
    return <LegalAgreementStep />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[#FAF6F0] text-slate-800">
      
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-[#FAF6F0] border-b border-[#F0E4C8] flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center">
          <Link href="/boutique" className="flex items-center hover:opacity-85 active:scale-[0.98] transition-all">
            <Image
              src="/logo.png"
              alt="Hive Partners"
              width={140}
              height={50}
              priority
              className="h-12 w-auto object-contain shrink-0"
            />
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col justify-between fixed inset-y-0 left-0 z-40 w-64 bg-[#FAF6F0] text-slate-700 border-r border-[#EBE3D0] p-6 md:static md:h-screen md:sticky md:top-0">
        <div className="flex flex-col gap-8">
          
          {/* Header Brand */}
          <div className="hidden md:flex items-center pb-6 border-b border-[#EBE3D0] w-full justify-start shrink-0">
            <Link href="/boutique" className="flex items-center hover:opacity-85 active:scale-[0.98] transition-all">
              <Image
                src="/logo.png"
                alt="Hive Partners"
                width={80}
                height={80}
                priority
                className="h-20 w-auto object-contain shrink-0"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {BOUTIQUE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-3 px-4.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive 
                      ? "text-[#BFA36F] font-bold" 
                      : "text-[#A89A7E] hover:text-[#BFA36F]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="flex flex-col gap-4 border-t border-[#EBE3D0] pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EED2B1] flex items-center justify-center text-slate-800 font-bold text-xs uppercase border border-[#EBE3D0]">
              {clerkUser?.firstName?.charAt(0) || "B"}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-bold text-slate-800 truncate">
                {clerkUser?.fullName || "Shop Owner"}
              </span>
              <span className="text-[9px] text-[#BFA36F] font-semibold tracking-wider uppercase">
                Partners Portal
              </span>
            </div>
          </div>

          <SignOutButton redirectUrl="/sign-in">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2.5 border-[#EBE3D0]/60 bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#BFA36F] hover:border-[#BFA36F]/40 rounded-xl text-xs py-2.5 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-150"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Log out</span>
            </Button>
          </SignOutButton>
        </div>
      </aside>

      {/* Page Content Slot */}
      <main className="flex-1 overflow-x-hidden md:h-screen md:overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-10 w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Footer */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#FAF6F0] border-t border-[#EBE3D0] z-50 flex items-center justify-around px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] pb-safe">
        {BOUTIQUE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full pt-1 transition-all duration-150 ${
                isActive 
                  ? "text-[#BFA36F]" 
                  : "text-[#A89A7E] hover:text-[#BFA36F]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
