"use client";

import React, { useState, useEffect } from "react";
import { useAuth, SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FolderKanban, Image as ImageIcon, Store, LogOut, Menu, X, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@hive/ui";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Categories", href: "/admin/categories", icon: FolderKanban },
  { label: "Banners", href: "/admin/banners", icon: ImageIcon },
  { label: "Boutiques", href: "/admin/boutiques", icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.getMe);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Unauthenticated redirect
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Non-admin redirect
  useEffect(() => {
    if (me && me.role !== "admin") {
      router.push("/admin/unauthorized");
    }
  }, [me, router]);

  // User is not synced yet or loading Clerk state
  if (!isLoaded || me === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-hive-amber" />
        <div className="flex flex-col gap-1">
          <span className="text-base font-serif font-black text-hive-dark">Hive Admin Control</span>
          <span className="text-xs text-hive-text-muted">Authenticating secure session...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return null; // Hook redirects to sign-in
  }

  // Non-admin signed in
  if (me && me.role !== "admin" && pathname !== "/admin/unauthorized") {
    return null; // Redirects to unauthorized
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800">
      
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-hive-dark text-white border-b border-hive-border/20 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-hive-gold flex items-center justify-center font-bold text-hive-dark text-sm">
            H
          </div>
          <span className="font-serif font-black tracking-tight text-sm text-hive-cream">
            HIVE ADMIN
          </span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-hive-dark text-slate-300 border-r border-hive-border/10 flex flex-col justify-between p-6 transition-transform duration-300 transform
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col gap-8">
          
          {/* Header Brand */}
          <div className="hidden md:flex items-center gap-2.5 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-hive-gold flex items-center justify-center font-bold text-hive-dark text-base">
              H
            </div>
            <span className="font-serif font-black tracking-tight text-base text-hive-cream">
              HIVE ADMIN
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive 
                      ? "bg-hive-gold text-hive-dark font-bold shadow-md shadow-hive-gold/15" 
                      : "hover:bg-white/5 hover:text-white"
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
        <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-hive-gold flex items-center justify-center text-hive-dark font-bold text-xs uppercase border border-hive-border/30">
              {clerkUser?.firstName?.charAt(0) || "A"}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-bold text-white truncate">
                {clerkUser?.fullName || "Admin User"}
              </span>
              <span className="text-[10px] text-hive-gold font-semibold tracking-wider uppercase">
                {me?.role}
              </span>
            </div>
          </div>

          <SignOutButton>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 border-white/10 text-white/90 hover:bg-red-500 hover:text-white hover:border-transparent rounded-xl text-xs py-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </Button>
          </SignOutButton>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/45 z-30 md:hidden animate-fade-in"
        />
      )}

      {/* Page Content Slot */}
      <main className="flex-1 overflow-x-hidden md:h-screen md:overflow-y-auto">
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
