// apps/customer/src/hooks/useFirebaseAuth.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { authPerfLog } from "../lib/authPerf";

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Tracks whether we've logged the *first* onIdTokenChanged callback (app boot) separately
  // from later ones (sign-in/sign-out transitions during the session), since they answer
  // different questions: boot latency vs. "how long after OTP confirm did auth state update".
  const hasLoggedInitialState = useRef(false);
  const wasSignedIn = useRef(false);

  useEffect(() => {
    authPerfLog("Auth listener (onIdTokenChanged) registered");
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      if (!hasLoggedInitialState.current) {
        hasLoggedInitialState.current = true;
        authPerfLog(`First auth state received (${currentUser ? "signed in" : "signed out"})`);
      } else if (!!currentUser !== wasSignedIn.current) {
        authPerfLog(`Auth state changed to ${currentUser ? "signed in" : "signed out"}`);
      }
      wasSignedIn.current = !!currentUser;
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
