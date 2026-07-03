// convex/auth.ts
// Custom authentication endpoints deprecation fallback for HIVE.
// Keeps only the getMe query for compatibility, resolving it via Clerk.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "./lib/auth";

/**
 * Returns the currently logged in user based on Clerk authentication.
 * Kept for frontend compatibility.
 */
export const getMe = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return null;
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    return {
      ...user,
      name: profile?.displayName,
    };
  },
});
