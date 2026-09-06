import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Timing-safe string comparison, matching the helper already used by the Porter and
 * logistics webhooks. Kept local to this module for the same reason those copies are.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request body.
 *
 * This endpoint previously had NO verification at all: the only check was
 * `body.object === "whatsapp_business_account"`, a value the caller supplies. Anyone
 * who knew the deployment URL could drive notification-status mutations at will.
 *
 * Meta signs the exact bytes it sent, so the caller must hand this the raw body text —
 * re-serialising a parsed object changes those bytes and breaks verification.
 *
 * Fails closed: a missing app secret, a missing header, a malformed header, or a
 * mismatch all return false. Exported as a pure function so it can be tested without
 * the Convex runtime.
 */
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
): Promise<boolean> {
  if (!appSecret) return false;
  if (!signatureHeader) return false;
  if (!signatureHeader.startsWith("sha256=")) return false;

  const provided = signatureHeader.slice("sha256=".length);
  if (!/^[0-9a-f]+$/i.test(provided)) return false;

  try {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody));
    const expected = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return constantTimeCompare(expected, provided.toLowerCase());
  } catch {
    // Never log the secret, the signature, or the payload.
    console.error("[WhatsAppWebhookVerify] Cryptographic signature check error.");
    return false;
  }
}

/**
 * Upper bound on status updates processed from a single webhook delivery.
 *
 * Entry/change/status array lengths are all supplied by the caller, and each status
 * costs a database mutation, so one request could otherwise fan out arbitrarily.
 * Signature verification above is the real control; this is defence in depth against a
 * replayed or malformed-but-signed payload.
 *
 * WhatsApp Cloud API delivers status webhooks in very small batches — typically a
 * single status, occasionally a handful — so 100 leaves roughly two orders of
 * magnitude of headroom over observed legitimate traffic while still bounding the
 * worst case. Exceeding it is rejected rather than truncated, so a genuine oversized
 * batch surfaces as a visible 413 instead of silently dropping delivery receipts.
 */
export const MAX_STATUS_UPDATES_PER_WEBHOOK = 100;

/** Counts status entries in a parsed webhook payload without mutating anything. */
export function countStatusUpdates(body: any): number {
  let count = 0;
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.value?.statuses) count += change.value.statuses.length;
    }
  }
  return count;
}

export const get = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
});

export const post = httpAction(async (ctx, request) => {
  try {
    // Read the raw bytes Meta signed, before any parsing.
    const rawBody = await request.text();

    const isVerified = await verifyMetaSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      process.env.WHATSAPP_APP_SECRET
    );
    if (!isVerified) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Verify this is a WhatsApp webhook payload
    if (body.object === "whatsapp_business_account") {
      if (countStatusUpdates(body) > MAX_STATUS_UPDATES_PER_WEBHOOK) {
        console.error("[WhatsAppWebhook] Rejected payload exceeding status update bound.");
        return new Response("Payload Too Large", { status: 413 });
      }

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.statuses) {
            for (const status of change.value.statuses) {
              const wamid = status.id;
              const deliveryStatus = status.status; // 'sent', 'delivered', 'read', 'failed'
              const errorPayload = status.errors ? JSON.stringify(status.errors) : undefined;

              // Dispatch an internal mutation to update the status in notificationLogs
              await ctx.runMutation(internal.adminNotifications.updateWhatsAppStatus, {
                wamid,
                status: deliveryStatus,
                errorPayload
              });
            }
          }
        }
      }
      return new Response("OK", { status: 200 });
    }

    return new Response("Not a WhatsApp payload", { status: 404 });
  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
