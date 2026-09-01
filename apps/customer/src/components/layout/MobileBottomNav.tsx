"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Heart, Package, User } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist-store";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const [hydrated, setHydrated] = useState(false);
  const { token } = useSessionStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleTabClick = useCallback(() => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(8);
      } catch {}
    }
  }, []);

  const orders = useQuery(api.orders.listMyOrders, { token: token || undefined }) ?? [];
  const activeOrdersCount = orders.filter((o: any) => 
    ["placed", "confirmed", "preparing", "out_for_delivery", "pending"].includes(o.status)
  ).length;

  const isPDP = pathname !== "/products" && pathname?.startsWith("/products/");
  const isCheckout = pathname?.startsWith("/checkout");
  if (isPDP || isCheckout) return null;

  const items = [
    { label: "Home", href: "/", icon: Home },
    { label: "Shop", href: "/products", icon: ShoppingBag },
    {
      label: "Wishlist",
      href: "/wishlist",
      icon: Heart,
      badge: hydrated && wishlistCount > 0 ? wishlistCount : undefined,
    },
    { 
      label: "Orders", 
      href: "/orders", 
      icon: Package,
      badge: hydrated && activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    { label: "Account", href: "/account", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 pointer-events-none">
      <nav 
        aria-label="Mobile Navigation"
        className="w-full bg-stone-950/92 dark:bg-stone-900/92 backdrop-blur-2xl border border-white/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.45)] rounded-full h-[58px] px-2 flex items-center justify-around pointer-events-auto select-none transition-all duration-300"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.label === "Account" && (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={handleTabClick}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative group active:scale-90 transition-transform duration-150 ${
                isActive
                  ? "text-[#F5C22B]"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon 
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive 
                      ? "stroke-[#F5C22B] scale-105" 
                      : "stroke-stone-400 group-hover:stroke-stone-200"
                  }`} 
                  strokeWidth={isActive ? 2.4 : 1.8} 
                />

                {/* Luxury Gold Pill Badge */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-[#F5C22B] text-stone-950 text-[8px] font-black px-1 py-0.2 rounded-full min-w-[15px] h-[15px] flex items-center justify-center shadow-xs ring-2 ring-stone-950 leading-none">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[9px] tracking-wider mt-1 leading-none uppercase transition-colors duration-150 ${
                isActive ? "font-bold text-[#F5C22B]" : "font-medium text-stone-400"
              }`}>
                {item.label}
              </span>

              {/* Active Ambient Micro Dot */}
              {isActive && (
                <span 
                  className="w-1 h-1 bg-[#F5C22B] rounded-full mt-0.5 shadow-[0_0_6px_#F5C22B]" 
                  aria-hidden="true" 
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
