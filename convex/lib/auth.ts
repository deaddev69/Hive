// convex/lib/auth.ts
// Shared auth helpers used by every protected Convex function.
// CRITICAL: Role is ALWAYS read from the users table — never from JWT claims.

import { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { HiveError } from "./errors";
import { Id } from "../_generated/dataModel";
import { normalizeEmail } from "../users";

type AuthCtx = QueryCtx | MutationCtx;

/** All valid user roles — keep in sync with schema.ts users.role union */
export type UserRole = "customer" | "seller_pending" | "seller_rejected" | "boutique" | "boutique_owner" | "admin";

/**
 * Resolves the authenticated user from the Convex users table.
 * Throws if unauthenticated, user not found, or account disabled.
 */
export async function getAuthenticatedUser(ctx: AuthCtx, token?: string, options?: { skipIssuerGating?: boolean }) {
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

  if (!options?.skipIssuerGating) {
    assertRoleIssuerGating(user, identity, true);
  }

  return user;
}

/**
 * Asserts bi-directional allowlist domain boundaries between Firebase and Clerk tokens.
 */
export function assertRoleIssuerGating(user: { role: string }, identity: { issuer?: string }, throwOnViolation: boolean = true): boolean {
  if (!identity.issuer) return true;
  const isProdDeployment = process.env.CONVEX_SITE_URL?.includes("standing-mosquito-377") || false;
  const VALID_FIREBASE_ISSUERS = [
    `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID || "hive-fashion"}`
  ];
  const VALID_CLERK_ISSUERS = [
    "https://clerk.hivenow.in",
    "https://hivenow.in",
    "https://accounts.hivenow.in",
  ];
  if (!isProdDeployment) {
    VALID_CLERK_ISSUERS.push("https://artistic-tiger-76.clerk.accounts.dev");
  }

  const isFirebaseToken = VALID_FIREBASE_ISSUERS.includes(identity.issuer);
  const isClerkToken = VALID_CLERK_ISSUERS.includes(identity.issuer);

  // Admins MUST use Clerk — no Firebase allowed
  const isAdminRole = [
    "admin",
    "super_admin",
    "support_agent",
    "logistics_partner",
  ].includes(user.role);

  if (isAdminRole) {
    if (!isClerkToken) {
      if (throwOnViolation) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Security violation: Admin accounts must authenticate via Clerk."
        });
      }
      return false;
    }
  }

  // Seller/staff roles accept Firebase (Google Auth) OR Clerk tokens
  const isSellerRole = [
    "boutique_owner",
    "boutique",
    "seller_pending",
    "seller_rejected",
  ].includes(user.role);

  if (isSellerRole) {
    if (!isClerkToken && !isFirebaseToken) {
      if (throwOnViolation) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Security violation: Seller accounts must authenticate via Google or Clerk."
        });
      }
      return false;
    }
  }

  return true;
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

  let boutique: any = null;

  if (user.role === "admin") {
    boutique = await ctx.db.get(boutiqueId as Id<"boutiques">);
  } else {
    // 1. Try ownerUserId
    boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .unique();

    // 2. If not found, try email matching
    const userEmail = user.email;
    if (!boutique && userEmail) {
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .unique();
    }

    // 3. If still not found, try staff email match
    if (!boutique && userEmail) {
      const allBoutiques = await ctx.db.query("boutiques").collect();
      boutique = allBoutiques.find((b: any) =>
        (b.staffEmail1 && normalizeEmail(b.staffEmail1) === normalizeEmail(userEmail)) ||
        (b.staffEmail2 && normalizeEmail(b.staffEmail2) === normalizeEmail(userEmail))
      ) as any;
    }
  }

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

  // Look for staff email match via schema index (instant O(1) indexed lookup)
  if (!boutique && userEmail) {
    const normalizedUserEmail = userEmail.trim().toLowerCase();
    boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_staffEmail1", (q) => q.eq("staffEmail1", normalizedUserEmail))
      .first();

    if (!boutique) {
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_staffEmail2", (q) => q.eq("staffEmail2", normalizedUserEmail))
        .first();
    }
    if (!boutique && normalizedUserEmail !== userEmail) {
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_staffEmail1", (q) => q.eq("staffEmail1", userEmail))
        .first();
    }
    if (!boutique && normalizedUserEmail !== userEmail) {
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_staffEmail2", (q) => q.eq("staffEmail2", userEmail))
        .first();
    }
    if (!boutique) {
      const allBoutiques = await ctx.db.query("boutiques").collect();
      boutique = allBoutiques.find((b: any) =>
        (b.staffEmail1 && normalizeEmail(b.staffEmail1) === normalizeEmail(userEmail)) ||
        (b.staffEmail2 && normalizeEmail(b.staffEmail2) === normalizeEmail(userEmail))
      ) as any;
    }
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

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user || !user.isActive) return null;
  if (!assertRoleIssuerGating(user, identity, false)) return null;

  return user;
}
