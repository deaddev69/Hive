"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
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

  // Hydrate store on mount to prevent Next.js hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const itemsCount = mounted ? getCartCount() : 0;

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
  }, []);

  const addToCart = useCallback((quantity = 1) => {
    const { addItem } = useCartStore.getState();
    addItem({
      productId: "mock-product-id",
      size: "M",
      price: 199900, // stored in paise
      name: "Boutique Cotton Kurta",
      imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=400",
      boutiqueName: "Zari Boutique",
    });
    setSidebarOpenState(true); // open checkout sidebar drawer on additions
  }, []);

  const removeFromCart = useCallback(() => {
    const { items, updateQuantity, removeItem } = useCartStore.getState();
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        if (lastItem.quantity > 1) {
          updateQuantity(lastItem.productId, lastItem.size, lastItem.quantity - 1);
        } else {
          removeItem(lastItem.productId, lastItem.size);
        }
      }
    }
  }, []);

  const clearCart = useCallback(() => {
    const { clearCart: clearStore } = useCartStore.getState();
    clearStore();
    setSidebarOpenState(false);
  }, []);

  const contextValue = useMemo(() => ({
    itemsCount,
    isSidebarOpen,
    setSidebarOpen,
    addToCart,
    removeFromCart,
    clearCart
  }), [itemsCount, isSidebarOpen, setSidebarOpen, addToCart, removeFromCart, clearCart]);

  return (
    <CartContext.Provider value={contextValue}>
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

