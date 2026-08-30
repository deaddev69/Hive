// apps/boutique/src/hooks/useFirebaseAuth.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Firebase auth adapter for ConvexProviderWithAuth.
 * Listens to ID token changes (fires on login, logout, and token refresh).
 * Returns the fetchAccessToken shape that Convex expects.
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged fires on: initial load, sign-in, sign-out, token refresh
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      try {
        return await currentUser.getIdToken(forceRefreshToken);
      } catch (err) {
        console.error("[useFirebaseAuth] Failed to get ID token:", err);
        return null;
      }
    },
    []
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      fetchAccessToken,
      user,
    }),
    [isLoading, user, fetchAccessToken]
  );
}
