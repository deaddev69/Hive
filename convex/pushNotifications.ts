import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save or update device push subscription for boutique owners and staff.
 */
export const savePushSubscription = mutation({
  args: {
    boutiqueId: v.id("boutiques"),
    userId: v.id("users"),
    subscription: v.object({
      endpoint: v.string(),
      expirationTime: v.optional(v.union(v.number(), v.null())),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) =>
        q.eq("subscription.endpoint", args.subscription.endpoint)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        boutiqueId: args.boutiqueId,
        userId: args.userId,
        subscription: args.subscription,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      boutiqueId: args.boutiqueId,
      userId: args.userId,
      subscription: args.subscription,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Remove expired or unsubscribed push subscription endpoint.
 */
export const removePushSubscription = internalMutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) =>
        q.eq("subscription.endpoint", args.endpoint)
      )
      .collect();

    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }
  },
});

/**
 * Fetch all registered push subscriptions for a specific boutique.
 */
export const getBoutiquePushSubscriptions = internalQuery({
  args: {
    boutiqueId: v.id("boutiques"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_boutique", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();
  },
});
