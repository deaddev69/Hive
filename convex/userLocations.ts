// convex/userLocations.ts
// Handles persistence of the user's geolocation and geocoded info.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getCurrentUserOrNull } from "./lib/auth";

/**
 * Retrieve the current logged-in user's saved location.
 */
export const get = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return null;

    return await ctx.db
      .query("userLocations")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

/**
 * Save or update the user's location.
 */
export const save = mutation({
  args: {
    latitude:  v.number(),
    longitude: v.number(),
    locality:  v.optional(v.string()),
    city:      v.string(),
    state:     v.string(),
    country:   v.string(),
    postcode:  v.string(),
    token:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const existing = await ctx.db
      .query("userLocations")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        latitude:  args.latitude,
        longitude: args.longitude,
        locality:  args.locality || "",
        city:      args.city,
        state:     args.state,
        country:   args.country,
        postcode:  args.postcode,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userLocations", {
        userId:    user._id,
        latitude:  args.latitude,
        longitude: args.longitude,
        locality:  args.locality || "",
        city:      args.city,
        state:     args.state,
        country:   args.country,
        postcode:  args.postcode,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
