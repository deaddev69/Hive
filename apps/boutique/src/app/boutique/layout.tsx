"use client";

// QA Trigger: forcing Vercel redeployment
import React, { useState, useEffect } from "react";
import { useAuth, SignOutButton, useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { usePathname, useRouter } from "next/navigation";
import { Home, Tag, Package, ClipboardList, User, LogOut, Menu, X, Loader2, ShieldX, Wallet, Star, Plus, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button, LoadingState } from "@hive/ui";
import { HiveLogo } from "@/components/shared/HiveLogo";
import LegalAgreementStep from "@/components/onboarding/LegalAgreementStep";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { AudioAlertHeaderStatus } from "@/components/layout/AudioAlertHeaderStatus";

const BOUTIQUE_NAV_ITEMS = [
  { label: "Home", href: "/boutique", icon: Home },
  { label: "Products", href: "/boutique/products", icon: Tag },
  { label: "Stock", href: "/boutique/inventory", icon: Package },
  { label: "Orders", href: "/boutique/orders", icon: ClipboardList },
  { label: "Reviews", href: "/boutique/reviews", icon: Star },
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
  const { signOut } = useClerk();

  const navItems = me?.role === "boutique"
    ? BOUTIQUE_NAV_ITEMS.filter(item => item.label !== "Money")
    : BOUTIQUE_NAV_ITEMS;

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

  const boutique = (myBoutiqueSafe as any)?.boutique;


  // ── Loading guard ─────────────────────────────────────────────────────────
  // me===undefined → query in-flight → show spinner
  // me===null      → user not in Convex DB yet → show error (NOT loading)
  if (!isLoaded || me === undefined || myBoutiqueSafe === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Loading secure session..." variant="full" />
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
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="text-xs underline text-hive-amber mt-2"
        >
          Sign out and sign in again
        </button>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
        <span className="text-sm font-serif font-bold text-hive-dark">Redirecting to sign in...</span>
      </div>
    );
  }

  // Non-boutique / Non-admin signed in
  if (me && me.role !== "boutique" && me.role !== "boutique_owner" && me.role !== "admin" && pathname !== "/boutique/unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
        <span className="text-sm font-serif font-bold text-hive-dark">Redirecting...</span>
      </div>
    );
  }

  // Legal Gating Check
  if (myBoutiqueSafe && myBoutiqueSafe.exists && myBoutiqueSafe.boutique && !(myBoutiqueSafe.boutique as any).hasAcceptedLegalTerms) {
    return <LegalAgreementStep />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-white text-slate-800">
      
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white border-b border-[#f1f5f9] flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center">
          <Link href="/boutique" className="flex items-center hover:opacity-85 active:scale-[0.98] transition-all">
            <Image
              src="/logo-transparent.png?v=4"
              alt="Hive Partners"
              width={140}
              height={50}
              priority
              className="h-8 w-auto object-contain shrink-0"
            />
          </Link>
        </div>
        <AudioAlertHeaderStatus />
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col justify-between fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-700 border-r border-[#f1f5f9] p-6 md:static md:h-screen md:sticky md:top-0">
        <div className="flex flex-col gap-8">
          
          {/* Header Brand */}
          <div className="hidden md:flex items-center pb-6 border-b border-[#f1f5f9] w-full justify-start shrink-0">
            <Link href="/boutique" className="flex items-center hover:opacity-85 active:scale-[0.98] transition-all">
              <Image
                src="/logo-transparent.png?v=4"
                alt="Hive Partners"
                width={80}
                height={80}
                priority
                className="h-11 w-auto object-contain shrink-0"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center justify-between px-4.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive 
                      ? "text-[#020617] font-bold" 
                      : "text-[#94a3b8] hover:text-[#020617]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & Logout */}
        <div className="flex flex-col gap-4 border-t border-[#f1f5f9] pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-slate-800 font-bold text-xs uppercase border border-[#f1f5f9]">
              {clerkUser?.firstName?.charAt(0) || "B"}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-bold text-slate-800 truncate">
                {clerkUser?.fullName || "Shop Owner"}
              </span>
              <span className="text-[9px] text-[#020617] font-semibold tracking-wider uppercase">
                Partners Portal
              </span>
            </div>
          </div>

          <SignOutButton redirectUrl="/sign-in">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2.5 border-[#f1f5f9]/60 bg-white text-slate-600 hover:bg-white hover:text-[#020617] hover:border-[#020617]/40 rounded-xl text-xs py-2.5 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-150"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Log out</span>
            </Button>
          </SignOutButton>
        </div>
      </aside>

      {/* Page Content Slot */}
      <main className="flex-1 overflow-x-hidden md:h-screen md:overflow-y-auto pb-20 md:pb-0">
        <PushNotificationManager
          boutiqueId={(myBoutiqueSafe as any)?.boutique?._id}
          userId={me?._id}
        />
        <div className="p-4 md:p-10 w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Footer (With central gold floating Add button) */}
      {!pathname.includes("/products/new") && !pathname.includes("/products/edit") && (
        <nav className="md:hidden fixed bottom-4 inset-x-0 h-16 bg-white/95 backdrop-blur-md border border-slate-100/90 z-50 flex items-center justify-around px-2 shadow-[0_12px_36px_rgba(0,0,0,0.08)] rounded-2xl mx-4 pb-0 select-none">
          <Link 
            href="/boutique"
            className={`flex flex-col items-center justify-center w-full h-full pt-1 transition-all duration-150 relative ${
              pathname === "/boutique" ? "text-slate-900 font-bold" : "text-slate-400"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Home</span>
            {pathname === "/boutique" && (
              <span className="w-1 h-1 rounded-full bg-[#E9B929] mt-0.5 animate-pulse" />
            )}
          </Link>

          <Link 
            href="/boutique/products"
            className={`flex flex-col items-center justify-center w-full h-full pt-1 transition-all duration-150 relative ${
              pathname === "/boutique/products" && !pathname.includes("/new") ? "text-slate-900 font-bold" : "text-slate-400"
            }`}
          >
            <Tag className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Products</span>
            {pathname === "/boutique/products" && !pathname.includes("/new") && (
              <span className="w-1 h-1 rounded-full bg-[#E9B929] mt-0.5 animate-pulse" />
            )}
          </Link>

          <Link 
            href="/boutique/inventory"
            className={`flex flex-col items-center justify-center w-full h-full pt-1 transition-all duration-150 relative ${
              pathname === "/boutique/inventory" ? "text-slate-900 font-bold" : "text-slate-400"
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Stock</span>
            {pathname === "/boutique/inventory" && (
              <span className="w-1 h-1 rounded-full bg-[#E9B929] mt-0.5 animate-pulse" />
            )}
          </Link>

          <div className="flex items-center justify-center w-full h-full relative">
            <Link 
              href="/boutique/products/new"
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all -translate-y-4 border-4 border-white cursor-pointer z-10 bg-gradient-to-tr from-[#E9B929] to-[#F5C22B] text-slate-900 shadow-[0_6px_20px_rgba(233,185,41,0.4)] active:scale-95 hover:shadow-[0_10px_24px_rgba(233,185,41,0.5)]"
              title="Add Product"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </Link>
          </div>

          <Link 
            href="/boutique/orders"
            className={`flex flex-col items-center justify-center w-full h-full pt-1 transition-all duration-150 relative ${
              pathname === "/boutique/orders" ? "text-slate-900 font-bold" : "text-slate-400"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Orders</span>
            {pathname === "/boutique/orders" && (
              <span className="w-1 h-1 rounded-full bg-[#E9B929] mt-0.5 animate-pulse" />
            )}
          </Link>


          <Link 
            href="/boutique/profile"
            className={`flex flex-col items-center justify-center w-full h-full pt-1 transition-all duration-150 ${
              pathname === "/boutique/profile" ? "text-slate-900 font-bold" : "text-slate-400"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">More</span>
            {pathname === "/boutique/profile" && (
              <span className="w-1 h-1 rounded-full bg-[#E9B929] mt-0.5 animate-pulse" />
            )}
          </Link>
        </nav>
      )}
    </div>
  );
}
