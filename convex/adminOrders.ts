// convex/adminOrders.ts
// Admin-only order queries and mutations for the HIVE Admin panel.
// All functions require the "admin" role.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Admin Dashboard Metrics
 * Returns total orders, pending orders, delivered orders, total revenue,
 * and the 10 most recent orders across ALL boutiques.
 */
export const getAdminDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    // Fetch all orders (bounded to prevent table-scan timeouts at scale)
    const allOrders = await ctx.db
      .query("orders")
      .order("desc")
      .take(2000);

    const totalOrders = allOrders.length;

    const pendingOrders = allOrders.filter((o) =>
      o.status === "pending_confirmation" ||
      o.status === "pending_payment" ||
      o.status === "confirmed"
    ).length;

    const deliveredOrders = allOrders.filter((o) => o.status === "delivered").length;

    const totalRevenue = allOrders
      .filter((o) => o.status === "delivered" || o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    // 10 most recent orders enriched with customer + boutique names
    const recentOrdersRaw = allOrders.slice(0, 10);

    const recentOrders = await Promise.all(
      recentOrdersRaw.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        const boutique = await ctx.db.get(order.boutiqueId);

        // Try to get customer display name from customerProfiles
        const profile = await ctx.db
          .query("customerProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", order.customerId))
          .unique();

        const customerName =
          profile?.displayName ||
          customer?.email ||
          "Customer";

        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          customerName,
          boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        };
      })
    );

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      recentOrders,
    };
  },
});

/**
 * Get ALL marketplace orders across all boutiques.
 * Returns orders with customer and boutique info, sorted newest first.
 * Bounded to 500 for performance.
 */
export const getAllOrders = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const limit = args.limit ?? 200;

    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(limit);

    // Enrich with customer and boutique info
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        const boutique = await ctx.db.get(order.boutiqueId);

        // Get customer display name from profile
        const profile = await ctx.db
          .query("customerProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", order.customerId))
          .unique();

        const customerName =
          profile?.displayName ||
          customer?.email ||
          "Customer";

        // Get order items count
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .take(50);

        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          customerName,
          customerEmail: customer?.email || "",
          boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
          boutiqueId: order.boutiqueId,
          customerId: order.customerId,
          itemsCount: items.length,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          deliveryAddress: order.deliveryAddress,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get detailed information about a single order by _id.
 * Admin-only. Returns full customer, boutique, items, and address details.
 */
export const getOrderDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const customer = await ctx.db.get(order.customerId);
    const boutique = await ctx.db.get(order.boutiqueId);

    // Customer profile for display name
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", order.customerId))
      .unique();

    const customerName =
      profile?.displayName ||
      customer?.email ||
      "Customer";

    // Order items with product details
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(50);

    const enrichedItems = await Promise.all(
      orderItems.map(async (item) => {
        // Try to get image URL from storage if it looks like a storage ID
        let imageUrl = item.imageUrl;
        if (imageUrl && !imageUrl.startsWith("http")) {
          try {
            const url = await ctx.storage.getUrl(imageUrl as any);
            imageUrl = url || imageUrl;
          } catch {
            // keep original
          }
        }
        return {
          ...item,
          imageUrl,
        };
      })
    );

    // Build timeline from order status fields
    const timeline: Array<{ label: string; timestamp: number | null; done: boolean }> = [
      {
        label: "Order Placed",
        timestamp: order.createdAt,
        done: true,
      },
      {
        label: "Confirmed",
        timestamp: order.confirmedAt ?? null,
        done: !!order.confirmedAt,
      },
      {
        label: "Packed & Picked Up",
        timestamp: null,
        done: ["packed", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "delivered"].includes(order.status),
      },
      {
        label: "In Transit",
        timestamp: null,
        done: ["in_transit", "out_for_delivery", "delivered"].includes(order.status),
      },
      {
        label: "Out for Delivery",
        timestamp: null,
        done: ["out_for_delivery", "delivered"].includes(order.status),
      },
      {
        label: "Delivered",
        timestamp: order.deliveredAt ?? null,
        done: order.status === "delivered",
      },
    ];

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      confirmedAt: order.confirmedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      deliveryAddress: order.deliveryAddress,
      customer: {
        _id: customer?._id,
        email: customer?.email,
        phone: customer?.phone,
        displayName: customerName,
        role: customer?.role,
      },
      boutique: {
        _id: boutique?._id,
        boutiqueName: boutique?.boutiqueName,
        ownerName: boutique?.ownerName,
        email: boutique?.email,
        phone: boutique?.phone,
        address: boutique?.address,
      },
      items: enrichedItems,
      timeline,
    };
  },
});

/**
 * Admin: Update the status of any order.
 * Also stamps confirmedAt / deliveredAt / cancelledAt timestamps
 * so the customer timeline renders accurate dates.
 */
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("pending_confirmation"),
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("pickup_scheduled"),
      v.literal("picked_up"),
      v.literal("in_transit"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("claim_submitted"),
      v.literal("replacement_requested"),
      v.literal("replacement_approved"),
      v.literal("replacement_dispatched"),
      v.literal("replacement_delivered"),
      v.literal("refund_requested"),
      v.literal("refunded")
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found.");

    const now = Date.now();
    const patch: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "confirmed" && !order.confirmedAt) {
      patch.confirmedAt = now;
    }
    if (args.status === "delivered" && !order.deliveredAt) {
      patch.deliveredAt = now;
    }
    if (args.status === "cancelled" && !order.cancelledAt) {
      patch.cancelledAt = now;
    }

    await ctx.db.patch(args.orderId, patch);
    return args.orderId;
  },
});
