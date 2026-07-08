"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

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

export interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  token: string | null;
}

export interface SessionContextType extends SessionState {
  loginWithPassword: (email: string, password: string) => Promise<{ token: string; userId: string; role: string }>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ token: string; userId: string; role: string }>;
  loginWithGoogle: (credential?: string) => Promise<any>;
  logout: () => Promise<void>;
  setGuestMode: (enabled: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: firebaseUser, isAuthenticated: isFirebaseAuthenticated, isLoading: firebaseLoading } = useFirebaseAuth();
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const syncUser = useMutation(api.users.syncUser);

  // Fetch user profile from Convex using the authenticated context
  const user = useQuery(api.auth.getMe, isFirebaseAuthenticated ? {} : "skip");

  // Load initial guest status from localStorage
  useEffect(() => {
    const savedGuest = localStorage.getItem("hive_guest") === "true";
    setIsGuest(savedGuest);
  }, []);

  // Sync Firebase user with Convex users table immediately upon login
  useEffect(() => {
    if (!isFirebaseAuthenticated || !firebaseUser) return;

    const performSync = async () => {
      try {
        console.log("[SessionContext] Syncing Firebase user to Convex database...");
        const email = firebaseUser.email || undefined;
        const name = firebaseUser.displayName || undefined;
        const phone = firebaseUser.phoneNumber || undefined;
        await syncUser({ email, name, phone });
        console.log("[SessionContext] User sync completed successfully.");
      } catch (err) {
        console.error("[SessionContext] User sync failed:", err);
      }
    };

    performSync();
  }, [isFirebaseAuthenticated, firebaseUser, syncUser]);

  // Update authentication status
  const isAuthenticated = !!isFirebaseAuthenticated && !!user;
  const isLoading = firebaseLoading || (isFirebaseAuthenticated && user === undefined);

  const loginWithPassword = async (email: string, password: string) => {
    console.warn("loginWithPassword is not supported under passwordless Firebase Auth.");
    throw new Error("Password login is not supported. Use Google or Phone OTP.");
  };

  const signUpWithPassword = async (email: string, password: string, name?: string) => {
    console.warn("signUpWithPassword is not supported under passwordless Firebase Auth.");
    throw new Error("Password sign up is not supported. Use Google or Phone OTP.");
  };

  const loginWithGoogle = async (credential?: string): Promise<any> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setIsGuest(false);
      localStorage.removeItem("hive_guest");
      return { token: "firebase", userId: res.user.uid, role: "customer" };
    } catch (err) {
      console.error("Firebase Google SignIn error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsGuest(false);
      localStorage.removeItem("hive_guest");
    } catch (err) {
      console.error("Firebase signOut error:", err);
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

  return (
    <SessionContext.Provider 
      value={{ 
        user: user || null, 
        isAuthenticated, 
        isLoading, 
        isGuest, 
        token: null,
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
