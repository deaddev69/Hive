"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";

/**
 * @deprecated
 * Compatibility layer during Clerk migration.
 * Remove after Phase 1.
 */
export interface SessionUser {
  _id: string;
  email?: string;
  name?: string;
  phone?: string;
  role: "customer" | "seller_pending" | "seller_rejected" | "boutique" | "boutique_owner" | "admin";
  isActive: boolean;
  isPhoneVerified: boolean;
  createdAt: number;
}

/**
 * @deprecated
 * Compatibility layer during Clerk migration.
 * Remove after Phase 1.
 */
export interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  token: string | null;
}

/**
 * @deprecated
 * Compatibility layer during Clerk migration.
 * Remove after Phase 1.
 */
export interface SessionContextType extends SessionState {
  loginWithPassword: (email: string, password: string) => Promise<{ token: string; userId: string; role: string }>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ token: string; userId: string; role: string }>;
  loginWithGoogle: (credential: string) => Promise<{ token: string; userId: string; role: string }>;
  logout: () => Promise<void>;
  setGuestMode: (enabled: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * @deprecated
 * Compatibility layer during Clerk migration.
 * Remove after Phase 1.
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded: authLoaded, isSignedIn, signOut } = useAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const syncUser = useMutation(api.users.syncUser);

  // Fetch user profile from Convex using the Clerk JWT context automatically
  const user = useQuery(api.auth.getMe, isSignedIn ? {} : "skip");

  // Load initial guest status from localStorage
  useEffect(() => {
    const savedGuest = localStorage.getItem("hive_guest") === "true";
    setIsGuest(savedGuest);
  }, []);

  // Safe developer-only client-side sync fallback when webhooks are not tunneled locally
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!isSignedIn || !clerkUser || user !== null) return;

    const performDevSync = async () => {
      try {
        console.log("[SessionContext] Performing local development fallback user sync...");
        const email = clerkUser.primaryEmailAddress?.emailAddress;
        const name = clerkUser.fullName || clerkUser.firstName || clerkUser.lastName || undefined;
        const phone = clerkUser.primaryPhoneNumber?.phoneNumber || undefined;
        await syncUser({ email, name, phone });
        console.log("[SessionContext] Local fallback user sync completed successfully.");
      } catch (err) {
        console.error("[SessionContext] Local fallback user sync failed:", err);
      }
    };

    performDevSync();
  }, [isSignedIn, clerkUser, user, syncUser]);

  // Update authentication status
  const isAuthenticated = !!isSignedIn && !!user;
  const isLoading = !authLoaded || !userLoaded || (isSignedIn && user === undefined);

  const loginWithPassword = async (email: string, password: string) => {
    console.warn("loginWithPassword is deprecated. Please authenticate via Clerk.");
    throw new Error("Deprecated: Use Clerk components for authentication.");
  };

  const signUpWithPassword = async (email: string, password: string, name?: string) => {
    console.warn("signUpWithPassword is deprecated. Please authenticate via Clerk.");
    throw new Error("Deprecated: Use Clerk components for authentication.");
  };

  const loginWithGoogle = async (credential: string) => {
    console.warn("loginWithGoogle is deprecated. Please authenticate via Clerk.");
    throw new Error("Deprecated: Use Clerk components for authentication.");
  };

  const logout = async () => {
    try {
      await signOut();
      setIsGuest(false);
      localStorage.removeItem("hive_guest");
    } catch (err) {
      console.error("Clerk signOut error:", err);
    }
  };

  const setGuestMode = (enabled: boolean) => {
    setIsGuest(enabled);
    if (enabled) {
      localStorage.setItem("hive_guest", "true");
    } else {
      localStorage.removeItem("hive_guest");
    }
  };

  // Redirect role check on login (admin / boutique portals)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const isDebugPath = window.location.pathname === "/debug";
      const hasBypassParam = searchParams.get("no_redirect") === "true";
      
      if (isDebugPath || hasBypassParam) {
        console.log("[SessionContext] Role redirect bypassed in debug/bypass mode.");
        return;
      }
    }

    if (user && isAuthenticated) {
      // Direct user depending on their role
      const adminAppUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL || "http://localhost:3001";
      if (user.role === "boutique_owner") {
        window.location.href = `${adminAppUrl}/seller`;
      } else if (user.role === "admin") {
        window.location.href = `${adminAppUrl}/admin`;
      }
    }
  }, [user, isAuthenticated]);

  return (
    <SessionContext.Provider 
      value={{ 
        user: user || null, 
        isAuthenticated, 
        isLoading, 
        isGuest, 
        token: null, // Legacy custom token is null under Clerk
        loginWithPassword, 
        signUpWithPassword, 
        loginWithGoogle, 
        logout,
        setGuestMode
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionStore = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionStore must be used within a SessionProvider");
  }
  return context;
};
