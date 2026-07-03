import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { handleClerkWebhook } from "./webhooks/clerk";
import { handleRazorpayWebhook } from "./webhooks/razorpay";
import { handleLogisticsWebhook } from "./webhooks/logistics";

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



// Logistics provider webhook (Delhivery / Shiprocket)
// POST /webhooks/logistics
http.route({
  path: "/webhooks/logistics",
  method: "POST",
  handler: handleLogisticsWebhook,
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
