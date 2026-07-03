// convex/webhooks/logistics.ts
// Unified logistics webhook handler for processing Delhivery / Shiprocket / Porter updates.
// Enforces strict secret verification and fails closed in production.

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

export const handleLogisticsWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.LOGISTICS_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === "production" || process.env.ENABLE_DEBUG_TOOLS !== "true";

  // FAIL CLOSED: Webhook secret must be set to a real value in production
  if (!webhookSecret || (webhookSecret === "mock_secret" && isProduction)) {
    console.error("[LogisticsWebhook] Webhook secret not configured or mock secret used in production.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Retrieve credentials from header (supporting custom signature header or token header)
  const signature = request.headers.get("x-logistics-signature") || request.headers.get("authorization");
  if (!signature) {
    console.error("[LogisticsWebhook] Missing signature or authorization header.");
    return new Response("Unauthorized", { status: 401 });
  }

  // Validate token signature using constant-time comparison
  if (!constantTimeCompare(signature, webhookSecret)) {
    console.error("[LogisticsWebhook] Signature verification failed.");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  // Determine if it's a Shiprocket payload by checking specific fields
  let awbNumber = payload.awbNumber || payload.awb;
  let status = payload.status || payload.current_status;
  let scans = payload.scans || [];
  let exceptionType = payload.exceptionType;
  let remarks = payload.remarks;
  let location = payload.location;

  if (!awbNumber || !status) {
    return new Response("Missing awbNumber or status", { status: 400 });
  }

  // Deduplicate scans based on timestamp/status (to append safely if Shiprocket sends partial history)
  try {
    await ctx.runMutation(internal.adminLogistics.processLogisticsStatusUpdateInternal, {
      awbNumber,
      status,
      scans,
      exceptionType,
      remarks,
      location,
      driverDetails: payload.driverDetails,
    });
  } catch (err: any) {
    console.error("[LogisticsWebhook] Mutation error:", err);
    return new Response(`Processing error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
