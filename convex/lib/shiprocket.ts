import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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

    const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

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
    const orderPayload = {
      order_id: order.orderNumber,
      order_date: new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location: "Primary", // Usually configured in Shiprocket dashboard
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

    const createRes = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/ad-hoc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    const awbRes = await fetch(`${SHIPROCKET_BASE_URL}/courier/generate/awb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    const pickupRes = await fetch(`${SHIPROCKET_BASE_URL}/courier/generate/pickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
  }
});

export const cancelShipment = action({
  args: { awbNumbers: v.array(v.string()) },
  handler: async (ctx, args): Promise<any> => {
    const token = await ctx.runAction(internal.lib.shiprocket.getValidTokenAction);
    
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const cancelRes = await fetch(`${SHIPROCKET_BASE_URL}/orders/cancel/awb`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
