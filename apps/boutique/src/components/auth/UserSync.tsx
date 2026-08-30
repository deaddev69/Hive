// apps/boutique/src/components/auth/UserSync.tsx
"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

/**
 * Syncs the Firebase-authenticated seller/staff user into the Convex `users` table.
 *
 * On first login after migration, `syncUser` performs the email soft-link:
 * - If the Firebase Gmail matches boutiques.email / ownerEmail → role = boutique_owner
 * - If it matches boutiques.staffEmail1/2 → role = boutique
 * - Otherwise → role stays "customer" → BoutiqueLayout will redirect to /boutique/unauthorized
 *
 * syncUser is idempotent — safe to call on every mount.
 */
export function UserSync() {
  const { user, isLoading, isAuthenticated } = useFirebaseAuth();
  const syncUser = useMutation(api.users.syncUser);
  const fallbackEnabled = process.env.NEXT_PUBLIC_ENABLE_USERSYNC_FALLBACK !== "false";

  useEffect(() => {
    if (!fallbackEnabled) return;
    if (isLoading) return;
    if (!isAuthenticated || !user) return;

    syncUser({
      email: user.email ?? undefined,
      name: user.displayName ?? undefined,
    }).catch((err) => {
      console.error("[UserSync] SYNC FAILED:", err);
    });
  }, [isLoading, isAuthenticated, user?.uid, fallbackEnabled]);

  return null;
}
