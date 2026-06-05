// convex/lib/auth.ts
// Shared auth helpers used by every protected Convex function.
// CRITICAL: Role is ALWAYS read from the users table — never from JWT claims.

import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { HiveError } from "./errors";

type AuthCtx = QueryCtx | MutationCtx;

/**
 * Resolves the authenticated user from the Convex users table.
 * Throws if unauthenticated, user not found, or account disabled.
 */
export async function getAuthenticatedUser(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError(HiveError.UNAUTHENTICATED);
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError(HiveError.USER_NOT_FOUND);
  }

  if (!user.isActive) {
    throw new ConvexError(HiveError.ACCOUNT_DISABLED);
  }

  return user;
}

/**
 * Asserts the user has a specific role. Returns the user if check passes.
 */
export async function requireRole(
  ctx: AuthCtx,
  role: "customer" | "boutique_owner" | "admin"
) {
  const user = await getAuthenticatedUser(ctx);
  if (user.role !== role) {
    throw new ConvexError({
      code: HiveError.FORBIDDEN,
      required: role,
      actual: user.role,
    });
  }
  return user;
}

/**
 * Asserts the user has one of several allowed roles.
 */
export async function requireAnyRole(
  ctx: AuthCtx,
  ...roles: Array<"customer" | "boutique_owner" | "admin">
) {
  const user = await getAuthenticatedUser(ctx);
  if (!roles.includes(user.role)) {
    throw new ConvexError({
      code: HiveError.FORBIDDEN,
      requiredOneOf: roles,
      actual: user.role,
    });
  }
  return user;
}

/**
 * Validates that the authenticated user owns the specified boutique.
 * Also checks boutique is not suspended.
 */
export async function requireBoutiqueOwnership(
  ctx: MutationCtx | QueryCtx,
  boutiqueId: string
) {
  const user = await requireRole(ctx, "boutique_owner");

  const boutique = await ctx.db
    .query("boutiques")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();

  if (!boutique || boutique._id !== boutiqueId) {
    throw new ConvexError(HiveError.BOUTIQUE_ACCESS_DENIED);
  }

  if (boutique.status === "suspended") {
    throw new ConvexError(HiveError.BOUTIQUE_SUSPENDED);
  }

  return { user, boutique };
}

/**
 * Returns the current user identity without throwing.
 * Returns null if unauthenticated.
 */
export async function getCurrentUserOrNull(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}
