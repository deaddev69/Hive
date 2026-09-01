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
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-stone-950/95 backdrop-blur-lg border-t border-stone-200/80 dark:border-stone-800 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] z-40 h-[58px] flex items-center justify-around px-2 pb-safe select-none transition-colors duration-200"
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
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] active:scale-95 transition-transform duration-150 ${
              isActive
                ? "text-stone-950 dark:text-white"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon 
                className={`w-[20px] h-[20px] transition-all duration-150 ${
                  isActive 
                    ? "stroke-stone-950 dark:stroke-white scale-105" 
                    : "stroke-stone-400 dark:stroke-stone-500 opacity-90"
                }`} 
                strokeWidth={isActive ? 2.2 : 1.75} 
              />

              {/* Luxury Crisp Mini Badge */}
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-stone-900 dark:bg-white text-amber-300 dark:text-stone-950 text-[8px] font-extrabold px-1 py-0.2 rounded-full min-w-[16px] h-[16px] flex items-center justify-center shadow-xs ring-1.5 ring-white dark:ring-stone-950 leading-none">
                  {item.badge}
                </span>
              )}
            </div>

            <span className={`text-[9.5px] tracking-tight mt-1 leading-none transition-colors duration-150 ${
              isActive ? "font-bold text-stone-950 dark:text-white" : "font-medium text-stone-400 dark:text-stone-500"
            }`}>
              {item.label}
            </span>

            {/* Subtle Active Gold Indicator Dot */}
            {isActive && (
              <span 
                className="w-1 h-1 bg-[#D9A71E] rounded-full mt-0.5" 
                aria-hidden="true" 
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
