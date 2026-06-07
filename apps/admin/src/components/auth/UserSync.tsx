"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function UserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const whoAmI   = useQuery(api.debug.whoAmI);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) return;

    if (whoAmI === undefined) return;

    if (!whoAmI.authenticated) {
      console.error(
        "[UserSync] Convex cannot see Clerk identity even though user is signed in."
      );
      return;
    }

    syncUser({
      email: user.primaryEmailAddress?.emailAddress,
      name:  user.fullName ?? user.firstName ?? undefined,
    }).then(() => {
      console.log("[UserSync] User synced to Convex successfully.");
    }).catch((err) => {
      console.error("[UserSync] syncUser failed:", err);
    });
  }, [isLoaded, isSignedIn, user?.id, whoAmI?.authenticated]);

  return null;
}
