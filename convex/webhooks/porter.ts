import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const handlePorterWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.PORTER_WEBHOOK_SECRET || process.env.PORTER_API_KEY;
  const isProduction = process.env.NODE_ENV === "production" || process.env.ENABLE_DEBUG_TOOLS !== "true";

  // FAIL CLOSED: Webhook secret must be set to a real value in production
  if (!webhookSecret || (webhookSecret === "mock_secret" && isProduction)) {
    console.error("[PorterWebhook] Webhook secret not configured or mock secret used in production.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Retrieve credentials from header
  const signature = request.headers.get("x-api-key");
  if (!signature) {
    console.error("[PorterWebhook] Missing x-api-key header.");
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate token signature using constant-time comparison
  if (!constantTimeCompare(signature, webhookSecret)) {
    console.error("[PorterWebhook] Signature verification failed.");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const orderId = payload.order_id;
  const rawStatus = payload.status;

  if (!orderId || !rawStatus) {
    return new Response("Missing order_id or status", { status: 400 });
  }

  // Map Porter string statuses to our internal enum
  let mappedStatus = "";
  if (rawStatus === "order_accepted") {
    mappedStatus = "pickup_scheduled";
  } else if (rawStatus === "order_start_trip") {
    mappedStatus = "in_transit";
  } else if (rawStatus === "order_end_job") {
    mappedStatus = "delivered";
  } else if (rawStatus === "order_cancel") {
    // If a rider cancels, Porter tries to reassign. Wait, 'order_reopen' handles reassignment.
    // 'order_cancel' means the whole job is cancelled.
    mappedStatus = "failed";
  } else if (rawStatus === "order_reopen") {
    // Rider cancelled, bumping shipment back to looking for rider (created)
    mappedStatus = "created";
  } else {
    console.warn(`[PorterWebhook] Unmapped raw status received: "${rawStatus}" for CRN: ${orderId}`);
    return new Response(JSON.stringify({ success: true, message: "Unmapped status ignored" }), { status: 200 });
  }

  // Dispatch background mutation immediately to guarantee 15s fast response
  await ctx.runMutation(internal.adminLogistics.processLogisticsStatusUpdateInternal, {
    awbNumber: orderId, // Our DB uses awbNumber to store the CRN
    status: mappedStatus as any,
    scans: [],
    exceptionType: rawStatus === "order_cancel" ? "other" : undefined,
    remarks: `Porter Webhook Status: ${rawStatus}`,
    location: payload.order_details?.partner_location?.lat 
      ? `${payload.order_details.partner_location.lat},${payload.order_details.partner_location.long}`
      : undefined,
    driverDetails: payload.order_details?.driver_details ? {
      name: payload.order_details.driver_details.driver_name,
      phone: payload.order_details.driver_details.mobile,
    } : undefined,
  }).catch((err) => {
    console.error("[PorterWebhook] Background mutation error:", err);
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
