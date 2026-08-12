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
      expirationTime: v.optional(v.union(v.number(), v.null())),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string(),
      }),
    }),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    netPayout: v.optional(v.number()),
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
        netPayout: args.netPayout,
        url: args.url || "/boutique/orders",
        icon: args.icon || "/icon-192x192.png",
        badge: args.badge || "/icon-192x192.png",
        timestamp: Date.now(),
      });

      await webPush.sendNotification(args.subscription, payload, {
        urgency: "high",
        TTL: 60,
      });
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
    netPayout: v.optional(v.number()),
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
      const isNativeFcm =
        Boolean(sub.fcmToken) ||
        sub.subscription?.endpoint?.startsWith("fcm://") ||
        sub.subscription?.keys?.p256dh === "fcm_native";

      if (isNativeFcm) {
        const token = sub.fcmToken || sub.subscription.endpoint.replace("fcm://", "");
        if (token && token !== "fcm_native") {
          await ctx.runAction(internal.pushActions.sendFcmPush, {
            token,
            title: args.title,
            body: args.body,
            netPayout: args.netPayout,
            url: args.url,
          });
        }
      } else {
        await ctx.runAction(internal.pushActions.sendOrderPush, {
          subscription: sub.subscription,
          title: args.title,
          body: args.body,
          netPayout: args.netPayout,
          url: args.url,
        });
      }
    }
  },
});

/**
 * Generate Google OAuth2 Access Token for FCM HTTP v1 API using Service Account credentials.
 */
async function getFcmV1AccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const crypto = await import("node:crypto");
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const formattedKey = privateKey.replace(/\\n/g, "\n");
  const signature = signer.sign(formattedKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth2 token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

/**
 * Dispatch FCM Data Message to a native Android device token.
 * Uses high priority data-only payload to trigger HiveFirebaseMessagingService
 * even when the app is completely closed/killed.
 */
export const sendFcmPush = internalAction({
  args: {
    token: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    netPayout: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Try FCM HTTP v1 using Service Account credentials
    const saJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID || "hive-fashion";

    if (saJsonStr) {
      try {
        const parsed = JSON.parse(saJsonStr);
        clientEmail = parsed.client_email || clientEmail;
        privateKey = parsed.private_key || privateKey;
        projectId = parsed.project_id || projectId;
      } catch (e) {
        console.warn("[sendFcmPush] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
      }
    }

    if (clientEmail && privateKey) {
      try {
        const accessToken = await getFcmV1AccessToken(clientEmail, privateKey);
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: args.token,
                android: {
                  priority: "high",
                  ttl: "60s",
                },
                data: {
                  title: args.title,
                  body: args.body,
                  url: args.url || "/boutique/orders",
                  netPayout: args.netPayout ? String(args.netPayout) : "",
                  timestamp: String(Date.now()),
                },
              },
            }),
          }
        );

        const resultText = await res.text();
        console.log(`[sendFcmPush] FCM HTTP v1 dispatch result (${res.status}):`, resultText);
        return;
      } catch (v1Err: any) {
        console.error("[sendFcmPush] FCM v1 dispatch error:", v1Err);
      }
    }

    // 2. Fallback to FCM Legacy API if FCM_SERVER_KEY is set
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (fcmServerKey) {
      try {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${fcmServerKey}`,
          },
          body: JSON.stringify({
            to: args.token,
            priority: "high",
            content_available: true,
            data: {
              title: args.title,
              body: args.body,
              url: args.url || "/boutique/orders",
              netPayout: args.netPayout ? String(args.netPayout) : "",
              timestamp: String(Date.now()),
            },
          }),
        });

        const text = await response.text();
        console.log(`[sendFcmPush] Legacy FCM dispatch result (${response.status}):`, text);
      } catch (err: any) {
        console.error("[sendFcmPush] Legacy FCM send error:", err);
      }
    } else {
      console.warn("[sendFcmPush] No FCM service account or server key configured in Convex.");
    }
  },
});
