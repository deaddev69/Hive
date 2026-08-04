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
