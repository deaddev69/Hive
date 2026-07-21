// convex/webhooks/clerk.ts
// Clerk user synchronization webhook processor.
// Uses native Web Crypto API to verify Svix signatures without external dependencies.

import { httpAction, internalMutation, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// Cryptographic Webhook Verification (Web Crypto API)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyClerkWebhookSignature(
  payload: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string
): Promise<boolean> {
  try {
    // 1. Clean the secret: strip "whsec_" prefix if present
    let rawSecret = secret;
    if (secret.startsWith("whsec_")) {
      rawSecret = secret.slice(6);
    }
    
    // 2. Decode base64 secret key
    const binarySecret = atob(rawSecret);
    const keyBytes = new Uint8Array(binarySecret.length);
    for (let i = 0; i < binarySecret.length; i++) {
      keyBytes[i] = binarySecret.charCodeAt(i);
    }
    
    // 3. Construct message signature layout
    const msg = `${headers.id}.${headers.timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const msgBytes = encoder.encode(msg);
    
    // 4. Import HMAC key via SubtleCrypto
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify", "sign"]
    );
    
    // 5. Compute local HMAC signature hash
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const localHexSignature = signatureArray
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    // 6. Compare with provided signatures (handles multiple space-separated signatures)
    const providedSignatures = headers.signature
      .split(" ")
      .map(part => {
        const [version, sig] = part.split(",");
        return version === "v1" ? sig : null;
      })
      .filter(Boolean);
    
    return providedSignatures.some(sig => sig === localHexSignature);
  } catch (err) {
    console.error("[ClerkWebhookVerify] Cryptographic signature check error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Webhook Endpoint Action
// ─────────────────────────────────────────────────────────────────────────────

export const handleClerkWebhook = httpAction(async (ctx, request) => {
  const isWebhookSyncEnabled = process.env.ENABLE_CLERK_WEBHOOK_SYNC !== "false";
  if (!isWebhookSyncEnabled) {
    console.log("[ClerkWebhook] Webhook sync is disabled via ENABLE_CLERK_WEBHOOK_SYNC feature flag.");
    return new Response("Webhook sync disabled", { status: 200 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[ClerkWebhook] CLERK_WEBHOOK_SECRET is not configured inside env variables.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Retrieve Svix headers
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("[ClerkWebhook] Missing required svix signature headers.");
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await request.text();

  // Verify signature
  const isVerified = await verifyClerkWebhookSignature(
    payload,
    { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
    webhookSecret
  );

  if (!isVerified) {
    console.error("[ClerkWebhook] Webhook signature verification failed.");
    return new Response("Invalid signature", { status: 400 });
  }

  // Parse event
  let event: any;
  try {
    event = JSON.parse(payload);
  } catch (err) {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const eventId = event.id || svixId;
  const eventType = event.type;

  console.log(`[ClerkWebhook] Received event: ${eventType} (ID: ${eventId})`);

  // Idempotency: check if already processed
  const existingLog = await ctx.runQuery(internal.webhooks.clerk.getWebhookEvent, {
    eventId,
  });

  if (existingLog) {
    if (existingLog.status === "processed") {
      console.log(`[ClerkWebhook] Event ${eventId} was already processed successfully. Skipping.`);
      return new Response("Event already processed", { status: 200 });
    }
    if (existingLog.status === "duplicate") {
      console.log(`[ClerkWebhook] Event ${eventId} logged as duplicate. Skipping.`);
      return new Response("Duplicate event ignored", { status: 200 });
    }
  }

  // Log incoming webhook event in DB
  const logId = await ctx.runMutation(internal.webhooks.clerk.recordWebhookEvent, {
    eventId,
    eventType,
    payload,
    status: existingLog ? "duplicate" : "received",
  });

  if (existingLog) {
    return new Response("Duplicate event logged", { status: 200 });
  }

  try {
    // Route webhook events to users mutations
    if (eventType === "user.created" || eventType === "user.updated") {
      const data = event.data;
      const clerkId = data.id;
      const emailObj = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      ) || data.email_addresses?.[0];
      const email = emailObj?.email_address;
      const isVerified = emailObj?.verification?.status === "verified";
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;
      const phoneObj = data.phone_numbers?.find(
        (p: any) => p.id === data.primary_phone_number_id
      ) || data.phone_numbers?.[0];
      const phone = phoneObj?.phone_number || undefined;
      const isPhoneVerified = phoneObj?.verification?.status === "verified";

      if (eventType === "user.created") {
        await ctx.runMutation(internal.users.syncUserFromWebhook, {
          clerkId,
          email,
          name,
          isEmailVerified: isVerified,
          phone,
          isPhoneVerified,
        });
      } else {
        await ctx.runMutation(internal.users.syncUserUpdateFromWebhook, {
          clerkId,
          email,
          name,
          isEmailVerified: isVerified,
          phone,
          isPhoneVerified,
        });
      }
    } else if (eventType === "user.deleted") {
      const data = event.data;
      const clerkId = data.id;

      await ctx.runMutation(internal.users.syncUserDeleteFromWebhook, {
        clerkId,
      });
    } else if (eventType === "session.created") {
      const data = event.data;
      const clerkId = data.user_id;
      if (clerkId) {
        await ctx.runMutation(internal.users.logUserSessionEvent, {
          clerkId,
          action: "user.signed_in",
        });
      }
    } else if (eventType === "session.removed" || eventType === "session.ended") {
      const data = event.data;
      const clerkId = data.user_id;
      if (clerkId) {
        await ctx.runMutation(internal.users.logUserSessionEvent, {
          clerkId,
          action: "user.signed_out",
        });
      }
    }

    // Mark as processed
    await ctx.runMutation(internal.webhooks.clerk.updateWebhookEventStatus, {
      id: logId,
      status: "processed",
    });

    console.log(`[ClerkWebhook] Successfully processed event: ${eventType}`);
  } catch (err: any) {
    console.error(`[ClerkWebhook] Error processing event ${eventType}:`, err);
    await ctx.runMutation(internal.webhooks.clerk.updateWebhookEventStatus, {
      id: logId,
      status: "failed",
      error: err.message || String(err),
    });
    return new Response("Error processing event", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook DB Logging Queries & Mutations
// ─────────────────────────────────────────────────────────────────────────────

export const getWebhookEvent = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhookEvents")
      .withIndex("by_source_eventId", (q) => q.eq("source", "clerk").eq("eventId", args.eventId))
      .first();
  },
});

export const recordWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.string(),
    status: v.union(v.literal("received"), v.literal("processed"), v.literal("failed"), v.literal("duplicate")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", {
      source: "clerk",
      eventId: args.eventId,
      eventType: args.eventType,
      payload: args.payload,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});

export const updateWebhookEventStatus = internalMutation({
  args: {
    id: v.id("webhookEvents"),
    status: v.union(v.literal("received"), v.literal("processed"), v.literal("failed"), v.literal("duplicate")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      error: args.error,
      processedAt: Date.now(),
    });
  },
});
