"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { Drawer, Button, EmptyState } from "@hive/ui";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { LocationGateModal } from "./LocationGateModal";
import { ShoppingBag } from "lucide-react";

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen, itemsCount, clearCart } = useCart();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {/* Root Layout Main */}
      <main className="flex-grow w-full flex flex-col">{children}</main>
      
      <Footer />

      {/* Global location overlays */}
      <LocationGateModal />
      
      {/* Shopping Cart Side Drawer */}
      <Drawer
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title="Shopping Cart"
      >
        {itemsCount === 0 ? (
          <EmptyState
            title="Cart is Empty"
            description="Explore local designer apparel and add items to your cart to checkout."
            icon={<ShoppingBag className="w-6 h-6 text-hive-gold" />}
            className="border-none bg-transparent max-w-full"
          />
        ) : (
          <div className="flex flex-col justify-between h-[calc(100vh-140px)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-hive-border pb-3">
                <span className="text-sm font-semibold text-hive-text">Items Quantity</span>
                <span className="text-sm font-bold text-hive-gold">{itemsCount}</span>
              </div>
              <div className="p-4 rounded-2xl border border-hive-border/60 bg-hive-cream/30">
                <span className="text-xs font-bold text-hive-text-muted uppercase tracking-wider block mb-1">
                  Hyperlocal alterations
                </span>
                <p className="text-xs text-hive-text leading-relaxed">
                  Tailored designs will be delivered with try-and-buy options. Delivered to your Hyderabad address today.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <Button
                variant="primary"
                onClick={() => alert("Proceeding to Razorpay payment checkout...")}
                className="w-full py-3"
              >
                Proceed to Checkout
              </Button>
              <Button
                variant="ghost"
                onClick={clearCart}
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                Clear Cart
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
