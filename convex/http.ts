import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { handleClerkWebhook } from "./webhooks/clerk";
import { handleRazorpayWebhook } from "./webhooks/razorpay";
import { handleLogisticsWebhook } from "./webhooks/logistics";
import { handlePorterWebhook } from "./webhooks/porter";

const http = httpRouter();

// Clerk user sync webhook
// POST /webhooks/clerk
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: handleClerkWebhook,
});

// Razorpay payment webhook
// POST /webhooks/razorpay
http.route({
  path: "/webhooks/razorpay",
  method: "POST",
  handler: handleRazorpayWebhook,
});



// Logistics provider webhook (Delhivery / Porter)
// POST /webhooks/logistics
http.route({
  path: "/webhooks/logistics",
  method: "POST",
  handler: handleLogisticsWebhook,
});

// Porter Logistics webhook
// POST /webhooks/porter
http.route({
  path: "/webhooks/porter",
  method: "POST",
  handler: handlePorterWebhook,
});

// Real-time Porter order status updates webhook
http.route({
  path: "/porter-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const orderId = payload.order_id;
      const status = payload.status;

      if (!orderId || !status) {
        console.warn("[/porter-webhook] Missing order_id or status");
        return new Response("Bad Request: Missing order_id or status", { status: 400 });
      }

      // Call internal mutation to update the shipment status
      await ctx.runMutation(internal.porter.updateShipmentStatus, {
        orderId: String(orderId),
        status: String(status),
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("[/porter-webhook] Error processing webhook:", error);
      // Return 400 for invalid JSON or payload errors gracefully
      return new Response("Bad Request: Invalid Payload", { status: 400 });
    }
  }),
});

// Health check
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({ status: "ok", service: "hive-convex", ts: Date.now() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;
