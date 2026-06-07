// convex/users.ts
// User sync and profile queries for the HIVE customer app.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Upsert the Clerk-authenticated user into the `users` table.
 * Called once on every login from the UserSync client component.
 * NEVER accepts userId as an argument – always derived server-side.
 */
export const syncUser = mutation({
  args: {
    email: v.optional(v.string()),
    name:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Use tokenIdentifier as the canonical stable Clerk ID
    const clerkId = identity.subject;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    const now = Date.now();

    if (existing) {
      // Update email/name in case they changed in Clerk
      await ctx.db.patch(existing._id, {
        email:     args.email ?? existing.email,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId,
      email:           args.email,
      role:            "customer",
      isActive:        true,
      isPhoneVerified: false,
      createdAt:       now,
      updatedAt:       now,
    });

    // Create default customer profile
    await ctx.db.insert("customerProfiles", {
      userId,
      displayName:          args.name ?? args.email?.split("@")[0] ?? "Customer",
      hiveScore:            100,
      totalOrders:          0,
      totalClaimsSubmitted: 0,
      updatedAt:            now,
    });

    return userId;
  },
});

/**
 * Returns the current user's DB document.
 * Returns null if unauthenticated or not yet synced.
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/**
 * Promotes the currently authenticated user to admin.
 * Used for development/testing access to admin views.
 */
export const makeMeAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User record not found");

    await ctx.db.patch(user._id, { role: "admin" });
    return user._id;
  },
});
