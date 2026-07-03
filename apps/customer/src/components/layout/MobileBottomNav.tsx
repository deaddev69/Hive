"use client";

import React, { useState, useEffect } from "react";
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

  const orders = useQuery(api.orders.listMyOrders, { token: token || undefined }) ?? [];
  const activeOrdersCount = orders.filter((o: any) => 
    !["delivered", "cancelled", "refunded"].includes(o.status)
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

  const isAuthPage = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  return (
    <div className={`md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-hive-dark/95 backdrop-blur-md border-t border-hive-border/60 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 h-16 flex items-center justify-around px-2 pb-safe transition-all duration-300 ${
      isAuthPage ? "opacity-35 pointer-events-none cursor-not-allowed select-none" : ""
    }`}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center select-none relative ${
              isActive
                ? "text-hive-gold font-bold"
                : "text-hive-text-muted dark:text-neutral-400 hover:text-hive-dark"
            }`}
          >
            <div className={`relative px-4 py-1 rounded-full transition-all duration-250 flex items-center justify-center ${
              isActive ? "bg-amber-500/10 dark:bg-amber-400/15" : ""
            }`}>
              <Icon 
                className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-105" : ""}`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 bg-hive-gold text-hive-dark text-[9px] font-extrabold px-1.5 py-0.5 rounded-full scale-90 min-w-4 h-4 flex items-center justify-center border border-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide mt-1 leading-none font-medium">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
