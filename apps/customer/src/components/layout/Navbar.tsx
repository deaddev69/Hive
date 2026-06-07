"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { Badge } from "@hive/ui";
import { ShoppingBag, MapPin, Search, List } from "lucide-react";
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
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-hive-dark/80 backdrop-blur-md border-b border-hive-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Brand / Logo — navigates to Home from anywhere */}
        <Link
          href="/"
          aria-label="Go to Home"
          className="flex items-center gap-2 hover:opacity-80 active:scale-[0.97] transition-all duration-200 cursor-pointer"
        >
          <Image
            src="/logo.jpg"
            alt="Hive"
            width={180}
            height={75}
            priority
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* Location Selector */}
        <button
          onClick={() => {
            console.log('[Navbar] Location button clicked, calling setDrawerOpen(true)');
            setDrawerOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hive-cream/80 hover:bg-hive-comb border border-hive-border/50 text-xs font-semibold text-hive-text transition-colors duration-200"
        >
          <MapPin className="w-3.5 h-3.5 text-hive-gold" />
          <span>{city ? city : "Select Location"}</span>
        </button>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden md:block">
          <input
            type="text"
            placeholder="Search local designer sarees, kurtis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-4 pr-10 rounded-xl bg-hive-cream/60 border border-hive-border/40 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-xs font-medium text-hive-text placeholder-hive-text-muted transition-all duration-200"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-hive-text-muted hover:text-hive-dark transition-colors duration-150">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Action icons / CTA */}
        <div className="flex items-center gap-4">

          <Link
            href="/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-hive-text hover:text-hive-gold transition-colors duration-150"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">My Orders</span>
          </Link>

          {/* Cart Bag Icon */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative p-1.5 text-hive-text hover:text-hive-gold transition-colors duration-150 outline-none"
            aria-label="Open cart"
          >
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            {itemsCount > 0 && (
              <Badge variant="primary" className="absolute -top-1.5 -right-1.5 scale-90 min-w-5 h-5 flex items-center justify-center font-bold px-1.5">
                {itemsCount}
              </Badge>
            )}
          </button>

          {/* User Profile / Auth State */}
          <SignedIn>
            <div className="flex items-center border-l border-hive-border/50 pl-3">
              <UserButton
                userProfileUrl="/account"
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-full border border-hive-border/60 hover:scale-[1.03] transition-transform duration-200",
                  },
                }}
              />
            </div>
          </SignedIn>

          {/* Signed Out: Login + Sign Up buttons */}
          <SignedOut>
            <div className="flex items-center gap-2 border-l border-hive-border/50 pl-3">
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
          </SignedOut>

        </div>

      </div>
    </nav>
  );
};