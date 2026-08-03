"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import webPush from "web-push";

/**
 * Dispatch Web Push payload to a specific subscription endpoint.
 */
export const sendOrderPush = internalAction({
  args: {
    subscription: v.object({
      endpoint: v.string(),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    icon: v.optional(v.string()),
    badge: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn(
        "[sendOrderPush] VAPID keys not configured in environment variables. Web push skipped."
      );
      return;
    }

    try {
      webPush.setVapidDetails(
        "mailto:support@hivenow.in",
        vapidPublicKey,
        vapidPrivateKey
      );

      const payload = JSON.stringify({
        title: args.title,
        body: args.body,
        url: args.url || "/boutique/orders",
        icon: args.icon || "/icon-192x192.png",
        badge: args.badge || "/icon-192x192.png",
        timestamp: Date.now(),
      });

      await webPush.sendNotification(args.subscription, payload);
      console.log(
        `[sendOrderPush] Web push dispatched successfully to endpoint: ${args.subscription.endpoint.slice(0, 30)}...`
      );
    } catch (err: any) {
      console.error(
        `[sendOrderPush] Failed to send push notification:`,
        err.statusCode || err.message || err
      );

      // Clean up subscription if expired or unregistered (HTTP 410 Gone / 404 Not Found)
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(
          `[sendOrderPush] Removing expired push subscription endpoint: ${args.subscription.endpoint}`
        );
        await ctx.runMutation(internal.pushNotifications.removePushSubscription, {
          endpoint: args.subscription.endpoint,
        });
      }
    }
  },
});

/**
 * Dispatch Web Push notification to all active subscriptions of a boutique.
 */
export const sendOrderPushToBoutique = internalAction({
  args: {
    boutiqueId: v.id("boutiques"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.runQuery(
      internal.pushNotifications.getBoutiquePushSubscriptions,
      { boutiqueId: args.boutiqueId }
    );

    if (!subscriptions || subscriptions.length === 0) {
      console.log(
        `[sendOrderPushToBoutique] No active push subscriptions found for boutique: ${args.boutiqueId}`
      );
      return;
    }

    for (const sub of subscriptions) {
      await ctx.runAction(internal.pushActions.sendOrderPush, {
        subscription: sub.subscription,
        title: args.title,
        body: args.body,
        url: args.url,
      });
    }
  },
});
