"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

/**
 * Syncs the Clerk-authenticated user into the Convex `users` table.
 *
 * CRITICAL: Do NOT gate on api.debug.whoAmI.authenticated.
 * whoAmI resolves BEFORE the Clerk JWT token has been delivered to Convex,
 * so it returns { authenticated: false } on the first render.
 * If we bail on that, syncUser never fires and getMe returns null forever.
 *
 * syncUser has its own server-side identity check and is safe to call
 * unconditionally once Clerk says the user is signed in.
 */
export function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    console.log("[UserSync] isLoaded:", isLoaded, "isSignedIn:", isSignedIn, "clerkId:", user?.id);

    if (!isLoaded) return;
    if (!isSignedIn || !user) return;

    // Fire immediately — do NOT wait for whoAmI.authenticated.
    // syncUser is idempotent: safe to call on every mount/login.
    syncUser({
      email: user.primaryEmailAddress?.emailAddress,
      name:  user.fullName ?? user.firstName ?? undefined,
    })
      .then((result) => {
        console.log("[UserSync] SYNC SUCCESS — userId:", result);
      })
      .catch((error) => {
        console.error("[UserSync] SYNC FAILED:", error);
      });

  // Only re-run when the Clerk user identity changes
  }, [isLoaded, isSignedIn, user?.id]);

  return null;
}
