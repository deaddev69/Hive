"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  const [state, setState] = useState<CartState>({
    itemsCount: 0,
    isSidebarOpen: false,
  });

  // Hydrate cart count from storage on mount
  useEffect(() => {
    const savedCount = localStorage.getItem("hive_customer_cart_count");
    if (savedCount) {
      setState((prev) => ({ ...prev, itemsCount: parseInt(savedCount, 10) || 0 }));
    }
  }, []);

  const setSidebarOpen = (open: boolean) => {
    setState((prev) => ({ ...prev, isSidebarOpen: open }));
  };

  const addToCart = (quantity = 1) => {
    setState((prev) => {
      const newCount = prev.itemsCount + quantity;
      localStorage.setItem("hive_customer_cart_count", String(newCount));
      return {
        ...prev,
        itemsCount: newCount,
        isSidebarOpen: true, // open checkout sidebar drawer on additions
      };
    });
  };

  const removeFromCart = () => {
    setState((prev) => {
      const newCount = Math.max(0, prev.itemsCount - 1);
      localStorage.setItem("hive_customer_cart_count", String(newCount));
      return { ...prev, itemsCount: newCount };
    });
  };

  const clearCart = () => {
    localStorage.removeItem("hive_customer_cart_count");
    setState({
      itemsCount: 0,
      isSidebarOpen: false,
    });
  };

  return (
    <CartContext.Provider value={{ ...state, setSidebarOpen, addToCart, removeFromCart, clearCart }}>
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
