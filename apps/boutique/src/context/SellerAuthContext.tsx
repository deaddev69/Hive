// apps/boutique/src/context/SellerAuthContext.tsx
"use client";

import React, { createContext, useContext, useCallback } from "react";
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { User } from "firebase/auth";

interface SellerAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
}

const SellerAuthContext = createContext<SellerAuthContextType | null>(null);

export function SellerAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useFirebaseAuth();

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async (options?: { redirectUrl?: string }) => {
    await firebaseSignOut(auth);
    const redirect = options?.redirectUrl ?? "/sign-in";
    window.location.href = redirect;
  }, []);

  return (
    <SellerAuthContext.Provider
      value={{ user, isLoading, isAuthenticated, signInWithGoogle, signOut }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth(): SellerAuthContextType {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) throw new Error("useSellerAuth must be used inside SellerAuthProvider");
  return ctx;
}
