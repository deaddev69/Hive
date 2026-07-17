import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface AddressLatLng {
  lat: number;
  lng: number;
}

export interface ContactDetails {
  country_code: string; // e.g. "+91"
  number: string;
}

export interface CustomerDetails {
  name: string;
  mobile: ContactDetails;
}

export interface FareEstimateRequest {
  pickup_details: AddressLatLng;
  drop_details: AddressLatLng;
  customer: CustomerDetails;
}

export interface AddressDetails {
  apartment_address?: string;
  street_address1: string;
  street_address2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  lat: number;
  lng: number;
  contact_details: {
    name: string;
    phone_number: string; // Should include +91
  };
}

// ─── INTERNAL ACTIONS ────────────────────────────────────────────────────────


export const getQuote = internalAction({
  args: {
    pickup_lat: v.number(),
    pickup_lng: v.number(),
    drop_lat: v.number(),
    drop_lng: v.number(),
    customer_name: v.string(),
    customer_phone: v.string(), // Assume standard 10 digit or handles splitting internally
  },
  handler: async (ctx, args) => {
    if (!process.env.PORTER_API_URL || !process.env.PORTER_API_KEY) {
      throw new Error("Missing PORTER_API_URL or PORTER_API_KEY environment variable.");
    }

    // Strip any +91 from phone number if present for the payload
    let phoneStr = args.customer_phone.replace(/\D/g, "");
    if (phoneStr.length > 10 && phoneStr.startsWith("91")) {
      phoneStr = phoneStr.slice(2);
    }

    const payload: FareEstimateRequest = {
      pickup_details: { lat: args.pickup_lat, lng: args.pickup_lng },
      drop_details: { lat: args.drop_lat, lng: args.drop_lng },
      customer: {
        name: args.customer_name,
        mobile: {
          country_code: "+91",
          number: phoneStr,
        },
      },
    };

    const res = await fetch(`${process.env.PORTER_API_URL}/v1/get_quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.PORTER_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Porter getQuote failed: ${res.status} - ${errText}`);
    }

    return await res.json();
  },
});

export const createOrder = internalAction({
  args: {
    orderId: v.id("orders"),
    shipmentId: v.id("shipments"),
    pickupAddress: v.any(), // AddressDetails mapped
    dropAddress: v.any(), // AddressDetails mapped
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.PORTER_API_URL || !process.env.PORTER_API_KEY) {
      throw new Error("Missing PORTER_API_URL or PORTER_API_KEY environment variable.");
    }

    // We use the shipment ID as the requestId. Porter requires uuid max 32 chars.
    const cryptoId = crypto.randomUUID().replace(/-/g, "");

    const payload = {
      request_id: cryptoId,
      pickup_details: {
        address: args.pickupAddress,
      },
      drop_details: {
        address: args.dropAddress,
      },
      delivery_instructions: {
        instructions_list: [
          {
            type: "text",
            description: `Handle with care. Order: ${args.orderNumber}`,
          }
        ]
      }
    };

    const res = await fetch(`${process.env.PORTER_API_URL}/v1/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.PORTER_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Porter createOrder failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    
    // Save the CRN and tracking URL immediately to avoid async data loss
    await ctx.runMutation(internal.adminLogistics.updateShipmentDetails, {
      shipmentId: args.shipmentId,
      awbNumber: data.order_id,
      trackingUrl: data.tracking_url,
      status: "booking_requested",
    });

    return {
      crn: data.order_id,
      trackingUrl: data.tracking_url,
      estimatedPickupTime: data.estimated_pickup_time,
    };
  },
});

export const cancelOrder = internalAction({
  args: {
    crn: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.PORTER_API_URL || !process.env.PORTER_API_KEY) {
      throw new Error("Missing PORTER_API_URL or PORTER_API_KEY environment variable.");
    }

    const res = await fetch(`${process.env.PORTER_API_URL}/v1/orders/${args.crn}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.PORTER_API_KEY,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Porter cancelOrder failed: ${res.status} - ${errText}`);
    }

    return await res.json();
  },
});

export const simulateUATFlow = internalAction({
  args: {
    crn: v.string(),
    flowType: v.number(), // 0 for happy flow, 2 for rider cancel, etc.
  },
  handler: async (ctx, args) => {
    if (!process.env.PORTER_API_URL || !process.env.PORTER_API_KEY) {
      throw new Error("Missing PORTER_API_URL or PORTER_API_KEY environment variable.");
    }

    const payload = {
      order_id: args.crn,
      flow_type: args.flowType,
    };

    const res = await fetch(`${process.env.PORTER_API_URL}/v1/simulation/initiate_order_flow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.PORTER_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Porter simulator failed: ${res.status} - ${errText}`);
    }

    return await res.json();
  },
});
