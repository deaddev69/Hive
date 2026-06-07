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

    let targetUserId = existing?._id;
    let targetUserRole = existing?.role ?? "customer";

    if (existing) {
      // Update email/name in case they changed in Clerk
      await ctx.db.patch(existing._id, {
        email:     args.email ?? existing.email,
        updatedAt: now,
      });
    } else {
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
      targetUserId = userId;

      // Create default customer profile
      await ctx.db.insert("customerProfiles", {
        userId,
        displayName:          args.name ?? args.email?.split("@")[0] ?? "Customer",
        hiveScore:            100,
        totalOrders:          0,
        totalClaimsSubmitted: 0,
        updatedAt:            now,
      });
    }

    // Auto link approved boutique owner by email
    if (args.email && targetUserRole !== "admin") {
      const email = args.email;
      const boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();

      if (boutique && boutique.status === "APPROVED" && targetUserId) {
        await ctx.db.patch(boutique._id, { 
          userId: targetUserId,
          ownerUserId: targetUserId 
        });
        await ctx.db.patch(targetUserId, { role: "boutique_owner", updatedAt: now });
      }
    }

    return targetUserId;
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

    // Bootstrap check: prevent promotion if any admin already exists
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (existingAdmin) {
      throw new Error("Admin already initialized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User record not found");

    await ctx.db.patch(user._id, { role: "admin", updatedAt: Date.now() });
    return user._id;
  },
});

/**
 * Checks if at least one admin exists in the system.
 */
export const hasAdmins = query({
  args: {},
  handler: async (ctx) => {
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();
    return !!existingAdmin;
  },
});

/**
 * Returns all users. Requires admin privileges.
 */
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!me || me.role !== "admin") {
      throw new Error("Unauthorized: Only admins can view users.");
    }

    // Since there's no updatedAt index, sort by default ID (chronological) and reverse
    return await ctx.db.query("users").order("desc").collect();
  },
});

/**
 * Updates a user's role. Requires admin privileges.
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("customer"), v.literal("boutique_owner"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!me || me.role !== "admin") {
      throw new Error("Unauthorized: Only admins can change roles.");
    }

    await ctx.db.patch(args.userId, { role: args.role, updatedAt: Date.now() });
    return true;
  },
});
