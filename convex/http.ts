// convex/http.ts
// HTTP Action router — handles inbound webhooks from Razorpay and logistics providers.
// These are registered as Convex HTTP Actions (POST endpoints).

import { httpRouter } from "convex/server";

const http = httpRouter();

// Razorpay payment webhook
// POST /webhooks/razorpay
http.route({
  path: "/webhooks/razorpay",
  method: "POST",
  handler: async (ctx, request) => {
    // TODO: implement in convex/webhooks/razorpay.ts
    // 1. Verify HMAC-SHA256 signature
    // 2. Check idempotency via webhookEvents table
    // 3. Route payment events → update orders/payments tables
    return new Response("OK", { status: 200 });
  },
});

// Logistics provider webhook (Delhivery / Shiprocket)
// POST /webhooks/logistics
http.route({
  path: "/webhooks/logistics",
  method: "POST",
  handler: async (ctx, request) => {
    // TODO: implement in convex/webhooks/logistics.ts
    // 1. Verify provider-specific auth header
    // 2. Check idempotency
    // 3. Update shipments table + orders status
    return new Response("OK", { status: 200 });
  },
});

// Health check
http.route({
  path: "/health",
  method: "GET",
  handler: async () => {
    return new Response(
      JSON.stringify({ status: "ok", service: "hive-convex", ts: Date.now() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  },
});

export default http;
