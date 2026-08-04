import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save a customer's Web Push subscription.
 */
export const saveCustomerPushSubscription = mutation({
  args: {
    userId: v.optional(v.id("users")),
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
      .query("customerPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("subscription.endpoint", args.subscription.endpoint))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId ?? existing.userId,
        subscription: args.subscription,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("customerPushSubscriptions", {
      userId: args.userId,
      subscription: args.subscription,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal query to fetch all customer subscriptions for action.
 */
export const getAllCustomerSubscriptionsInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("customerPushSubscriptions").collect();
  },
});

/**
 * Internal mutation to remove expired subscription.
 */
export const removeCustomerSubscriptionInternal = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customerPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("subscription.endpoint", args.endpoint))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
