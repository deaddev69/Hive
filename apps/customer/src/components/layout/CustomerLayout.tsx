"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { LocationGateModal } from "./LocationGateModal";
import { CartDrawer } from "@/components/cart/CartDrawer";

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useCart();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {/* Root Layout Main */}
      <main className="flex-grow w-full flex flex-col">{children}</main>
      
      <Footer />

      {/* Global location overlays */}
      <LocationGateModal />
      
      {/* Shopping Cart Side Drawer */}
      <CartDrawer
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
};
