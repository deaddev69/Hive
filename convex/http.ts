import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { handleClerkWebhook } from "./webhooks/clerk";
import { handleRazorpayWebhook } from "./webhooks/razorpay";
import { handleLogisticsWebhook } from "./webhooks/logistics";
import { handlePorterWebhook } from "./webhooks/porter";
import * as whatsappWebhook from "./webhooks/whatsapp";

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

// Meta WhatsApp Cloud API webhooks
// GET /webhooks/whatsapp (Verification challenge)
http.route({
  path: "/webhooks/whatsapp",
  method: "GET",
  handler: whatsappWebhook.get,
});

// POST /webhooks/whatsapp (Message status updates)
http.route({
  path: "/webhooks/whatsapp",
  method: "POST",
  handler: whatsappWebhook.post,
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
