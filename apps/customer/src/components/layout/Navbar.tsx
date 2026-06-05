"use client";

import React, { useState } from "react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useSessionStore } from "@/context/SessionContext";
import { Button, Badge, Input } from "@hive/ui";
import { ShoppingBag, MapPin, Search, User, LogOut } from "lucide-react";
import Link from "next/navigation";

export const Navbar: React.FC = () => {
  const { pincode, setGateOpen } = useLocation();
  const { itemsCount, setSidebarOpen } = useCart();
  const { user, loginAsMockUser, logout } = useSessionStore();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      alert(`Searching for: ${searchQuery}`);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-hive-dark/80 backdrop-blur-md border-b border-hive-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-hive-gold flex items-center justify-center font-bold text-hive-dark">
            H
          </div>
          <span className="font-serif font-black tracking-tight text-lg text-hive-text hidden sm:inline-block">
            HIVE
          </span>
        </div>

        {/* Location Selector */}
        <button
          onClick={() => setGateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hive-cream/80 hover:bg-hive-comb border border-hive-border/50 text-xs font-semibold text-hive-text transition-colors duration-200"
        >
          <MapPin className="w-3.5 h-3.5 text-hive-gold" />
          <span>{pincode ? `Delivering to: ${pincode}` : "Select Location"}</span>
        </button>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden md:block">
          <input
            type="text"
            placeholder="Search local designer sarees, kurtis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-hive-border bg-hive-cream/10 text-xs text-hive-text placeholder-hive-text-muted/60 focus:border-hive-gold focus:ring-1 focus:ring-hive-gold outline-none transition-all duration-200"
          />
          <Search className="w-4 h-4 text-hive-text-muted absolute left-3.5 top-3 pointer-events-none" />
        </form>

        {/* Action Triggers */}
        <div className="flex items-center gap-3">
          {/* Cart Trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative p-2 rounded-full hover:bg-hive-cream transition-colors text-hive-text"
            aria-label="Open Cart"
          >
            <ShoppingBag className="w-5.5 h-5.5" />
            {itemsCount > 0 && (
              <Badge className="absolute top-0 right-0 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px]" variant="primary">
                {itemsCount}
              </Badge>
            )}
          </button>

          {/* Profile Trigger */}
          {user ? (
            <div className="flex items-center gap-2 border-l border-hive-border/50 pl-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-xs font-bold text-hive-text">{user.name}</span>
                <span className="text-[10px] text-hive-text-muted font-medium capitalize">
                  {user.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-hive-cream text-hive-text-muted hover:text-hive-text transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loginAsMockUser("customer")}
              className="flex items-center gap-1.5 h-9 rounded-lg"
            >
              <User className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">Login</span>
            </Button>
          )}
        </div>

      </div>
    </nav>
  );
};
