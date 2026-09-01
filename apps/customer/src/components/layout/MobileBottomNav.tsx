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
      className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-stone-950/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.03)] z-40 h-[64px] flex items-center justify-around px-2 pb-safe transition-all duration-300 select-none"
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
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center relative group active:scale-95 transition-transform duration-150 ${
              isActive
                ? "text-stone-950 dark:text-white"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            <div className="relative flex items-center justify-center">
              {/* Subtle ambient active glow */}
              {isActive && (
                <span 
                  className="absolute -inset-2 bg-amber-50/80 dark:bg-amber-950/30 rounded-full -z-10 animate-fade-in transition-all duration-300" 
                  aria-hidden="true" 
                />
              )}
              
              <Icon 
                className={`w-[21px] h-[21px] transition-all duration-200 ${
                  isActive 
                    ? "stroke-stone-950 dark:stroke-white scale-105" 
                    : "stroke-current opacity-85 group-hover:opacity-100"
                }`} 
                strokeWidth={isActive ? 2.3 : 1.75} 
              />

              {/* Luxury refined pill badge */}
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-stone-900 dark:bg-white text-amber-300 dark:text-stone-950 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[17px] h-[17px] flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-stone-950 leading-none">
                  {item.badge}
                </span>
              )}
            </div>

            <span className={`text-[10px] tracking-wide mt-1.5 leading-none transition-colors duration-150 ${
              isActive ? "font-bold text-stone-950 dark:text-white" : "font-medium"
            }`}>
              {item.label}
            </span>

            {/* Micro active dot */}
            {isActive && (
              <span 
                className="w-1 h-1 bg-[#D9A71E] rounded-full mt-1 animate-scale-up" 
                aria-hidden="true" 
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
