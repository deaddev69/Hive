"use client";

import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

/**
 * UserSync — mounts inside CustomerLayout.
 * 1. Waits for Clerk to confirm the user is signed in.
 * 2. Calls debug.whoAmI to check if Convex can see the identity.
 * 3. If Convex can see the identity, calls syncUser to upsert the user row.
 *
 * If whoAmI returns authenticated:false even though Clerk shows isSignedIn:true,
 * the Clerk JWT Template "convex" is missing or CLERK_JWT_ISSUER_DOMAIN is wrong.
 */
export function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const whoAmI   = useQuery(api.debug.whoAmI);

  useEffect(() => {
    if (!isLoaded) return;

    // Log auth state for debugging
    if (process.env.NODE_ENV !== "production") {
      console.log("[UserSync] Clerk loaded:", isLoaded, "| Signed in:", isSignedIn);
      console.log("[UserSync] Convex whoAmI:", whoAmI);
    }

    if (!isSignedIn || !user) return;

    if (whoAmI === undefined) return; // Still loading

    if (!whoAmI.authenticated) {
      // Convex can't see the identity — JWT not reaching Convex
      console.error(
        "[UserSync] ❌ Convex cannot see Clerk identity even though user is signed in.\n" +
        "Fix: Go to Clerk Dashboard → JWT Templates → Create template named 'convex'.\n" +
        "Then set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard → Settings → Environment Variables."
      );
      return;
    }

    // Convex sees the identity — safe to sync
    syncUser({
      email: user.primaryEmailAddress?.emailAddress,
      name:  user.fullName ?? user.firstName ?? undefined,
    }).then(() => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[UserSync] ✅ User synced to Convex successfully.");
      }
    }).catch((err) => {
      console.error("[UserSync] syncUser failed:", err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user?.id, whoAmI?.authenticated]);

  return null;
}
