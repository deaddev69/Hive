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

function normalizeDriverPhone(mobile: any): string | undefined {
  if (!mobile) return undefined;
  if (typeof mobile === "string") return mobile.trim() || undefined;
  if (typeof mobile === "object") {
    const num = mobile.number || mobile.mobile_number || mobile.phone_number || mobile.mobile;
    if (typeof num === "string" && num.trim()) {
      return num.trim();
    }
  }
  return undefined;
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

  // Porter's `order_id` is the CRN returned when the Porter order was created.
  // Hive stores that CRN as shipments.awbNumber, which is how the event maps back
  // to a Hive shipment and order.
  const orderId = payload.order_id;
  const rawStatus = payload.status;

  if (!orderId || !rawStatus) {
    return new Response("Missing order_id or status", { status: 400 });
  }

  // Map Porter string statuses to our internal enum
  let mappedStatus = "";
  if (rawStatus === "order_accepted") {
    mappedStatus = "driver_assigned";
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

  const rawDriver = payload.order_details?.driver_details || payload.driver_details;
  let driverDetails: any = rawDriver ? {
    name: rawDriver.driver_name || rawDriver.name,
    phone: normalizeDriverPhone(rawDriver.mobile || rawDriver.phone),
    vehiclePlate: rawDriver.vehicle_number || rawDriver.vehiclePlate,
  } : undefined;

  let porterRawOrder: any = undefined;

  if (rawStatus === "order_accepted") {
    console.log(`[PorterSync] Fetching order details for CRN: ${orderId}`);
    try {
      const syncResult = await ctx.runAction(internal.lib.porter.syncOrderDetails, { crn: orderId });
      
      driverDetails = {
        ...(driverDetails || {}),
        name: syncResult.name || driverDetails?.name,
        phone: syncResult.phone || driverDetails?.phone,
        vehiclePlate: syncResult.vehiclePlate || driverDetails?.vehiclePlate,
        trackingUrl: syncResult.trackingUrl,
        liveTrackingUrl: syncResult.liveTrackingUrl,
        etaMinutes: syncResult.etaMinutes,
      };
      
      porterRawOrder = syncResult.rawOrder;
      console.log(`[PorterSync] Successfully enriched shipment for CRN: ${orderId}`);
    } catch (err) {
      console.warn(`[PorterSync] Failed to enrich shipment for CRN: ${orderId}:`, err);
    }
  }

  // Porter sends `event_ts` in seconds; normalise to epoch ms.
  const rawEventTs = payload.order_details?.event_ts ?? payload.event_ts;
  let eventTs: number | undefined = undefined;
  if (typeof rawEventTs === "number" && rawEventTs > 0) {
    eventTs = rawEventTs < 1e12 ? Math.round(rawEventTs * 1000) : Math.round(rawEventTs);
  }

  const rawTripFare = payload.order_details?.actual_trip_fare ?? payload.actual_trip_fare;
  const actualTripFare = typeof rawTripFare === "number" && rawTripFare > 0 ? rawTripFare : undefined;

  // Dispatch background mutation immediately to guarantee 15s fast response.
  // The mutation is idempotent: a repeated `order_end_job` leaves the order
  // delivered and never creates a second seller payout.
  await ctx.runMutation(internal.adminLogistics.processLogisticsStatusUpdateInternal, {
    awbNumber: orderId, // Our DB uses awbNumber to store the CRN
    status: mappedStatus as any,
    scans: [],
    exceptionType: rawStatus === "order_cancel" ? "other" : undefined,
    remarks: `Porter Webhook Status: ${rawStatus}`,
    location: payload.order_details?.partner_location?.lat
      ? `${payload.order_details.partner_location.lat},${payload.order_details.partner_location.long}`
      : undefined,
    driverDetails,
    porterRawOrder,
    eventTs,
    actualTripFare,
  }).catch((err) => {
    console.error("[PorterWebhook] Background mutation error:", err);
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
