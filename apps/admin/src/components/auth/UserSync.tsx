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
  const fallbackEnabled = process.env.NEXT_PUBLIC_ENABLE_USERSYNC_FALLBACK !== "false";

  useEffect(() => {
    if (!fallbackEnabled) return;

    if (!isLoaded) return;
    if (!isSignedIn || !user) return;

    // Fire immediately — do NOT wait for whoAmI.authenticated.
    // syncUser is idempotent: safe to call on every mount/login.
    syncUser({
      email: user.primaryEmailAddress?.emailAddress,
      name:  user.fullName ?? user.firstName ?? undefined,
    })
      .catch((error) => {
        console.error("[UserSync] SYNC FAILED:", error);
      });

  // Only re-run when the Clerk user identity changes or feature flag changes
  }, [isLoaded, isSignedIn, user?.id, fallbackEnabled]);

  return null;
}
