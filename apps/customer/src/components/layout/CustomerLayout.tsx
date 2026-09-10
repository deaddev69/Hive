"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { Navbar } from "./Navbar";
import { CheckoutHeader } from "./CheckoutHeader";
import { OrderConfirmationHeader } from "./OrderConfirmationHeader";
import { Footer } from "./Footer";
import { LocationDrawer } from "./LocationDrawer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileBottomNav } from "./MobileBottomNav";
import { cn } from "@hive/ui";

import { usePathname } from "next/navigation";

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useCart();
  const { isDrawerOpen, setDrawerOpen } = useLocation();
  const pathname = usePathname();

  // Detect product detail pages: /products/[slug] (where slug is not empty and not 'page')
  const isPdp = pathname ? /^\/products\/[^/]+$/.test(pathname) && pathname !== "/products" : false;

  const isCheckoutPage = pathname?.startsWith("/checkout") ?? false;
  const isOrderConfirmation = pathname?.startsWith("/order/success") ?? false;
  const backHref = pathname === "/checkout/review" ? "/checkout/address" : "/cart";

  return (
    <div className="flex flex-col min-h-screen">

      {isOrderConfirmation ? (
        <OrderConfirmationHeader />
      ) : isCheckoutPage ? (
        <CheckoutHeader backHref={backHref} />
      ) : (
        <Navbar />
      )}

      {/* Root Layout Main */}
      <main className={cn("flex-grow w-full flex flex-col", !isOrderConfirmation && "pb-20 md:pb-0")}>
        {children}
      </main>

      {/* Hide footer completely on mobile views across the entire site */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Sticky bottom nav for mobile (hidden on order confirmation) */}
      {!isOrderConfirmation && <MobileBottomNav />}

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
