// convex/adminLogistics.ts
import { query, mutation, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { logSystemAlert } from "./lib/alerts";
import { assertHyperlocalTransitionPrerequisites } from "./orders";
import { markOrderFinanciallyDelivered } from "./adminFinance";
import { triggerNotification } from "./lib/notifications";

// Provider configuration registry
export const LOGISTICS_PROVIDERS = {
  shiprocket: {
    name: "Shiprocket Same-Day",
    trackingUrl: (awb: string) => `https://shiprocket.co/track/${awb}`,
  },
  manual: {
    name: "Manual Delivery (Boutique Self)",
    trackingUrl: (awb: string) => `https://tracking.hive.com/${awb}`,
  },
};

/**
 * Calculates the SLA status for a shipment.
 * Courier Pickup SLA:
 * - Start: readyForPickupAt (or order.readyForPickupAt / when shipment is created)
 * - End: pickedUpAt / order.pickedUpAt
 * - At Risk: > 45 minutes
 * - Breached: > 90 minutes
 *
 * Courier Delivery SLA:
 * - Start: pickedUpAt (or order.pickedUpAt / when shipment picked up)
 * - End: deliveredAt / order.deliveredAt
 * - At Risk: > 4 hours
 * - Breached: > 8 hours
 */
export function calculateShipmentSlaStatus(
  shipment: any,
  order: any
): "on_track" | "at_risk" | "breached" {
  const readyTime = order?.readyForPickupAt || shipment.createdAt;
  const pickedTime = order?.pickedUpAt || shipment.pickedUpAt;
  const deliveredTime = order?.deliveredAt || shipment.deliveredAt;

  // 1. If delivered, measure total delivery duration since pickedTime
  if (deliveredTime && pickedTime) {
    const deliveryDuration = deliveredTime - pickedTime;
    if (deliveryDuration > 8 * 3600 * 1000) return "breached";
    if (deliveryDuration > 4 * 3600 * 1000) return "at_risk";
  }

  // 2. If active delivery (picked up but not delivered)
  if (pickedTime && !deliveredTime) {
    const elapsedSincePickup = Date.now() - pickedTime;
    if (elapsedSincePickup > 8 * 3600 * 1000) return "breached";
    if (elapsedSincePickup > 4 * 3600 * 1000) return "at_risk";
  }

  // 3. If ready but not picked up (active pickup queue)
  if (readyTime && !pickedTime) {
    const elapsedSinceReady = Date.now() - readyTime;
    if (elapsedSinceReady > 90 * 60 * 1000) return "breached";
    if (elapsedSinceReady > 45 * 60 * 1000) return "at_risk";
  }

  // 4. If picked up, check if the pickup process itself breached
  if (pickedTime && readyTime) {
    const pickupDuration = pickedTime - readyTime;
    if (pickupDuration > 90 * 60 * 1000) return "breached";
    if (pickupDuration > 45 * 60 * 1000) return "at_risk";
  }

  return "on_track";
}

/**
 * Auto-attribute delay responsibility based on exceptions
 */
export function resolveDelayResponsibility(
  exceptionType?: string
): "boutique" | "courier" | "customer" | "system" | undefined {
  if (!exceptionType) return undefined;
  if (["customer_unreachable", "address_issue", "door_locked", "payment_issue"].includes(exceptionType)) {
    return "customer";
  }
  if (["courier_damage", "lost_package"].includes(exceptionType)) {
    return "courier";
  }
  return "system";
}

// Strict shipment state transition machine
const VALID_SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  created: ["pickup_scheduled", "booking_requested", "driver_assigned"],
  booking_requested: ["driver_assigned", "booking_failed", "cancelled"],
  booking_failed: ["booking_requested", "cancelled"],
  driver_assigned: ["driver_arrived", "picked_up", "in_transit", "cancelled", "pickup_scheduled"],
  driver_arrived: ["picked_up", "in_transit", "cancelled"],
  pickup_scheduled: ["driver_assigned", "driver_arrived", "picked_up", "in_transit", "cancelled"],
  picked_up: ["in_transit", "failed", "delivered"],
  in_transit: ["out_for_delivery", "delivered", "failed", "rto_initiated"],
  out_for_delivery: ["delivered", "failed"],
  failed: ["out_for_delivery", "rto_initiated", "in_transit"],
  rto_initiated: ["rto_in_transit"],
  rto_in_transit: ["rto_delivered"],
  rto_delivered: ["returned"],
  delivered: [],
  returned: [],
  cancelled: [],
  lost: [], // Terminal administrative state
};

/**
 * Get all shipments in the database along with details and dashboard metrics.
 */
export const getLogisticsQueueAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const now = Date.now();

    const shipments = await ctx.db.query("shipments").collect();
    const results: any[] = [];

    // KPI Metrics counters
    let readyToShip = 0;
    let inTransit = 0;
    let exceptions = 0;
    let rtoQueue = 0;
    let lostShipments = 0;

    // Same-Day Success Rate counters
    let totalDeliveredCount = 0;
    let deliveredWithin8hCount = 0;

    for (const s of shipments) {
      const order = await ctx.db.get(s.orderId);
      const boutique = order ? await ctx.db.get(order.boutiqueId) : null;
      const customer = order ? await ctx.db.get(order.customerId) : null;

      // Calculate dynamic SLA status
      const computedSla = order ? calculateShipmentSlaStatus(s, order) : (s.slaStatus || "on_track");

      // Count delivered success rates
      if (s.status === "delivered") {
        totalDeliveredCount++;
        if (order && order.orderAcceptedAt && order.deliveredAt) {
          const duration = order.deliveredAt - order.orderAcceptedAt;
          if (duration <= 8 * 3600 * 1000) {
            deliveredWithin8hCount++;
          }
        }
      }

      // Aggregate metrics based on status
      if (s.status === "created" || s.status === "pickup_scheduled") {
        readyToShip++;
      } else if (
        s.status === "picked_up" ||
        s.status === "in_transit" ||
        s.status === "out_for_delivery"
      ) {
        inTransit++;
      } else if (s.status === "failed") {
        exceptions++;
      } else if (
        s.status === "rto_initiated" ||
        s.status === "rto_in_transit" ||
        s.status === "rto_delivered"
      ) {
        rtoQueue++;
      } else if (s.status === "lost") {
        lostShipments++;
      }

      results.push({
        ...s,
        slaStatus: computedSla,
        orderNumber: order?.orderNumber,
        orderTotal: order?.total,
        boutiqueName: boutique?.boutiqueName,
        customerName: customer?.email || "Unknown Customer",
        isVirtual: false,
      });
    }

    // Now pull all orders that do NOT have shipments yet but require merchant/admin action
    const activeOrdersWithoutShipments = await ctx.db
      .query("orders")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending_confirmation"),
          q.eq(q.field("status"), "confirmed"),
          q.eq(q.field("status"), "packed")
        )
      )
      .collect();

    for (const o of activeOrdersWithoutShipments) {
      if (o.shipmentId) continue; // safety check
      const boutique = await ctx.db.get(o.boutiqueId);
      const customer = await ctx.db.get(o.customerId);

      // AWAITING ACCEPTANCE or READY FOR PICKUP virtual SLA
      let virtualSla: "on_track" | "at_risk" | "breached" = "on_track";
      if (o.status === "pending_confirmation") {
        const elapsed = now - o.createdAt;
        if (elapsed > 30 * 60 * 1000) virtualSla = "breached";
        else if (elapsed > 15 * 60 * 1000) virtualSla = "at_risk";
      } else if (o.status === "confirmed" || o.status === "packed") {
        const readyTime = o.orderAcceptedAt || o.confirmedAt || o.createdAt;
        const elapsed = now - readyTime;
        if (elapsed > 90 * 60 * 1000) virtualSla = "breached";
        else if (elapsed > 45 * 60 * 1000) virtualSla = "at_risk";
      }

      // Add virtual card count to metrics if appropriate
      if (o.status === "confirmed" || o.status === "packed") {
        readyToShip++;
      }

      results.push({
        _id: `virtual_${o._id}`,
        orderId: o._id,
        provider: "manual",
        awbNumber: "PENDING",
        status: o.status,
        pickupAddress: { name: "", line1: "", city: "", state: "", pincode: "", phone: "" },
        deliveryAddress: { name: "", line1: "", city: "", state: "", pincode: "", phone: "" },
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        slaStatus: virtualSla,
        orderNumber: o.orderNumber,
        orderTotal: o.total,
        boutiqueName: boutique?.boutiqueName,
        customerName: customer?.email || "Unknown Customer",
        isVirtual: true,
      });
    }

    // Sort by creation time descending
    results.sort((a, b) => b.createdAt - a.createdAt);

    // Compute Same-Day Success Rate KPI
    const sameDaySuccessRate =
      totalDeliveredCount > 0 ? (deliveredWithin8hCount / totalDeliveredCount) * 100 : 100;

    let sameDaySuccessRating: "excellent" | "healthy" | "needs_attention" = "excellent";
    if (sameDaySuccessRate < 90) {
      sameDaySuccessRating = "needs_attention";
    } else if (sameDaySuccessRate < 95) {
      sameDaySuccessRating = "healthy";
    }

    return {
      shipments: results,
      metrics: {
        readyToShip,
        inTransit,
        exceptions,
        rtoQueue,
        lostShipments,
        sameDaySuccessRate: Math.round(sameDaySuccessRate * 10) / 10,
        sameDaySuccessRating,
        totalDelivered: totalDeliveredCount,
        deliveredWithin8h: deliveredWithin8hCount,
      },
    };
  },
});

/**
 * Get shipment details by its ID, with order, items, and customer information.
 */
export const getShipmentByIdAdmin = query({
  args: { shipmentId: v.id("shipments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) throw new Error("Shipment not found");

    const order = await ctx.db.get(shipment.orderId);
    if (!order) throw new Error("Order not found");

    const boutique = await ctx.db.get(order.boutiqueId);
    const customer = await ctx.db.get(order.customerId);

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect();

    return {
      shipment,
      order,
      boutique,
      customer,
      items,
    };
  },
});

/**
 * Create a new shipment booking for an order.
 */
export const createShipmentAdmin = mutation({
  args: {
    orderId: v.id("orders"),
    provider: v.string(), // "shiprocket" | "manual"
    awbNumber: v.string(),
    estimatedDeliveryDays: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    if (order.shipmentId) {
      throw new Error("Order already has an associated shipment");
    }

    // Validate provider
    if (!["shiprocket", "manual"].includes(args.provider)) {
      throw new Error(`Invalid provider: ${args.provider}. Supported: shiprocket, manual`);
    }

    const providerConfig = LOGISTICS_PROVIDERS[args.provider as keyof typeof LOGISTICS_PROVIDERS];
    const trackingUrl = providerConfig.trackingUrl(args.awbNumber);

    // Resolve Boutique pickup details
    const orderPickup = order.pickupAddress;
    const boutique = orderPickup ? null : await ctx.db.get(order.boutiqueId);
    const pickupAddress = {
      name: orderPickup?.boutiqueName || boutique?.boutiqueName || "Boutique Pickup Center",
      line1: orderPickup?.address || boutique?.address || "Address snapshot pending",
      city: orderPickup?.city || boutique?.addressDetails?.city || "Unknown City",
      state: orderPickup?.state || boutique?.addressDetails?.state || "Unknown State",
      pincode: orderPickup?.pincode || boutique?.addressDetails?.pincode || "000000",
      phone: orderPickup?.phone || boutique?.phone || "9876543210",
    };

    // Resolve Customer delivery details
    const customer = await ctx.db.get(order.customerId);
    const deliveryAddress = {
      name: order.deliveryAddress.label || "Customer Delivery",
      line1: order.deliveryAddress.line1 || order.deliveryAddress.formattedAddress || "No Address Line 1",
      line2: order.deliveryAddress.line2,
      city: order.deliveryAddress.city,
      state: order.deliveryAddress.state,
      pincode: order.deliveryAddress.pincode,
      phone: customer?.phone || "9999999999",
    };

    const shipmentId = await ctx.db.insert("shipments", {
      orderId: args.orderId,
      provider: args.provider,
      awbNumber: args.awbNumber,
      status: "pickup_scheduled",
      idempotencyKey: `ship_init_${args.orderId}`,
      trackingUrl,
      pickupAddress,
      deliveryAddress,
      estimatedDelivery: now + args.estimatedDeliveryDays * 24 * 3600 * 1000,
      slaStatus: "on_track",
      rawWebhookEvents: [
        {
          timestamp: now,
          status: "pickup_scheduled",
          location: "System",
          remarks: `Fulfillment booked via ${providerConfig.name} and pickup scheduled.`,
          rawPayload: JSON.stringify({ event: "created", provider: args.provider }),
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Link shipment back to order & record readyForPickupAt
    const orderPatch: Record<string, any> = {
      shipmentId,
      status: "pickup_scheduled",
      pickupScheduledAt: now,
      updatedAt: now,
    };
    if (!order.readyForPickupAt) {
      orderPatch.readyForPickupAt = now;
    }
    await ctx.db.patch(args.orderId, orderPatch);

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "shipments.create",
      entityType: "shipments",
      entityId: shipmentId,
      metadata: JSON.stringify({ orderId: args.orderId, awbNumber: args.awbNumber, provider: args.provider }),
      createdAt: now,
    });

    return shipmentId;
  },
});

/**
 * Simulate receiving a webhook ping from the logistics provider.
 * Enforces strict transitions matching VALID_SHIPMENT_TRANSITIONS.
 */
export const simulateLogisticsWebhookAdmin = mutation({
  args: {
    awbNumber: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("pickup_scheduled"),
      v.literal("picked_up"),
      v.literal("in_transit"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("returned"),
      v.literal("rto_initiated"),
      v.literal("rto_in_transit"),
      v.literal("rto_delivered"),
      v.literal("cancelled")
    ),
    exceptionType: v.optional(
      v.union(
        v.literal("customer_unreachable"),
        v.literal("address_issue"),
        v.literal("door_locked"),
        v.literal("payment_issue"),
        v.literal("courier_damage"),
        v.literal("lost_package"),
        v.literal("other")
      )
    ),
    remarks: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Simulator disabled");
    }
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const shipment = await ctx.db
      .query("shipments")
      .withIndex("by_awbNumber", (q) => q.eq("awbNumber", args.awbNumber))
      .first();

    if (!shipment) throw new Error(`Shipment with AWB ${args.awbNumber} not found.`);

    // State machine check
    const fromStatus = shipment.status;
    const validTransitions = VALID_SHIPMENT_TRANSITIONS[fromStatus];
    if (!validTransitions || !validTransitions.includes(args.status)) {
      await logSystemAlert(ctx, "shipment.transition_failed", `State machine violation: Cannot transition shipment status from '${fromStatus}' to '${args.status}' on AWB ${args.awbNumber}`, "critical", { shipmentId: shipment._id, status: args.status });
      throw new Error(
        `State machine violation: Cannot transition shipment status from '${fromStatus}' to '${args.status}'.`
      );
    }

    const patchData: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "delivered") {
      patchData.deliveredAt = now;
    }
    if (args.status === "picked_up") {
      patchData.pickedUpAt = now;
    }

    // Record exception type if failure is recorded
    if (args.status === "failed") {
      const excType = args.exceptionType || "other";
      patchData.exceptionType = excType;
      patchData.delayResponsibility = resolveDelayResponsibility(excType) || "courier";
    } else {
      patchData.exceptionType = undefined;
    }

    // Sync status to the parent order
    const order = await ctx.db.get(shipment.orderId);
    const orderPatch: any = { updatedAt: now };

    if (order) {
      if (args.status === "pickup_scheduled") {
        orderPatch.status = "pickup_scheduled";
        orderPatch.pickupScheduledAt = now;
        if (!order.readyForPickupAt) {
          orderPatch.readyForPickupAt = now;
        }
      } else if (args.status === "picked_up") {
        orderPatch.status = "picked_up";
        orderPatch.pickedUpAt = now;
      } else if (args.status === "in_transit") {
        orderPatch.status = "in_transit";
        orderPatch.inTransitAt = now;
      } else if (args.status === "out_for_delivery") {
        orderPatch.status = "out_for_delivery";
        orderPatch.outForDeliveryAt = now;
      } else if (args.status === "delivered") {
        orderPatch.status = "delivered";
        orderPatch.deliveredAt = now;
        orderPatch.claimWindowExpiresAt = now + 48 * 3600 * 1000; // 48-hour claim window
      } else if (args.status === "returned" || args.status === "cancelled") {
        orderPatch.status = "cancelled";
        orderPatch.cancelledAt = now;
      }

      await ctx.db.patch(order._id, orderPatch);

      if (args.status === "delivered") {
        await markOrderFinanciallyDelivered(ctx, order._id, now);
      }
    }

    // Calculate and patch SLA status
    const mergedOrderForSla = order ? { ...order, ...orderPatch } : null;
    const mergedShipmentForSla = { ...shipment, ...patchData };
    patchData.slaStatus = mergedOrderForSla ? calculateShipmentSlaStatus(mergedShipmentForSla, mergedOrderForSla) : "on_track";

    const rawWebhookEvents = shipment.rawWebhookEvents ? [...shipment.rawWebhookEvents] : [];
    rawWebhookEvents.push({
      timestamp: now,
      status: args.status,
      location: args.location || "Hub Terminal",
      remarks: args.remarks || `Courier webhook signal: status set to ${args.status}`,
      rawPayload: JSON.stringify(args),
    });
    patchData.rawWebhookEvents = rawWebhookEvents;

    await ctx.db.patch(shipment._id, patchData);

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "shipments.webhook_simulation",
      entityType: "shipments",
      entityId: shipment._id,
      metadata: JSON.stringify({
        awbNumber: args.awbNumber,
        fromStatus,
        toStatus: args.status,
        exceptionType: args.exceptionType,
      }),
      createdAt: now,
    });

    return { success: true, fromStatus, toStatus: args.status };
  },
});

/**
 * Internal mutation to process a status update from a webhook.
 * Does not check admin authentication since it is triggered by an internal action/httpAction.
 */
export const processLogisticsStatusUpdateInternal = internalMutation({
  args: {
    awbNumber: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("booking_requested"),
      v.literal("booking_confirmed"),
      v.literal("driver_assigned"),
      v.literal("driver_arrived"),
      v.literal("booking_failed"),
      v.literal("pickup_scheduled"),
      v.literal("picked_up"),
      v.literal("in_transit"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("returned"),
      v.literal("rto_initiated"),
      v.literal("rto_in_transit"),
      v.literal("rto_delivered"),
      v.literal("cancelled")
    ),
    exceptionType: v.optional(
      v.union(
        v.literal("customer_unreachable"),
        v.literal("address_issue"),
        v.literal("door_locked"),
        v.literal("payment_issue"),
        v.literal("courier_damage"),
        v.literal("lost_package"),
        v.literal("other")
      )
    ),
    remarks: v.optional(v.string()),
    location: v.optional(v.string()),
    driverDetails: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        vehiclePlate: v.optional(v.string()),
        liveTrackingUrl: v.optional(v.string()),
      })
    ),
    scans: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const shipment = await ctx.db
      .query("shipments")
      .withIndex("by_awbNumber", (q) => q.eq("awbNumber", args.awbNumber))
      .first();

    if (!shipment) throw new Error(`Shipment with AWB ${args.awbNumber} not found.`);

    // State machine check
    const fromStatus = shipment.status;
    
    // Idempotency: skip if already in this status
    if (fromStatus === args.status) {
      return { success: true, message: "Idempotent request ignored" };
    }

    const validTransitions = VALID_SHIPMENT_TRANSITIONS[fromStatus];
    if (!validTransitions || !validTransitions.includes(args.status)) {
      await logSystemAlert(ctx, "shipment.transition_failed", `State machine violation: Cannot transition shipment status from '${fromStatus}' to '${args.status}' on AWB ${args.awbNumber}`, "critical", { shipmentId: shipment._id, status: args.status });
      throw new Error(
        `State machine violation: Cannot transition shipment status from '${fromStatus}' to '${args.status}'.`
      );
    }

    const patchData: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.scans && args.scans.length > 0) {
      const existingScans = shipment.scans || [];
      const newScans = [...existingScans];
      
      for (const scan of args.scans) {
        // Deduplicate by timestamp and status
        const isDuplicate = existingScans.some(
          (s: any) => s.date === scan.date && s.status === scan.status
        );
        if (!isDuplicate) {
          newScans.push(scan);
        }
      }
      patchData.scans = newScans;
    }

    if (args.status === "delivered") {
      patchData.deliveredAt = now;
    }
    if (args.status === "picked_up") {
      patchData.pickedUpAt = now;
    }

    if (args.driverDetails) {
      if (args.driverDetails.name) patchData.driverName = args.driverDetails.name;
      if (args.driverDetails.phone) patchData.driverPhone = args.driverDetails.phone;
      if (args.driverDetails.vehiclePlate) patchData.vehiclePlate = args.driverDetails.vehiclePlate;
      if (args.driverDetails.liveTrackingUrl) patchData.liveTrackingUrl = args.driverDetails.liveTrackingUrl;
      patchData.bookingStatus = "booked";
    }

    // Record exception type if failure is recorded
    if (args.status === "failed") {
      const excType = args.exceptionType || "other";
      patchData.exceptionType = excType;
      patchData.delayResponsibility = resolveDelayResponsibility(excType) || "courier";
    } else {
      patchData.exceptionType = undefined;
    }

    // Sync status to the parent order
    const order = await ctx.db.get(shipment.orderId);
    const orderPatch: any = { updatedAt: now };

    if (order) {
      if (args.status === "pickup_scheduled") {
        orderPatch.status = "pickup_scheduled";
        orderPatch.pickupScheduledAt = now;
        if (!order.readyForPickupAt) {
          orderPatch.readyForPickupAt = now;
        }
      } else if (args.status === "driver_assigned") {
        orderPatch.status = "pickup_scheduled";
        orderPatch.pickupScheduledAt = now;
      } else if (args.status === "driver_arrived") {
        orderPatch.status = "pickup_scheduled";
      } else if (args.status === "picked_up") {
        orderPatch.status = "picked_up";
        orderPatch.pickedUpAt = now;
      } else if (args.status === "in_transit") {
        orderPatch.status = "in_transit";
        orderPatch.inTransitAt = now;
      } else if (args.status === "out_for_delivery") {
        orderPatch.status = "out_for_delivery";
        orderPatch.outForDeliveryAt = now;
      } else if (args.status === "delivered") {
        orderPatch.status = "delivered";
        orderPatch.deliveredAt = now;
        orderPatch.claimWindowExpiresAt = now + 72 * 3600 * 1000;
      } else if (args.status === "returned" || args.status === "cancelled") {
        orderPatch.status = "cancelled";
        orderPatch.cancelledAt = now;
      }

      await ctx.db.patch(order._id, orderPatch);

      if (args.status === "delivered") {
        await markOrderFinanciallyDelivered(ctx, order._id, now);
      }
    }

    // Calculate and patch SLA status
    const mergedOrderForSla = order ? { ...order, ...orderPatch } : null;
    const mergedShipmentForSla = { ...shipment, ...patchData };
    patchData.slaStatus = mergedOrderForSla ? calculateShipmentSlaStatus(mergedShipmentForSla, mergedOrderForSla) : "on_track";

    const rawWebhookEvents = shipment.rawWebhookEvents ? [...shipment.rawWebhookEvents] : [];
    rawWebhookEvents.push({
      timestamp: now,
      status: args.status,
      location: args.location || "Hub Terminal",
      remarks: args.remarks || `Courier webhook signal: status set to ${args.status}`,
      rawPayload: JSON.stringify(args),
    });
    patchData.rawWebhookEvents = rawWebhookEvents;
    patchData.lastWebhookAt = now;

    await ctx.db.patch(shipment._id, patchData);

    // Trigger ops Slack alerts for exceptions
    if (args.status === "failed" || args.status === "rto_initiated") {
      const superadmin = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).first();
      if (superadmin && order) {
        await triggerNotification(ctx, superadmin._id, "slack", `shipment_${args.status}`, "order", order._id, JSON.stringify({
          awbNumber: args.awbNumber,
          exceptionType: args.exceptionType || "N/A",
          remarks: args.remarks || "No remarks provided"
        }));
      }
    }

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorRole: "system",
      action: "shipments.webhook_update",
      entityType: "shipments",
      entityId: shipment._id,
      metadata: JSON.stringify({
        awbNumber: args.awbNumber,
        fromStatus,
        toStatus: args.status,
        exceptionType: args.exceptionType,
        driverUpdated: !!args.driverDetails,
      }),
      createdAt: now,
    });

    return { success: true, fromStatus, toStatus: args.status };
  },
});

/**
 * Resolve a courier exception manually from the dashboard.
 */
export const resolveLogisticsExceptionAdmin = mutation({
  args: {
    shipmentId: v.id("shipments"),
    action: v.union(v.literal("reattempt"), v.literal("update_address"), v.literal("force_rto")),
    notes: v.string(),
    delayResponsibility: v.optional(v.union(v.literal("boutique"), v.literal("courier"), v.literal("customer"), v.literal("system"))),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) throw new Error("Shipment not found.");

    let newStatus = shipment.status;
    if (args.action === "force_rto") {
      newStatus = "rto_initiated";
    } else if (args.action === "reattempt" || args.action === "update_address") {
      newStatus = "in_transit";
    }

    // Verify FSM transition
    const validTransitions = VALID_SHIPMENT_TRANSITIONS[shipment.status];
    if (!validTransitions || !validTransitions.includes(newStatus)) {
      throw new Error(
        `State machine violation: Cannot resolve exception from '${shipment.status}' to '${newStatus}'.`
      );
    }

    const rawWebhookEvents = shipment.rawWebhookEvents ? [...shipment.rawWebhookEvents] : [];
    rawWebhookEvents.push({
      timestamp: now,
      status: newStatus,
      location: "Admin Desk",
      remarks: `Exception resolved manually via ${args.action}. Notes: ${args.notes}`,
      rawPayload: JSON.stringify({ action: args.action, notes: args.notes, delayResponsibility: args.delayResponsibility }),
    });

    const patchData: any = {
      status: newStatus,
      exceptionType: undefined, // Clear exception flag
      rawWebhookEvents,
      updatedAt: now,
    };
    if (args.delayResponsibility) {
      patchData.delayResponsibility = args.delayResponsibility;
    }

    await ctx.db.patch(shipment._id, patchData);

    // Update parent order
    const order = await ctx.db.get(shipment.orderId);
    if (order) {
      await ctx.db.patch(order._id, {
        status: "in_transit",
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "shipments.resolve_exception",
      entityType: "shipments",
      entityId: shipment._id,
      metadata: JSON.stringify({ action: args.action, notes: args.notes }),
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Reconcile returned packages. Increments boutique stock counts idempotently.
 */
export const confirmRtoReceiptAdmin = mutation({
  args: {
    shipmentId: v.id("shipments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) throw new Error("Shipment not found.");

    // 1. RTO Idempotency Guard
    if (shipment.inventoryRestored) {
      await logSystemAlert(ctx, "inventory.restore_blocked", `Idempotency Guard: Attempted double stock restoral on Shipment AWB ${shipment.awbNumber}`, "critical", { shipmentId: shipment._id });
      throw new Error("Idempotency Guard: Inventory has already been restored for this RTO package.");
    }

    const order = await ctx.db.get(shipment.orderId);
    if (!order) throw new Error("Order not found.");

    // 2. Increment stock counts
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect();

    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      const currentStock = { ...product.stockBySize };
      const beforeQty = currentStock[item.variantSize] ?? 0;
      const afterQty = beforeQty + item.quantity;
      currentStock[item.variantSize] = afterQty;

      let active = product.active;
      let autoDeactivatedBecauseOutOfStock = product.autoDeactivatedBecauseOutOfStock ?? false;
      if (product.autoDeactivatedBecauseOutOfStock && beforeQty === 0 && afterQty > 0) {
        active = true;
        autoDeactivatedBecauseOutOfStock = false;
      }

      await ctx.db.patch(product._id, {
        stockBySize: currentStock,
        active,
        autoDeactivatedBecauseOutOfStock,
        updatedAt: now,
      });

      await ctx.db.insert("inventoryMovements", {
        productId: product._id,
        boutiqueId: item.boutiqueId,
        size: item.variantSize,
        beforeQty,
        afterQty,
        adjustmentQty: item.quantity,
        reason: "returned_item",
        source: "admin",
        createdBy: admin._id,
        notes: args.notes || `RTO package received at boutique. Stock restored for order ${order.orderNumber}.`,
        createdAt: now,
      });
    }

    // 3. Mark shipment returned and stock restored
    const rawWebhookEvents = shipment.rawWebhookEvents ? [...shipment.rawWebhookEvents] : [];
    rawWebhookEvents.push({
      timestamp: now,
      status: "returned",
      location: "Boutique Warehouse",
      remarks: `RTO confirmation received at boutique. Stock restored. Notes: ${args.notes || "None"}`,
      rawPayload: JSON.stringify({ notes: args.notes }),
    });

    await ctx.db.patch(shipment._id, {
      status: "returned",
      inventoryRestored: true,
      inventoryRestoredAt: now,
      rawWebhookEvents,
      updatedAt: now,
    });

    // 4. Update order to cancelled
    await ctx.db.patch(order._id, {
      status: "cancelled",
      paymentStatus: "refunded",
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "shipments.confirm_rto",
      entityType: "shipments",
      entityId: shipment._id,
      metadata: JSON.stringify({ orderId: order._id, notes: args.notes }),
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark a shipment as officially lost. Triggers customer refund, boutique ledger deduction,
 * and cancels order without restoring stock.
 */
export const markShipmentLostAdmin = mutation({
  args: {
    shipmentId: v.id("shipments"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) throw new Error("Shipment not found.");

    if (shipment.status === "lost") {
      throw new Error("Shipment is already marked as lost.");
    }

    const order = await ctx.db.get(shipment.orderId);
    if (!order) throw new Error("Order not found.");

    // 1. Process customer refund
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .first();

    const refundAmount = payment ? payment.amount : order.total;

    if (payment) {
      await ctx.db.patch(payment._id, {
        status: "refunded",
        refundAmount: refundAmount,
        refundedAt: now,
        updatedAt: now,
      });
    }

    const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    await ctx.db.insert("refundLedger", {
      refundNumber,
      orderId: order._id,
      amount: refundAmount,
      status: "processed",
      refundType: "full_refund",
      razorpayRefundId: "re_lost_" + Math.random().toString(36).slice(2, 11),
      notes: args.notes || `Refund for lost shipment. AWB: ${shipment.awbNumber}`,
      createdAt: now,
    });

    // 2. Process compensating boutique deduction
    const originalAccrual = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", order.boutiqueId))
      .filter((q) => q.and(q.eq(q.field("orderId"), order._id), q.eq(q.field("type"), "accrual")))
      .first();

    const deductionAmount = originalAccrual ? -originalAccrual.amount : -Math.floor(refundAmount * 0.9);

    await ctx.db.insert("settlementLedger", {
      boutiqueId: order.boutiqueId,
      orderId: order._id,
      type: "refund_deduction",
      source: "system",
      amount: deductionAmount,
      status: "available",
      createdAt: now,
      accruedAt: now,
      settledAt: now,
    });

    // 3. Mark shipment status as lost (NO stock restoral)
    const rawWebhookEvents = shipment.rawWebhookEvents ? [...shipment.rawWebhookEvents] : [];
    rawWebhookEvents.push({
      timestamp: now,
      status: "lost",
      location: "Courier Hub Network",
      remarks: `Shipment officially marked LOST. Notes: ${args.notes || "None"}`,
      rawPayload: JSON.stringify({ notes: args.notes }),
    });

    await ctx.db.patch(shipment._id, {
      status: "lost",
      rawWebhookEvents,
      updatedAt: now,
    });

    // 4. Update order to cancelled/refunded and audit flag
    await ctx.db.patch(order._id, {
      status: "cancelled",
      paymentStatus: "refunded",
      refunded_lost_shipment: true,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "shipments.marked_lost",
      entityType: "shipments",
      entityId: shipment._id,
      metadata: JSON.stringify({
        orderId: order._id,
        refundNumber,
        deductionAmount,
        notes: args.notes,
      }),
      createdAt: now,
    });

    return { success: true, refundNumber, deductionAmount };
  },
});

/**
 * Seed helper to backfill interesting shipment states for paid orders.
 */
export const seedLogisticsMockDataAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Debug and simulation tools are disabled in this environment.");
    }
    await requireRole(ctx, "admin");
    const now = Date.now();

    const orders = await ctx.db.query("orders").collect();
    const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
    if (paidOrders.length === 0) {
      throw new Error("No paid orders found to seed logistics mock data. Please run Seed Finance Data first.");
    }

    let count = 0;
    const providers = ["delhivery", "shiprocket"];
    const statuses: ("pickup_scheduled" | "in_transit" | "failed" | "rto_initiated" | "delivered")[] = [
      "pickup_scheduled",
      "in_transit",
      "failed",
      "rto_initiated",
      "delivered",
    ];

    for (let i = 0; i < Math.min(paidOrders.length, 5); i++) {
      const order = paidOrders[i];
      if (!order) continue;

      if (order.shipmentId) {
        const existingShipment = await ctx.db.get(order.shipmentId);
        if (existingShipment) continue;
      }

      const provider = providers[i % providers.length] || "delhivery";
      const status = statuses[i % statuses.length] || "pickup_scheduled";
      const awbNumber = `AWB${1000000000 + Math.floor(Math.random() * 9000000000)}`;

      const orderPickup = order.pickupAddress;
      const boutique = orderPickup ? null : await ctx.db.get(order.boutiqueId);
      const customer = await ctx.db.get(order.customerId);

      const pickupAddress = {
        name: orderPickup?.boutiqueName || boutique?.boutiqueName || "Boutique Pickup Center",
        line1: orderPickup?.address || boutique?.address || "Street Address snapshot",
        city: orderPickup?.city || boutique?.addressDetails?.city || "Unknown City",
        state: orderPickup?.state || boutique?.addressDetails?.state || "Unknown State",
        pincode: orderPickup?.pincode || boutique?.addressDetails?.pincode || "000000",
        phone: orderPickup?.phone || boutique?.phone || "9876543210",
      };

      const deliveryAddress = {
        name: order.deliveryAddress.label || "Customer Home",
        line1: order.deliveryAddress.line1 || order.deliveryAddress.formattedAddress || "No Address Line 1",
        line2: order.deliveryAddress.line2,
        city: order.deliveryAddress.city,
        state: order.deliveryAddress.state,
        pincode: order.deliveryAddress.pincode,
        phone: customer?.phone || "9999999999",
      };

      const events = [];
      const t1 = now - 3 * 24 * 3600 * 1000;
      const t2 = now - 2 * 24 * 3600 * 1000;
      const t3 = now - 1 * 24 * 3600 * 1000;

      events.push({
        timestamp: t1,
        status: "pickup_scheduled",
        location: "Boutique Warehouse",
        remarks: "Fulfillment booked. Carrier AWB generated.",
      });

      if (status !== "pickup_scheduled") {
        events.push({
          timestamp: t2,
          status: "picked_up",
          location: "Boutique Warehouse",
          remarks: "Package handed over to courier agent.",
        });
        events.push({
          timestamp: t3,
          status: "in_transit",
          location: "National Transit Hub",
          remarks: "Shipment sorting complete and in transit.",
        });
      }

      let exceptionType: any = undefined;
      if (status === "failed") {
        exceptionType = "address_issue";
        events.push({
          timestamp: now,
          status: "failed",
          location: "Local Delivery Office",
          remarks: "Delivery attempt failed: Address incorrect or incomplete.",
        });
      } else if (status === "rto_initiated") {
        events.push({
          timestamp: now - 8 * 3600 * 1000,
          status: "failed",
          location: "Local Hub",
          remarks: "Delivery attempt failed: Customer unreachable.",
        });
        events.push({
          timestamp: now,
          status: "rto_initiated",
          location: "Transit Center",
          remarks: "RTO initiated back to merchant boutique.",
        });
      } else if (status === "delivered") {
        events.push({
          timestamp: now - 4 * 3600 * 1000,
          status: "out_for_delivery",
          location: "Local Delivery Center",
          remarks: "Package out for delivery with agent.",
        });
        events.push({
          timestamp: now,
          status: "delivered",
          location: "Customer Doorstep",
          remarks: "Shipment delivered. OTP verified.",
        });
      }

      const shipmentId = await ctx.db.insert("shipments", {
        orderId: order._id,
        provider,
        awbNumber,
        status,
        idempotencyKey: `ship_mock_${order._id}`,
        trackingUrl: `https://tracking.hive.com/${awbNumber}`,
        pickupAddress,
        deliveryAddress,
        estimatedDelivery: now + 3 * 24 * 3600 * 1000,
        deliveredAt: status === "delivered" ? now : undefined,
        exceptionType,
        rawWebhookEvents: events,
        createdAt: t1,
        updatedAt: now,
      });

      const orderPatch: any = {
        shipmentId,
        updatedAt: now,
      };

      if (status === "delivered") {
        orderPatch.status = "delivered";
        orderPatch.deliveredAt = now;
        orderPatch.claimWindowExpiresAt = now + 48 * 3600 * 1000;
      } else if (status === "pickup_scheduled") {
        orderPatch.status = "pickup_scheduled";
        orderPatch.pickupScheduledAt = now;
      } else {
        orderPatch.status = "in_transit";
      }

      await ctx.db.patch(order._id, orderPatch);
      count++;
    }

    return { count };
  },
});

/**
 * Get dynamic, source-of-truth performance statistics for a boutique.
 * Recalculates all scores on-the-fly to prevent stale values.
 */
export const getBoutiquePerformanceAdmin = query({
  args: { boutiqueId: v.id("boutiques") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    // Filter out orders that were never paid or confirmed
    const validOrders = orders.filter((o) => o.status !== "pending_payment");
    const totalOrdersCount = validOrders.length;

    if (totalOrdersCount === 0) {
      return {
        fulfillmentScore: 100.0,
        sameDayPercent: 100.0,
        cancellationRate: 0.0,
        rtoRate: 0.0,
        claimRate: 0.0,
        totalOrders: 0,
      };
    }

    // 1. Cancellation Rate
    const cancelledOrders = validOrders.filter((o) => o.status === "cancelled");
    const cancellationRate = (cancelledOrders.length / totalOrdersCount) * 100;

    // 2. RTO Rate
    let rtoCount = 0;
    for (const o of validOrders) {
      if (o.shipmentId) {
        const shipment = await ctx.db.get(o.shipmentId);
        if (
          shipment &&
          ["rto_initiated", "rto_in_transit", "rto_delivered", "returned"].includes(shipment.status)
        ) {
          rtoCount++;
        }
      }
    }
    const rtoRate = (rtoCount / totalOrdersCount) * 100;

    // 3. Claim Rate
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();
    const claimRate = (claims.length / totalOrdersCount) * 100;

    // 4. Same Day Percent (Delivered within 8 hours of orderAcceptedAt / confirmedAt / createdAt)
    const deliveredOrders = validOrders.filter((o) => o.status === "delivered");
    let sameDayCount = 0;
    for (const o of deliveredOrders) {
      const startTime = o.orderAcceptedAt || o.confirmedAt || o.createdAt;
      const endTime = o.deliveredAt;
      if (endTime && startTime) {
        const duration = endTime - startTime;
        if (duration <= 8 * 3600 * 1000) {
          sameDayCount++;
        }
      }
    }
    const sameDayPercent =
      deliveredOrders.length > 0 ? (sameDayCount / deliveredOrders.length) * 100 : 100;

    // 5. Composite Fulfillment Score Calculation
    // Base 100, deduct weights:
    // Cancellation Rate: 2.0x weight (max 30 deduction)
    // RTO Rate: 1.5x weight (max 25 deduction)
    // Claim Rate: 3.0x weight (max 30 deduction)
    // non-Same-Day Rate: 1.0x weight (max 15 deduction)
    const cancelDeduction = Math.min(30, cancellationRate * 2.0);
    const rtoDeduction = Math.min(25, rtoRate * 1.5);
    const claimDeduction = Math.min(30, claimRate * 3.0);
    const sameDayDeduction = Math.min(15, (100 - sameDayPercent) * 1.0);

    const rawScore = 100 - (cancelDeduction + rtoDeduction + claimDeduction + sameDayDeduction);
    const fulfillmentScore = Math.max(0, Math.min(100, rawScore));

    return {
      fulfillmentScore: Math.round(fulfillmentScore * 10) / 10,
      sameDayPercent: Math.round(sameDayPercent * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      rtoRate: Math.round(rtoRate * 10) / 10,
      claimRate: Math.round(claimRate * 10) / 10,
      totalOrders: totalOrdersCount,
    };
  },
});

export const bookShipmentAdmin = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found.");

    if (order.status !== "packed") {
      throw new Error("Order status must be packed to book courier.");
    }
    if (order.shipmentId) {
      throw new Error("Order already has a shipment associated.");
    }

    const orderPickup = order.pickupAddress;
    const boutique = await ctx.db.get(order.boutiqueId);
    if (!orderPickup && !boutique) throw new Error("Boutique not found.");

    // Enforce hyperlocal transition prerequisites (safety checks)
    assertHyperlocalTransitionPrerequisites(order, boutique);

    // Resolve Pickup and Delivery Addresses
    const pickupAddress = {
      name: orderPickup?.boutiqueName || boutique?.boutiqueName || "Boutique Pickup Center",
      line1: orderPickup?.address || boutique?.address || "Address snapshot pending",
      city: orderPickup?.city || boutique?.addressDetails?.city || "Unknown City",
      state: orderPickup?.state || boutique?.addressDetails?.state || "Unknown State",
      pincode: orderPickup?.pincode || boutique?.addressDetails?.pincode || "000000",
      phone: orderPickup?.phone || boutique?.phone || "9876543210",
    };

    const customer = await ctx.db.get(order.customerId);
    const deliveryAddress = {
      name: order.deliveryAddress.label || "Customer Delivery",
      line1: order.deliveryAddress.line1 || order.deliveryAddress.formattedAddress || "No Address Line 1",
      line2: order.deliveryAddress.line2,
      city: order.deliveryAddress.city,
      state: order.deliveryAddress.state,
      pincode: order.deliveryAddress.pincode,
      phone: customer?.phone || "9999999999",
    };

    const awb = "MNL-" + Math.floor(100000 + Math.random() * 900000);
    const trackingUrl = LOGISTICS_PROVIDERS.manual.trackingUrl(awb);

    const shipmentId = await ctx.db.insert("shipments", {
      orderId: order._id,
      provider: "manual",
      awbNumber: awb,
      status: "pickup_scheduled",
      idempotencyKey: `ship_quick_${order._id}`,
      trackingUrl,
      pickupAddress,
      deliveryAddress,
      estimatedDelivery: now + 1 * 24 * 3600 * 1000,
      slaStatus: "on_track",
      rawWebhookEvents: [
        {
          timestamp: now,
          status: "pickup_scheduled",
          location: "System Desk",
          remarks: "Fulfillment quick-booked via Operations Console.",
          rawPayload: JSON.stringify({ event: "created", provider: "manual" }),
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Link shipment back to order
    await ctx.db.patch(order._id, {
      shipmentId,
      status: "pickup_scheduled",
      pickupScheduledAt: now,
      readyForPickupAt: now,
      updatedAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "shipments.create_quick",
      entityType: "shipments",
      entityId: shipmentId,
      metadata: JSON.stringify({ orderId: order._id, awbNumber: awb, provider: "manual" }),
      createdAt: now,
    });

    // TODO: wire Shiprocket booking here

    return { success: true, shipmentId };
  },
});

export const dispatchShiprocketOrderAdmin = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<any> => {
    // 1. We assume admin authentication is done via standard mechanism (if we can inside an action)
    // For actions, checking admin role usually requires an internal query.
    const isAdmin = await ctx.runQuery(internal.adminOrders.checkIsAdminInternal);
    if (!isAdmin) throw new Error("Unauthorized: Admin only");

    // 2. We need an internal mutation to prepare the shipment row since actions can't use ctx.db directly
    const shipmentId = await ctx.runMutation(internal.adminLogistics.prepareShiprocketShipmentInternal, { orderId: args.orderId });

    // 3. Chain Shiprocket calls
    const result = await ctx.runAction(internal.lib.shiprocket.dispatchOrder, { orderId: args.orderId, shipmentId });

    return { success: true, shipmentId, ...result };
  }
});

export const prepareShiprocketShipmentInternal = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.shipmentId) throw new Error("Order already has a shipment");

    const now = Date.now();
    const shipmentId = await ctx.db.insert("shipments", {
      orderId: order._id,
      provider: "shiprocket",
      awbNumber: "PENDING", // Will be patched by the action
      status: "booking_requested",
      createdAt: now,
      updatedAt: now,
      pickupAddress: { 
        name: order.pickupAddress?.boutiqueName || "Pending", 
        line1: order.pickupAddress?.address || "Pending", 
        city: order.pickupAddress?.city || "Pending", 
        state: order.pickupAddress?.state || "Pending", 
        pincode: order.pickupAddress?.pincode || "Pending", 
        phone: order.pickupAddress?.phone || "Pending" 
      },
      deliveryAddress: {
        name: order.deliveryAddress.label || "Customer",
        line1: order.deliveryAddress.line1 || "Pending",
        city: order.deliveryAddress.city,
        state: order.deliveryAddress.state,
        pincode: order.deliveryAddress.pincode,
        phone: "Pending"
      },
      rawWebhookEvents: [{
        timestamp: now,
        status: "booking_requested",
        remarks: "Initiated Shiprocket automated dispatch",
      }]
    });

    await ctx.db.patch(order._id, {
      shipmentId,
      status: "pickup_scheduled", // Optimistic order status update
      updatedAt: now,
    });

    return shipmentId;
  }
});
