// apps/customer/src/hooks/useFirebaseAuth.ts
import { useState, useEffect, useCallback } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
      if (!user) {
        return null;
      }
      try {
        return await user.getIdToken(forceRefreshToken);
      } catch (error) {
        console.error("Failed to get Firebase ID token:", error);
        return null;
      }
    },
    [user]
  );

  return {
    isLoading,
    isAuthenticated: !!user,
    fetchAccessToken,
    user,
  };
}
