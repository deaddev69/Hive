"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { LocationPermissionModal } from "./LocationPermissionModal";
import { LocationDrawer } from "./LocationDrawer";
import { UnsupportedArea } from "../location/UnsupportedArea";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { UserSync } from "@/components/auth/UserSync";

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useCart();
  const { isDrawerOpen, setDrawerOpen } = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Invisible user sync — keeps Convex users table in sync with Clerk */}
      <UserSync />

      <Navbar />
      
      {/* Root Layout Main */}
      <main className="flex-grow w-full flex flex-col">{children}</main>
      
      <Footer />

      {/* Global location overlays */}
      <LocationPermissionModal />
      
      <UnsupportedArea />
      
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
