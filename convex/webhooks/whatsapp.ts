import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

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
    const body = await request.json();

    // Verify this is a WhatsApp webhook payload
    if (body.object === "whatsapp_business_account") {
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
