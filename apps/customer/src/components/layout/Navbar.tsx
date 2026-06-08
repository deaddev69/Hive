"use client";

import React, { useState } from "react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { Badge } from "@hive/ui";
import { HiveLogo } from "@/components/shared/HiveLogo";
import {
  ShoppingBag,
  MapPin,
  Search,
  List,
  Menu,
  X,
  Package,
  Home,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export const Navbar: React.FC = () => {
  const { city, setDrawerOpen } = useLocation();
  const { itemsCount, setSidebarOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/90 dark:bg-hive-dark/90 backdrop-blur-md border-b border-hive-border/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          {/* ── Shared single-row bar ─────────────────────────────────── */}
          <div className="h-14 sm:h-16 flex items-center gap-2 sm:gap-4">

            {/* ── Zone 1: Logo (fixed, left anchor) ─────────────────── */}
            <div className="flex-shrink-0">
              <HiveLogo />
            </div>

            {/* ── Zone 2: Location pill (grows, truncates on overflow) ─ */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-hive-cream/80 hover:bg-hive-comb border border-hive-border/50 text-xs font-semibold text-hive-text transition-colors duration-200 min-w-0 max-w-[120px] sm:max-w-[180px]"
            >
              <MapPin className="w-3.5 h-3.5 text-hive-gold flex-shrink-0" />
              <span className="truncate leading-none">
                {city ? city : "Set Location"}
              </span>
            </button>

            {/* ── Zone 3: Desktop search bar (hidden on mobile) ──────── */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 max-w-md relative hidden md:block"
            >
              <input
                type="text"
                placeholder="Search local designer sarees, kurtis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-4 pr-10 rounded-xl bg-hive-cream/60 border border-hive-border/40 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-xs font-medium text-hive-text placeholder-hive-text-muted transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hive-text-muted hover:text-hive-dark transition-colors duration-150"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* ── Spacer: pushes action icons to right on mobile ─────── */}
            <div className="flex-1 md:hidden" />

            {/* ── Zone 4: Action icons (right anchor) ───────────────── */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">

              {/* My Orders — desktop only */}
              <Link
                href="/orders"
                className="hidden md:flex items-center gap-1.5 text-xs font-bold text-hive-text hover:text-hive-gold transition-colors duration-150"
              >
                <List className="w-4 h-4" />
                <span>My Orders</span>
              </Link>

              {/* Cart bag */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="relative p-1.5 text-hive-text hover:text-hive-gold transition-colors duration-150 outline-none"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
                {itemsCount > 0 && (
                  <Badge
                    variant="primary"
                    className="absolute -top-1.5 -right-1.5 scale-90 min-w-5 h-5 flex items-center justify-center font-bold px-1.5"
                  >
                    {itemsCount}
                  </Badge>
                )}
              </button>

              {/* ── Auth zone — same width slot regardless of state ──── */}
              <div className="flex items-center border-l border-hive-border/50 pl-2 sm:pl-3">
                <SignedIn>
                  <UserButton
                    userProfileUrl="/account"
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox:
                          "w-8 h-8 rounded-full border border-hive-border/60 hover:scale-[1.03] transition-transform duration-200",
                      },
                    }}
                  />
                </SignedIn>

                <SignedOut>
                  {/* Desktop: Login + Sign Up */}
                  <div className="hidden sm:flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className="h-9 px-4 rounded-lg border border-hive-border/70 text-xs font-bold text-hive-dark hover:bg-hive-cream/60 transition-colors duration-200">
                        Login
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="h-9 px-4 rounded-lg bg-hive-dark text-hive-gold text-xs font-bold hover:bg-hive-dark/90 active:scale-[0.98] transition-all duration-200 shadow-sm">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>

                  {/* Mobile: compact Login button only */}
                  <SignInButton mode="modal">
                    <button className="sm:hidden h-8 px-3 rounded-lg border border-hive-border/70 text-[11px] font-bold text-hive-dark hover:bg-hive-cream/60 transition-colors duration-200 whitespace-nowrap">
                      Login
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>

              {/* Mobile hamburger — opens slide-out menu */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="md:hidden p-1.5 text-hive-text hover:text-hive-gold transition-colors duration-150 outline-none"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile slide-down menu panel ──────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 z-[39] bg-white/95 backdrop-blur-md border-b border-hive-border/60 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">

            {/* Mobile search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search products, boutiques..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-4 pr-10 rounded-xl bg-hive-cream/60 border border-hive-border/40 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs font-medium text-hive-text placeholder-hive-text-muted transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hive-text-muted hover:text-hive-dark"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Mobile nav links */}
            <div className="flex flex-col divide-y divide-hive-border/30">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-3 text-sm font-semibold text-hive-dark hover:text-hive-gold transition-colors"
              >
                <Home className="w-4 h-4 text-hive-gold" />
                Home
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-3 text-sm font-semibold text-hive-dark hover:text-hive-gold transition-colors"
              >
                <Package className="w-4 h-4 text-hive-gold" />
                My Orders
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-3 text-sm font-semibold text-hive-dark hover:text-hive-gold transition-colors"
              >
                <List className="w-4 h-4 text-hive-gold" />
                Browse Products
              </Link>

              {/* Mobile Sign Up CTA (only for guests) */}
              <SignedOut>
                <div className="pt-3 pb-1">
                  <SignUpButton mode="modal">
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full h-10 rounded-xl bg-hive-dark text-hive-gold text-xs font-bold hover:bg-hive-dark/90 active:scale-[0.98] transition-all duration-200 shadow-sm"
                    >
                      Create Account — It&apos;s Free
                    </button>
                  </SignUpButton>
                </div>
              </SignedOut>
            </div>
          </div>
        </div>
      )}

      {/* Tap-outside to close menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[38] bg-transparent"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};