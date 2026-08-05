"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import webPush from "web-push";

interface BroadcastResult {
  success: boolean;
  count?: number;
  total?: number;
  error?: string;
}

/**
 * Action to broadcast campaign notification with Cloudflare R2 banner to all customers.
 */
export const broadcastCustomerNotification = action({
  args: {
    title: v.string(),
    body: v.string(),
    bannerUrl: v.optional(v.string()), // Cloudflare R2 Public Image URL
    targetUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<BroadcastResult> => {
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("[broadcastCustomerNotification] VAPID keys missing. Web push skipped.");
      return { success: false, error: "VAPID keys not configured" };
    }

    webPush.setVapidDetails(
      "mailto:support@hivenow.in",
      vapidPublicKey,
      vapidPrivateKey
    );

    const subscriptions: any[] = await ctx.runQuery(
      internal.customerPush.getAllCustomerSubscriptionsInternal
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, count: 0, total: 0 };
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      bannerUrl: args.bannerUrl,
      targetUrl: args.targetUrl || "/",
      timestamp: Date.now(),
    });

    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(sub.subscription, payload, {
          urgency: "normal",
          TTL: 86400,
        });
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await ctx.runMutation(internal.customerPush.removeCustomerSubscriptionInternal, {
            endpoint: sub.subscription.endpoint,
          });
        }
      }
    }

    return { success: true, count: successCount, total: subscriptions.length };
  },
});

/**
 * Enterprise Campaign Push Dispatcher Action with Execution Recording
 */
export const dispatchPushCampaign = action({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    title: v.string(),
    body: v.string(),
    bannerUrl: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    triggeredBy: v.optional(
      v.union(v.literal("manual"), v.literal("schedule"), v.literal("api"))
    ),
    sentBy: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<BroadcastResult> => {
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("[dispatchPushCampaign] VAPID keys missing. Push skipped.");
      return { success: false, error: "VAPID keys not configured in server environment" };
    }

    webPush.setVapidDetails(
      "mailto:support@hivenow.in",
      vapidPublicKey,
      vapidPrivateKey
    );

    const subscriptions: any[] = await ctx.runQuery(
      internal.customerPush.getAllCustomerSubscriptionsInternal
    );

    const totalSubscribers = subscriptions?.length || 0;
    const now = Date.now();

    if (!subscriptions || totalSubscribers === 0) {
      if (args.campaignId) {
        await ctx.runMutation(internal.campaigns.recordExecutionInternal, {
          campaignId: args.campaignId,
          channel: "push",
          status: "completed",
          triggeredBy: args.triggeredBy || "manual",
          sentAt: now,
          metrics: { sent: 0, delivered: 0, failed: 0, clicked: 0 },
          sentBy: args.sentBy,
        });
      }
      return { success: true, count: 0, total: 0 };
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      bannerUrl: args.bannerUrl,
      targetUrl: args.targetUrl || "/",
      timestamp: now,
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(sub.subscription, payload, {
          urgency: "normal",
          TTL: 86400,
        });
        successCount++;
      } catch (err: any) {
        failCount++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await ctx.runMutation(internal.customerPush.removeCustomerSubscriptionInternal, {
            endpoint: sub.subscription.endpoint,
          });
        }
      }
    }

    // Persist campaign execution audit log if campaignId exists
    if (args.campaignId) {
      await ctx.runMutation(internal.campaigns.recordExecutionInternal, {
        campaignId: args.campaignId,
        channel: "push",
        status: "completed",
        triggeredBy: args.triggeredBy || "manual",
        sentAt: now,
        metrics: {
          sent: totalSubscribers,
          delivered: successCount,
          failed: failCount,
          clicked: 0,
        },
        sentBy: args.sentBy,
      });
    }

    return { success: true, count: successCount, total: totalSubscribers };
  },
});
