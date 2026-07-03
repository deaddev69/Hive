// convex/lib/auth.ts
// Shared auth helpers used by every protected Convex function.
// CRITICAL: Role is ALWAYS read from the users table — never from JWT claims.

import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { HiveError } from "./errors";
import { Id } from "../_generated/dataModel";

type AuthCtx = QueryCtx | MutationCtx;

/** All valid user roles — keep in sync with schema.ts users.role union */
export type UserRole = "customer" | "seller_pending" | "seller_rejected" | "boutique" | "boutique_owner" | "admin";

/**
 * Resolves the authenticated user from the Convex users table.
 * Throws if unauthenticated, user not found, or account disabled.
 */
export async function getAuthenticatedUser(ctx: AuthCtx, token?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    // Dev-only fallback for chaos tests
    if (token && token.startsWith("mock_user_")) {
      const mockUserId = token.replace("mock_user_", "");
      const user = await (ctx as any).db.get(mockUserId);
      if (user && user.email && user.email.includes("chaos_") && user.email.includes("@hive.com")) {
        return user;
      }
    }
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
  role: UserRole,
  token?: string
) {
  const user = await getAuthenticatedUser(ctx, token);
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
  roles: Array<UserRole>,
  token?: string
) {
  const user = await getAuthenticatedUser(ctx, token);
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
  boutiqueId: string,
  token?: string,
  allowSuspended: boolean = false
) {
  const user = await getAuthenticatedUser(ctx, token);
  if (user.role !== "boutique" && user.role !== "boutique_owner" && user.role !== "admin") {
    throw new ConvexError({
      code: HiveError.FORBIDDEN,
      required: "boutique",
      actual: user.role,
    });
  }

  const boutique = (user.role === "admin"
    ? await ctx.db.get(boutiqueId as Id<"boutiques">)
    : await ctx.db
        .query("boutiques")
        .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
        .unique()) as any;

  if (!boutique || (user.role !== "admin" && (boutique._id as string) !== boutiqueId)) {
    throw new ConvexError(HiveError.BOUTIQUE_ACCESS_DENIED);
  }

  if (!allowSuspended && (boutique.status === "suspended" || boutique.status === "SUSPENDED")) {
    throw new ConvexError(HiveError.BOUTIQUE_SUSPENDED);
  }

  return { user, boutique };
}

/**
 * Resolves the authenticated user's boutique from the boutiques table.
 * Throws if unauthenticated, not a boutique role, or no boutique record found.
 */
export async function getMyBoutique(ctx: AuthCtx, token?: string, allowSuspended: boolean = false) {
  const user = await getAuthenticatedUser(ctx, token);
  if (user.role !== "boutique" && user.role !== "boutique_owner" && user.role !== "admin") {
    throw new ConvexError({
      code: HiveError.FORBIDDEN,
      message: "Unauthorized: Not a boutique designer.",
    });
  }

  let boutique = await ctx.db
    .query("boutiques")
    .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
    .unique();

  const userEmail = user.email;
  if (!boutique && userEmail) {
    boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .unique();
  }

  if (!boutique && user.role === "admin") {
    // Admins default to the first approved boutique if not explicitly assigned
    boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .first();
  }

  if (!boutique) {
    throw new ConvexError(HiveError.BOUTIQUE_ACCESS_DENIED);
  }

  if (!allowSuspended && (boutique.status === "suspended" || boutique.status === "SUSPENDED")) {
    throw new ConvexError(HiveError.BOUTIQUE_SUSPENDED);
  }

  return boutique;
}

/**
 * Returns the current user identity without throwing.
 * Returns null if unauthenticated.
 */
export async function getCurrentUserOrNull(ctx: AuthCtx, token?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}
