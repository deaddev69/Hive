// apps/boutique/src/hooks/useFirebaseAuth.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onIdTokenChanged, getIdToken } from "firebase/auth";
import type { User } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";
import { useConvexAuth } from "convex/react";

export interface FirebaseAuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
}

/**
 * useFirebaseAuth — Convex-compatible Firebase auth adapter.
 *
 * Initializes auth strictly client-side (inside useEffect) to avoid
 * SSR poisoning the Firebase SDK's internal per-app auth cache.
 */
export function useFirebaseAuth(): FirebaseAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    // getClientAuth() is only ever called here — strictly client-side
    const auth = getClientAuth();

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          tokenRef.current = await getIdToken(firebaseUser);
        } catch {
          tokenRef.current = null;
        }
      } else {
        tokenRef.current = null;
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      const auth = getClientAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      try {
        const token = await getIdToken(currentUser, forceRefreshToken);
        tokenRef.current = token;
        return token;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    user,
    isLoading,
    isAuthenticated: !isLoading && user !== null,
    fetchAccessToken,
  };
}
