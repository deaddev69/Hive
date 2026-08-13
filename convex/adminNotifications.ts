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

/**
 * Admin: Get aggregated notification analytics (delivered vs read vs failed, per channel).
 */
export const getNotificationAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("notificationLogs").collect();

    let whatsappTotal = 0;
    let emailTotal = 0;
    let pushTotal = 0;
    let smsTotal = 0;

    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let sentCount = 0;

    const templateCounts: Record<string, number> = {};
    const failureReasons: Record<string, number> = {};

    for (const log of logs) {
      if (log.channel === "whatsapp") whatsappTotal++;
      else if (log.channel === "email") emailTotal++;
      else if (log.channel === "push") pushTotal++;
      else if (log.channel === "sms") smsTotal++;

      if (log.status === "delivered") deliveredCount++;
      else if (log.status === "read") {
        readCount++;
        deliveredCount++; // Read implies delivered
      } else if (log.status === "failed") {
        failedCount++;
        if (log.errorPayload) {
          const reason = log.errorPayload.slice(0, 50);
          failureReasons[reason] = (failureReasons[reason] || 0) + 1;
        }
      } else if (log.status === "pending") pendingCount++;
      else if (log.status === "sent") sentCount++;

      if (log.template) {
        templateCounts[log.template] = (templateCounts[log.template] || 0) + 1;
      }
    }

    const totalLogs = logs.length;
    const totalDeliveredOrRead = deliveredCount;
    const deliveryRatePercent = totalLogs > 0 ? Math.round((totalDeliveredOrRead / totalLogs) * 100) : 100;
    const readRatePercent = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0;

    return {
      totalLogs,
      whatsappTotal,
      emailTotal,
      pushTotal,
      smsTotal,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      pendingCount,
      deliveryRatePercent,
      readRatePercent,
      templateCounts,
      failureReasons,
    };
  },
});

/**
 * Admin: Get paginated and filterable notification delivery logs.
 */
export const getNotificationLogsPaginated = query({
  args: {
    channel: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db.query("notificationLogs").order("desc").collect();

    if (args.channel && args.channel !== "all") {
      logs = logs.filter((l) => l.channel === args.channel);
    }

    if (args.status && args.status !== "all") {
      logs = logs.filter((l) => l.status === args.status);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.recipient.toLowerCase().includes(q) ||
          l.template.toLowerCase().includes(q) ||
          (l.providerMessageId && l.providerMessageId.toLowerCase().includes(q))
      );
    }

    const limit = args.limit ?? 100;
    return logs.slice(0, limit);
  },
});

