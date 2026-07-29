// convex/adminNotifications.ts
// Admin management APIs for tracking, auditing, and resending system notifications.

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { triggerNotification } from "./lib/notifications";

export const listNotificationEvents = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Admin role required.");
    }

    const limit = args.limit ?? 50;

    return await ctx.db
      .query("notificationEvents")
      .order("desc")
      .take(limit);
  },
});

export const resendNotification = mutation({
  args: {
    token: v.optional(v.string()),
    eventId: v.id("notificationEvents"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Admin role required.");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Notification event not found.");
    }

    const now = Date.now();

    // Bypass dedupe by appending a resend suffix to the entityId for the audit log
    const newEventId = await triggerNotification(
      ctx,
      event.userId,
      event.channel,
      event.template,
      event.entityType,
      `${event.entityId}-resend-${now}`,
      event.payload
    );

    return { success: true, newEventId };
  },
});

export const updateWhatsAppStatus = internalMutation({
  args: {
    wamid: v.string(),
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read"), v.literal("failed")),
    errorPayload: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the log entry by wamid
    const log = await ctx.db
      .query("notificationLogs")
      .filter((q) => q.eq(q.field("providerMessageId"), args.wamid))
      .first();

    if (log) {
      await ctx.db.patch(log._id, {
        status: args.status,
        errorPayload: args.errorPayload,
      });
      console.log(`[updateWhatsAppStatus] Updated log ${log._id} to ${args.status}`);
    } else {
      console.warn(`[updateWhatsAppStatus] No log found for wamid ${args.wamid}`);
    }
  },
});
