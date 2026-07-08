import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { triggerNotification } from "./notifications";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

export const getToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("shiprocketTokens").order("desc").first();
  },
});

export const saveToken = internalMutation({
  args: { token: v.string(), issuedAt: v.number(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    // Delete old tokens to keep table clean
    const oldTokens = await ctx.db.query("shiprocketTokens").collect();
    for (const t of oldTokens) {
      await ctx.db.delete(t._id);
    }
    await ctx.db.insert("shiprocketTokens", {
      token: args.token,
      issuedAt: args.issuedAt,
      expiresAt: args.expiresAt,
    });
  },
});

export const clearToken = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oldTokens = await ctx.db.query("shiprocketTokens").collect();
    for (const t of oldTokens) {
      await ctx.db.delete(t._id);
    }
  },
});

export const getValidTokenAction = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const existing = await ctx.runQuery(internal.lib.shiprocket.getToken);
    const now = Date.now();

    // Token is valid for 10 days. Refresh if older than 9 days (777600000 ms)
    const NINE_DAYS_MS = 9 * 24 * 60 * 60 * 1000;

    if (existing && existing.issuedAt > now - NINE_DAYS_MS) {
      return existing.token;
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      throw new Error("Missing SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD environment variables");
    }

    let response;
    try {
      response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (err: any) {
      throw new Error(`Shiprocket token fetch failed: ${err.message}. Check network connectivity.`);
    }

    if (!response.ok) {
      throw new Error(`Shiprocket login failed: ${await response.text()}`);
    }

    const data = await response.json();
    const token = data.token;
    
    // Save to DB
    await ctx.runMutation(internal.lib.shiprocket.saveToken, {
      token,
      issuedAt: now,
      expiresAt: now + (10 * 24 * 60 * 60 * 1000),
    });

    return token;
  },
});

async function fetchShiprocketAPI(ctx: any, url: string, options: RequestInit): Promise<Response> {
  let token = await ctx.runAction(internal.lib.shiprocket.getValidTokenAction);
  
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  
  let res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    // Invalidate cached token
    await ctx.runMutation(internal.lib.shiprocket.clearToken);
    
    // Fetch a new one
    token = await ctx.runAction(internal.lib.shiprocket.getValidTokenAction);
    headers.set("Authorization", `Bearer ${token}`);
    
    // Retry exactly once
    res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      throw new Error("Shiprocket authentication failed. Contact support.");
    }
  }
  
  return res;
}

export const getOrderDetails = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<any> => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    let boutique = null;
    if (order.boutiqueId) {
      boutique = await ctx.db.get(order.boutiqueId);
    }
    
    // We expect snapshot to contain the resolved address
    return { order, orderItems, boutique };
  },
});

export const updateShipmentAfterBooking = internalMutation({
  args: { 
    shipmentId: v.id("shipments"), 
    shiprocketOrderId: v.string(), 
    awbNumber: v.string() 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shipmentId, {
      providerShipmentId: args.shiprocketOrderId,
      awbNumber: args.awbNumber,
      status: "pickup_scheduled",
      trackingUrl: `https://shiprocket.co/track/${args.awbNumber}`,
    });
  }
});

export const dispatchOrder = action({
  args: { orderId: v.id("orders"), shipmentId: v.id("shipments") },
  handler: async (ctx, args): Promise<{ awbNumber: string, shiprocketOrderId: string }> => {
    const { order, orderItems, boutique } = await ctx.runQuery(internal.lib.shiprocket.getOrderDetails, { orderId: args.orderId });
    const token = await ctx.runAction(internal.lib.shiprocket.getValidTokenAction);

    // 1. Create Order in Shiprocket
    try {
      const orderPayload = {
      order_id: order.orderNumber,
      order_date: new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location: "Primary", // Usually configured in Shiprocket dashboard
      // TODO: Verify "Primary" pickup location is configured 
      // in Shiprocket dashboard before launch.
      billing_customer_name: order.snapshot.deliveryAddress.name,
      billing_last_name: "",
      billing_address: order.snapshot.deliveryAddress.line1,
      billing_address_2: order.snapshot.deliveryAddress.line2 || "",
      billing_city: order.snapshot.deliveryAddress.city,
      billing_pincode: order.snapshot.deliveryAddress.pincode,
      billing_state: order.snapshot.deliveryAddress.state,
      billing_country: "India",
      billing_email: "customer@example.com", // Fallback if no email
      billing_phone: order.snapshot.deliveryAddress.phone,
      shipping_is_billing: true,
      order_items: orderItems.map((item: any) => ({
        name: item.snapshot.productName,
        sku: item.snapshot.sku,
        units: item.snapshot.quantity,
        selling_price: item.snapshot.priceAtPurchase,
      })),
      payment_method: order.paymentMethod.toUpperCase() === "COD" ? "COD" : "Prepaid",
      sub_total: order.pricing.total,
      length: 30, // Static defaults as per integration plan
      breadth: 25,
      height: 5,
      weight: 0.5,
    };

    const createRes = await fetchShiprocketAPI(ctx, `${SHIPROCKET_BASE_URL}/orders/create/ad-hoc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Shiprocket order: ${await createRes.text()}`);
    }
    
    const createData = await createRes.json();
    const shiprocketOrderId = createData.order_id?.toString() || createData.payload?.order_id?.toString();
    const shipmentIdSR = createData.shipment_id?.toString() || createData.payload?.shipment_id?.toString();

    if (!shiprocketOrderId || !shipmentIdSR) {
      throw new Error(`Invalid response from Shiprocket create: ${JSON.stringify(createData)}`);
    }

    // 2. Generate AWB
    const awbRes = await fetchShiprocketAPI(ctx, `${SHIPROCKET_BASE_URL}/courier/generate/awb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: shipmentIdSR, courier_id: "" }), // Auto-assign courier
    });

    if (!awbRes.ok) {
      throw new Error(`Failed to generate AWB: ${await awbRes.text()}`);
    }

    const awbData = await awbRes.json();
    const awbNumber = awbData.response?.data?.awb_code;

    if (!awbNumber) {
      throw new Error(`Invalid AWB response: ${JSON.stringify(awbData)}`);
    }

    // 3. Request Pickup
    const pickupRes = await fetchShiprocketAPI(ctx, `${SHIPROCKET_BASE_URL}/courier/generate/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: [shipmentIdSR] }), 
    });

    if (!pickupRes.ok) {
      console.error(`Failed to request pickup automatically (can be retried later): ${await pickupRes.text()}`);
    }

    // 4. Update Database
    await ctx.runMutation(internal.lib.shiprocket.updateShipmentAfterBooking, {
      shipmentId: args.shipmentId,
      shiprocketOrderId: shiprocketOrderId,
      awbNumber: awbNumber,
    });

    return { awbNumber, shiprocketOrderId };
    } catch (err: any) {
      console.error("[dispatchOrder] Failed to dispatch order to Shiprocket:", err);
      await ctx.runMutation(internal.lib.shiprocket.markShipmentBookingFailed, {
        shipmentId: args.shipmentId,
        error: err.message || String(err),
      });
      throw err;
    }
  }
});

export const markShipmentBookingFailed = internalMutation({
  args: { shipmentId: v.id("shipments"), error: v.string() },
  handler: async (ctx, args) => {
    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) return;

    const newRetryCount = (shipment.retryCount || 0) + 1;
    await ctx.db.patch(args.shipmentId, {
      status: "booking_failed",
      exceptionType: "other",
      retryCount: newRetryCount,
    });
    
    // Notify Ops Team
    if (shipment) {
      const order = await ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("shipmentId"), args.shipmentId))
        .first();
        
      if (order) {
        const boutique = await ctx.db.get(order.boutiqueId);
        const customer = await ctx.db.get(order.customerId);

        // Find superadmin to alert (or use a dedicated ops group)
        const superadmin = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .first();
          
        if (superadmin) {
          const payload = {
            orderNumber: order.orderNumber,
            orderId: order._id,
            boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
            customerName: customer?.email || "Customer",
            error: args.error,
            adminLink: `${process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.hive.com"}/admin/orders?orderId=${order._id}`
          };

          const templateName = newRetryCount > 3 ? "booking_failed_escalated" : "booking_failed_ops_alert";
          const finalPayload = {
            ...payload,
            retryCount: newRetryCount,
            isEscalated: newRetryCount > 3
          };

          // Send in-app, email, and slack alert
          await triggerNotification(ctx, superadmin._id, "in_app", templateName, "order", order._id, JSON.stringify(finalPayload));
          await triggerNotification(ctx, superadmin._id, "email", templateName, "order", order._id, JSON.stringify(finalPayload));
          await triggerNotification(ctx, superadmin._id, "slack", templateName, "order", order._id, JSON.stringify(finalPayload));
        }
      }
    }
  },
});

export const cancelShipment = action({
  args: { awbNumbers: v.array(v.string()) },
  handler: async (ctx, args): Promise<any> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const cancelRes = await fetchShiprocketAPI(ctx, `${SHIPROCKET_BASE_URL}/orders/cancel/awb`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ awbs: args.awbNumbers }),
        });

        if (!cancelRes.ok) {
          throw new Error(`Shiprocket API error: ${await cancelRes.text()}`);
        }
        
        return await cancelRes.json();
      } catch (err: any) {
        lastError = err;
        console.warn(`[Shiprocket] Cancellation attempt ${attempt} failed:`, err.message);
        if (attempt < MAX_RETRIES) {
          // Delay before retrying (since AWB generation isn't always instant in Shiprocket)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    throw new Error(`Failed to cancel shipment after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }
});

export const checkServiceability = action({
  args: {
    pickup_postcode: v.string(),
    delivery_postcode: v.string(),
    weight: v.number(),
    cod: v.number(),
    is_new_hyperlocal: v.optional(v.boolean()),
    lat_from: v.optional(v.number()),
    long_from: v.optional(v.number()),
    lat_to: v.optional(v.number()),
    long_to: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ customerPaidFee: number; estimatedDeliveryDate: string; courierName: string; quotedAt: number; serviced: boolean; reason?: string }> => {
    try {
      let url = `${SHIPROCKET_BASE_URL}/courier/serviceability/?pickup_postcode=${args.pickup_postcode}&delivery_postcode=${args.delivery_postcode}&weight=${args.weight}&cod=${args.cod}`;
      
      const isHyperlocal =
        args.is_new_hyperlocal &&
        args.lat_from != null &&
        args.long_from != null &&
        args.lat_to != null &&
        args.long_to != null;

      if (isHyperlocal) {
        url += `&is_new_hyperlocal=1&lat_from=${args.lat_from}&long_from=${args.long_from}&lat_to=${args.lat_to}&long_to=${args.long_to}`;
        console.log(`[Shiprocket] Hyperlocal serviceability query: (${args.lat_from},${args.long_from}) → (${args.lat_to},${args.long_to})`);
      }

      const res = await fetchShiprocketAPI(ctx, url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        console.error(`Shiprocket serviceability error: ${await res.text()}`);
        return { serviced: false, reason: "Shiprocket API Error", customerPaidFee: 0, estimatedDeliveryDate: "", courierName: "", quotedAt: Date.now() };
      }

      const data = await res.json();
      console.log("[Shiprocket serviceability response data]:", JSON.stringify(data, null, 2));
      
      if (isHyperlocal) {
        if (data.status === true && Array.isArray(data.data) && data.data.length > 0) {
          // Sort or filter if multiple are returned; usually Shiprocket Quick returns one or more local partners
          const couriers = data.data;
          const bikeCouriers = couriers.filter(
            (c: any) => (c.etd || c.etd_hours) && (c.rates != null || c.rate != null)
          );
          if (!bikeCouriers.length) {
            console.warn("[Shiprocket] Hyperlocal query returned no valid couriers.");
            return { serviced: false, reason: "unserviceable", customerPaidFee: 0, estimatedDeliveryDate: "", courierName: "", quotedAt: Date.now() };
          }
          // Sort by rate (rates field is used in hyperlocal)
          bikeCouriers.sort((a: any, b: any) => (a.rates ?? a.rate) - (b.rates ?? b.rate));
          const selectedCourier = bikeCouriers[0];
          const rateRupees = selectedCourier.rates ?? selectedCourier.rate;
          
          console.log(
            `[Shiprocket] Selected hyperlocal courier: ${selectedCourier.courier_name} @ ₹${rateRupees}`
          );

          return {
            serviced: true,
            customerPaidFee: Math.round(rateRupees * 100), // convert to paise
            estimatedDeliveryDate: selectedCourier.etd || `${selectedCourier.etd_hours || 1} hours`,
            courierName: selectedCourier.courier_name || "Shiprocket Quick",
            quotedAt: Date.now(),
          };
        } else {
          return { serviced: false, reason: "unserviceable", customerPaidFee: 0, estimatedDeliveryDate: "", courierName: "", quotedAt: Date.now() };
        }
      } else {
        if (data.status === 200 && data.data && data.data.available_courier_companies && data.data.available_courier_companies.length > 0) {
          const couriers = data.data.available_courier_companies;
          const selectedCourier = couriers.find((c: any) => c.is_recommended === 1) ?? couriers[0];
          return {
            serviced: true,
            customerPaidFee: Math.round(selectedCourier.rate * 100), // convert to paise
            estimatedDeliveryDate: selectedCourier.etd || "",
            courierName: selectedCourier.courier_name || "Standard Courier",
            quotedAt: Date.now(),
          };
        } else {
          return { serviced: false, reason: "unserviceable", customerPaidFee: 0, estimatedDeliveryDate: "", courierName: "", quotedAt: Date.now() };
        }
      }
    } catch (err: any) {
      console.error("checkServiceability exception:", err);
      return { serviced: false, reason: "error", customerPaidFee: 0, estimatedDeliveryDate: "", courierName: "", quotedAt: Date.now() };
    }
  }
});

export const getStuckShipments = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeDaysAgo = now - 72 * 3600 * 1000;
    const fiveDaysAgo = now - 5 * 24 * 3600 * 1000;
    
    const allShipments = await ctx.db.query("shipments").collect();
    const stuck = allShipments.filter(s => 
      (s.status === "in_transit" || s.status === "out_for_delivery") &&
      s.updatedAt < threeDaysAgo
    );
    
    return stuck.map(s => ({
      _id: s._id,
      awbNumber: s.awbNumber,
      updatedAt: s.updatedAt,
      isOverFiveDays: s.updatedAt < fiveDaysAgo
    }));
  }
});

export const reconcileStuckShipments = action({
  args: {},
  handler: async (ctx) => {
    const stuckShipments = await ctx.runQuery(internal.lib.shiprocket.getStuckShipments);
    if (stuckShipments.length === 0) return;
    
    for (const shipment of stuckShipments) {
      if (shipment.isOverFiveDays) {
        console.warn(`[Reconciliation] Shipment ${shipment.awbNumber} has been stuck for over 5 days.`);
      }
      
      try {
        const url = `${SHIPROCKET_BASE_URL}/courier/track/awb/${shipment.awbNumber}`;
        const res = await fetchShiprocketAPI(ctx, url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) {
          console.error(`[Reconciliation] Failed to track AWB ${shipment.awbNumber}: ${await res.text()}`);
          continue;
        }
        
        const data = await res.json();
        const trackingData = data.tracking_data;
        if (trackingData && trackingData.shipment_status !== 0) {
          const rawStatus = trackingData.shipment_status === 7 ? "delivered" 
            : trackingData.shipment_track?.[0]?.current_status;
            
          if (rawStatus && rawStatus.toLowerCase().includes("delivered")) {
            await ctx.runMutation(internal.adminLogistics.processLogisticsStatusUpdateInternal, {
              awbNumber: shipment.awbNumber,
              status: "delivered",
            });
          }
        }
      } catch (err: any) {
        console.error(`[Reconciliation] Error tracking AWB ${shipment.awbNumber}:`, err);
      }
    }
  }
});
