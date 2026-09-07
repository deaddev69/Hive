// convex/orderTimeline.ts
// The lifecycle of one order as a list of timestamped events.
//
// Every timestamp here already existed somewhere — order fields, the shipment
// record, Porter's webhook log, the activity table — it was just never gathered
// into one place anyone could read.
//
// Porter is the source of truth for the physical legs. Its webhooks carry an
// `event_ts` per transition (order_accepted, order_start_trip, order_end_job)
// which adminLogistics already stores onto the shipment as pickedUpAt and
// deliveredAt. The Track Order API additionally returns an `order_timings`
// object, which we keep verbatim in `porterRawOrder` and surface here.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, getMyBoutique } from "./lib/auth";
import { Id } from "./_generated/dataModel";

export type TimelineEvent = {
  key: string;
  label: string;
  at: number | null;
  source: "hive" | "porter" | "seller";
  detail?: string;
};

/** Porter returns seconds; everything in Hive is milliseconds. */
function porterSecondsToMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  // Values below ~1e12 are second-precision.
  return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
}

async function buildTimeline(ctx: any, orderId: Id<"orders">) {
  const order = await ctx.db.get(orderId);
  if (!order) return null;

  const shipment = order.shipmentId ? await ctx.db.get(order.shipmentId) : null;
  const returnShipment = order.returnShipmentId
    ? await ctx.db.get(order.returnShipmentId)
    : null;

  // Who accepted the order, and when. Recorded per order in orderActivity.
  const acceptance = await ctx.db
    .query("orderActivity")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .first();

  // Porter's own view of the trip, when the Track Order API has been consulted.
  const raw = (shipment as any)?.porterRawOrder ?? null;
  const porterTimings = raw?.order_timings ?? null;

  const events: TimelineEvent[] = [
    {
      key: "placed",
      label: "Order placed",
      at: order.createdAt ?? null,
      source: "hive",
    },
    {
      key: "accepted",
      label: "Accepted by boutique",
      at: acceptance?.createdAt ?? order.acceptedAt ?? null,
      source: "seller",
      detail: acceptance?.actorName ? `by ${acceptance.actorName}` : undefined,
    },
    {
      key: "rider_assigned",
      label: "Rider assigned",
      at: porterSecondsToMs(porterTimings?.order_accepted_time),
      source: "porter",
      detail: (shipment as any)?.driverName
        ? `${(shipment as any).driverName}${
            (shipment as any).vehiclePlate ? ` · ${(shipment as any).vehiclePlate}` : ""
          }`
        : undefined,
    },
    {
      key: "picked_up",
      label: "Picked up from boutique",
      at:
        (shipment as any)?.pickedUpAt ??
        porterSecondsToMs(porterTimings?.pickup_time) ??
        order.pickedUpAt ??
        null,
      source: "porter",
    },
    {
      key: "delivered",
      label: "Delivered to customer",
      at: (shipment as any)?.deliveredAt ?? order.deliveredAt ?? null,
      source: "porter",
    },
  ];

  // The return leg, when one exists, continues the same story.
  if (returnShipment) {
    events.push(
      {
        key: "return_picked_up",
        label: "Return collected from customer",
        at: (returnShipment as any).pickedUpAt ?? null,
        source: "porter",
      },
      {
        key: "return_delivered",
        label: "Return delivered to boutique",
        at: (returnShipment as any).deliveredAt ?? null,
        source: "porter",
      }
    );
  }

  if (order.returnCompletedAt) {
    events.push({
      key: "return_completed",
      label: "Return settled",
      at: order.returnCompletedAt,
      source: "hive",
    });
  }

  return {
    orderNumber: order.orderNumber,
    events,
    // Raw Porter webhook log, newest last — the audit trail behind the above.
    webhookLog: ((shipment as any)?.rawWebhookEvents ?? []).map((e: any) => ({
      at: e.timestamp ?? null,
      status: e.status ?? null,
      location: e.location ?? null,
      remarks: e.remarks ?? null,
    })),
    porterTimings,
    trackingUrl: (shipment as any)?.trackingUrl ?? null,
  };
}

/** Full lifecycle for the admin order drawer. */
export const getOrderTimelineAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    return await buildTimeline(ctx, args.orderId);
  },
});

/**
 * Same timeline for the boutique that owns the order.
 *
 * Scoped deliberately: a seller sees the journey of their own orders and
 * nothing else.
 */
export const getOrderTimelineForBoutique = query({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    if (!boutique) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.boutiqueId !== boutique._id) return null;

    return await buildTimeline(ctx, args.orderId);
  },
});
