// apps/boutique/src/context/SellerAuthContext.tsx
"use client";

import React, { createContext, useContext, useCallback } from "react";
import { signInWithPopup, signInWithRedirect, signOut as firebaseSignOut } from "firebase/auth";
import { getClientAuth, googleProvider } from "@/lib/firebase";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { User } from "firebase/auth";

/** Detect if running as installed PWA (standalone/fullscreen) */
function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

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
    const auth = getClientAuth();

    if (isPWA()) {
      // PWA standalone mode — popup doesn't work, must use redirect
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === "auth/popup-blocked") {
        // Popup blocked — fall back to redirect silently
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async (options?: { redirectUrl?: string }) => {
    await firebaseSignOut(getClientAuth());
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

