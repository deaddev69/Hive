import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { extractPartnerInfo, resolvePorterSyncView } from "./porterSync";
import {
  resolveBookingDecision,
  porterRequestId,
  type PorterBookingResult,
} from "./porterBooking";

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
    // Free text the customer typed about reaching their door ("gate code 4B",
    // "call on arrival"). Shown to the rider alongside the address.
    deliveryInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PorterBookingResult> => {
    if (!process.env.PORTER_API_URL || !process.env.PORTER_API_KEY) {
      throw new Error("Missing PORTER_API_URL or PORTER_API_KEY environment variable.");
    }

    // Refuse to book a rider this shipment already has.
    //
    // Every dispatch path reuses the shipment row, so a retry, a double-click
    // or a second scheduler run all arrive here with a shipment that may
    // already carry a CRN. Booking again dispatches a second real rider, bills
    // the trip twice, and overwrites the first CRN so nobody can even find the
    // original. Returning the existing booking makes the call idempotent, and
    // the caller sees success because the shipment genuinely is booked.
    const existing: {
      awbNumber: string;
      status: string;
      trackingUrl: string | null;
    } | null = await ctx.runQuery(
      internal.adminLogistics.getShipmentBookingStateInternal,
      { shipmentId: args.shipmentId }
    );
    if (!existing) {
      throw new Error(`Shipment ${args.shipmentId} not found — refusing to book.`);
    }

    const decision = resolveBookingDecision(existing);
    if (decision.action === "skip") {
      console.warn(
        `[PORTER] Booking skipped for ${args.orderNumber}: ${decision.reason}, CRN ${decision.crn}.`
      );
      return {
        crn: decision.crn,
        trackingUrl: existing.trackingUrl ?? undefined,
        estimatedPickupTime: undefined,
        alreadyBooked: true,
      };
    }

    // Only a dead CRN gets folded into the request id, so a genuine re-book
    // after a failure is a new request rather than a lookup of the old one.
    const requestId = await porterRequestId(args.shipmentId, decision.deadCrn);

    const payload = {
      request_id: requestId,
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
          },
          ...(args.deliveryInstructions?.trim()
            ? [{ type: "text", description: args.deliveryInstructions.trim() }]
            : []),
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
    
    const crn = data.order_id || "";
    const rawTrackingUrl = data.tracking_url || "";
    const trackingUrl = (rawTrackingUrl && rawTrackingUrl !== "http://test.com") ? rawTrackingUrl : undefined;

    // Save the CRN and tracking URL immediately to avoid async data loss
    await ctx.runMutation(internal.adminLogistics.updateShipmentDetails, {
      shipmentId: args.shipmentId,
      awbNumber: crn,
      providerBookingId: crn,
      trackingUrl: trackingUrl,
      status: "booking_requested",
    });

    return {
      crn: crn,
      trackingUrl: trackingUrl,
      estimatedPickupTime: data.estimated_pickup_time,
      alreadyBooked: false,
    };
  },
});

export async function fetchOrderFromPorter(crn: string) {
  if (!process.env.PORTER_API_URL || !process.env.PORTER_API_KEY) {
    throw new Error("Missing PORTER_API_URL or PORTER_API_KEY environment variable.");
  }

  const res = await fetch(`${process.env.PORTER_API_URL}/v1/orders/${crn}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.PORTER_API_KEY,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Porter getOrder failed: ${res.status} - ${errText}`);
  }

  return await res.json();
}

export const getOrder = internalAction({
  args: {
    crn: v.string(),
  },
  handler: async (ctx, args) => {
    return await fetchOrderFromPorter(args.crn);
  },
});

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

export const syncOrderDetails = internalAction({
  args: {
    crn: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await fetchOrderFromPorter(args.crn);

    // The Track Order API returns the rider under `partner_info`, not the
    // `driver_details` the webhooks use. Reading only the latter meant a
    // response carrying the rider's name, number and plate yielded nothing.
    const partner = extractPartnerInfo(data);
    const view = resolvePorterSyncView(data);

    const result: any = { rawOrder: data, view };
    if (partner?.name) result.name = partner.name;
    if (partner?.phone) result.phone = partner.phone;
    if (partner?.vehiclePlate) result.vehiclePlate = partner.vehiclePlate;
    if (data.tracking_url && data.tracking_url !== "http://test.com") result.trackingUrl = data.tracking_url;
    if (data.live_tracking_url) result.liveTrackingUrl = data.live_tracking_url;
    if (data.estimated_pickup_time !== undefined) result.etaMinutes = data.estimated_pickup_time;

    return result;
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
