"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { Navbar } from "./Navbar";
import { CheckoutHeader } from "./CheckoutHeader";
import { Footer } from "./Footer";
import { LocationDrawer } from "./LocationDrawer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileBottomNav } from "./MobileBottomNav";

import { usePathname } from "next/navigation";

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useCart();
  const { isDrawerOpen, setDrawerOpen } = useLocation();
  const pathname = usePathname();

  // Detect product detail pages: /products/[slug] (where slug is not empty and not 'page')
  const isPdp = pathname ? /^\/products\/[^/]+$/.test(pathname) && pathname !== "/products" : false;

  const isCheckoutPage = pathname?.startsWith("/checkout") ?? false;
  const backHref = pathname === "/checkout/review" ? "/checkout/address" : "/cart";
  const subline = pathname === "/checkout/review" ? "Step 2 of 2 • Review & Pay" : "Step 1 of 2 • Delivery Address";

  return (
    <div className="flex flex-col min-h-screen">

      {isCheckoutPage ? (
        <CheckoutHeader backHref={backHref} subline={subline} />
      ) : (
        <Navbar />
      )}
      
      {/* Root Layout Main */}
      <main className="flex-grow w-full flex flex-col">{children}</main>
      
      {/* Hide footer completely on mobile views across the entire site */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Sticky bottom nav for mobile */}
      <MobileBottomNav />
      
      <LocationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      
      {/* Shopping Cart Side Drawer */}
      <CartDrawer
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
};
