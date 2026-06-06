"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useCartStore } from "@/store/cart-store";

export interface CartState {
  itemsCount: number;
  isSidebarOpen: boolean;
}

export interface CartContextType extends CartState {
  setSidebarOpen: (open: boolean) => void;
  addToCart: (quantity?: number) => void;
  removeFromCart: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setSidebarOpenState] = useState(false);

  const getCartCount = useCartStore((state) => state.getCartCount);
  const clearCartStore = useCartStore((state) => state.clearCart);
  const addItemStore = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);

  // Hydrate store on mount to prevent Next.js hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const itemsCount = mounted ? getCartCount() : 0;

  const setSidebarOpen = (open: boolean) => {
    setSidebarOpenState(open);
  };

  const addToCart = (quantity = 1) => {
    addItemStore({
      productId: "mock-product-id",
      size: "M",
      price: 1999,
      name: "Boutique Cotton Kurta",
      imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=400",
      boutiqueName: "Zari Boutique",
    });
    setSidebarOpenState(true); // open checkout sidebar drawer on additions
  };

  const removeFromCart = () => {
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        const { updateQuantity, removeItem } = useCartStore.getState();
        if (lastItem.quantity > 1) {
          updateQuantity(lastItem.productId, lastItem.size, lastItem.quantity - 1);
        } else {
          removeItem(lastItem.productId, lastItem.size);
        }
      }
    }
  };

  const clearCart = () => {
    clearCartStore();
    setSidebarOpenState(false);
  };

  return (
    <CartContext.Provider value={{ itemsCount, isSidebarOpen, setSidebarOpen, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

