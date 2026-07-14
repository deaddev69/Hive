// convex/adminOrders.ts
// Admin-only order queries and mutations for the HIVE Admin panel.
// All functions require the "admin" role.

import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole, getCurrentUserOrNull } from "./lib/auth";
import { internal } from "./_generated/api";
import { triggerNotification } from "./lib/notifications";
import { markOrderFinanciallyDelivered } from "./adminFinance";

/**
 * Admin Dashboard Metrics
 * Returns total orders, pending orders, delivered orders, total revenue,
 * and the 10 most recent orders across ALL boutiques.
 */
export const getAdminDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const [
      pendingConfirmationList,
      pendingPaymentList,
      confirmedList,
      deliveredList,
      packedList,
      pickupScheduledList,
      pickedUpList,
      inTransitList,
      outForDeliveryList,
      cancelledList,
      refundedList,
      bookingFailedList,
      claimSubmittedList,
      replacementRequestedList,
      replacementApprovedList,
      replacementDispatchedList,
      replacementDeliveredList,
      refundRequestedList,
    ] = await Promise.all([
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "pending_confirmation")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "pending_payment")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "confirmed")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "delivered")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "packed")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "pickup_scheduled")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "picked_up")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "in_transit")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "out_for_delivery")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "cancelled")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "refunded")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "booking_failed")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "claim_submitted")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_requested")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_approved")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_dispatched")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_delivered")).collect(),
      ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "refund_requested")).collect(),
    ]);

    const allOrders = [
      ...pendingConfirmationList,
      ...pendingPaymentList,
      ...confirmedList,
      ...deliveredList,
      ...packedList,
      ...pickupScheduledList,
      ...pickedUpList,
      ...inTransitList,
      ...outForDeliveryList,
      ...cancelledList,
      ...refundedList,
      ...bookingFailedList,
      ...claimSubmittedList,
      ...replacementRequestedList,
      ...replacementApprovedList,
      ...replacementDispatchedList,
      ...replacementDeliveredList,
      ...refundRequestedList,
    ];

    const pendingOrders = pendingConfirmationList.length + pendingPaymentList.length + confirmedList.length;
    const deliveredOrders = deliveredList.length;
    const totalOrders = allOrders.length;

    // Revenue computed from delivered orders
    const totalRevenue = deliveredList.reduce((sum, o) => sum + (o.total || 0), 0);

    // Command Center calculations
    const nowDate = new Date();
    const startOfToday = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
    const todayOrders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startOfToday))
      .collect();
    const gmvToday = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const ordersToday = todayOrders.length;

    const confirmedOrDelivered = allOrders.filter(o => o.orderAcceptedAt !== undefined);
    const acceptedOnTime = confirmedOrDelivered.filter(o => {
      const delay = o.orderAcceptedAt! - o.createdAt;
      return delay <= 15 * 60 * 1000;
    }).length;
    const acceptanceSlaRate = confirmedOrDelivered.length > 0
      ? (acceptedOnTime / confirmedOrDelivered.length) * 100
      : 100;

    const deliveredOrdersList = allOrders.filter(o => o.status === "delivered");
    let sameDayCount = 0;
    for (const o of deliveredOrdersList) {
      const startTime = o.orderAcceptedAt || o.confirmedAt || o.createdAt;
      const endTime = o.deliveredAt;
      if (endTime && startTime && (endTime - startTime <= 8 * 3600 * 1000)) {
        sameDayCount++;
      }
    }
    const sameDayRate = deliveredOrdersList.length > 0
      ? (sameDayCount / deliveredOrdersList.length) * 100
      : 100;

    const refundedOrdersCount = allOrders.filter(o => o.status === "refunded" || o.paymentStatus === "refunded").length;
    const refundRate = allOrders.length > 0 ? (refundedOrdersCount / allOrders.length) * 100 : 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", thirtyDaysAgo))
      .collect();
    const claimRate = allOrders.length > 0 ? (claims.length / allOrders.length) * 100 : 0;

    // Calculate TTFA percentiles and SLA breaches
    const acceptanceTimes = confirmedOrDelivered.map(o => (o.orderAcceptedAt! - o.createdAt) / (60 * 1000)); // in minutes
    acceptanceTimes.sort((a, b) => a - b);

    const getPercentileValue = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return Math.round(arr[Math.max(0, index)] ?? 0);
    };

    const ttfaP50 = getPercentileValue(acceptanceTimes, 50);
    const ttfaP90 = getPercentileValue(acceptanceTimes, 90);
    const ttfaP95 = getPercentileValue(acceptanceTimes, 95);

    const ttfaBreach10mCount = acceptanceTimes.filter(t => t > 10).length;
    const ttfaBreach15mCount = acceptanceTimes.filter(t => t > 15).length;

    const commandCenterMetrics = {
      gmvToday,
      ordersToday,
      acceptanceSlaRate: Math.round(acceptanceSlaRate),
      sameDayRate: Math.round(sameDayRate),
      refundRate: Math.round(refundRate * 10) / 10,
      claimRate: Math.round(claimRate * 10) / 10,
      ttfaP50,
      ttfaP90,
      ttfaP95,
      ttfaBreach10mCount,
      ttfaBreach15mCount,
    };

    // 10 most recent orders (very fast take(10) query)
    const recentOrdersRaw = await ctx.db
      .query("orders")
      .order("desc")
      .take(10);

    const customerIds = Array.from(new Set(recentOrdersRaw.map((o) => o.customerId)));
    const boutiqueIds = Array.from(new Set(recentOrdersRaw.map((o) => o.boutiqueId)));

    const [customersList, boutiquesList, profilesList] = await Promise.all([
      Promise.all(customerIds.map((id) => ctx.db.get(id))),
      Promise.all(boutiqueIds.map((id) => ctx.db.get(id))),
      Promise.all(customerIds.map((id) => ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", id)).unique()))
    ]);

    const customerMap = new Map(customersList.filter(Boolean).map((c) => [c!._id, c]));
    const boutiqueMap = new Map(boutiquesList.filter(Boolean).map((b) => [b!._id, b]));
    const profileMap = new Map(profilesList.filter(Boolean).map((p) => [p!.userId, p]));

    const recentOrders = recentOrdersRaw.map((order) => {
      const customer = customerMap.get(order.customerId);
      const boutique = boutiqueMap.get(order.boutiqueId);
      const profile = profileMap.get(order.customerId);

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
    });

    // --- Compute Needs Attention Operational Queues ---
    const now = Date.now();
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    // 1. Orders Pending > 12h (in pending_confirmation or confirmed)
    const ordersPendingOver12h = [...pendingConfirmationList, ...confirmedList].filter(
      (o) => o.createdAt < twelveHoursAgo
    ).length;

    // 2. Orders Waiting Acceptance > 15m
    const ordersWaitingAcceptanceOver15m = pendingConfirmationList.filter(
      (o) => o.createdAt < fifteenMinutesAgo
    ).length;

    const totalDelayMs = pendingConfirmationList.reduce((sum, o) => sum + (now - o.createdAt), 0);
    const averageAcceptanceDelayMins = pendingConfirmationList.length > 0
      ? Math.round(totalDelayMs / (pendingConfirmationList.length * 60 * 1000))
      : 0;

    // 3. Claims Waiting > 24h (in submitted or under_review)
    const submittedClaimsList = await ctx.db
      .query("claims")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    const underReviewClaimsList = await ctx.db
      .query("claims")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .collect();
    const claimsWaitingOver24h = [...submittedClaimsList, ...underReviewClaimsList].filter(
      (c) => c.submittedAt < twentyFourHoursAgo
    ).length;

    // 4. Suspended Boutiques count
    const suspendedBoutiquesList = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "SUSPENDED"))
      .collect();
    const suspendedBoutiquesCount = suspendedBoutiquesList.length;

    // 5. Products Moderated count
    const moderatedProductsList = await ctx.db
      .query("products")
      .withIndex("by_adminHidden", (q) => q.eq("adminHidden", true))
      .collect();
    const productsModeratedCount = moderatedProductsList.length;

     // 6. Total Products & Out of Stock counts (Optimized index scan)
    const activeProducts = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const inactiveProductsSample = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", false))
      .take(500);

    const totalProducts = activeProducts.length + inactiveProductsSample.length;
    const outOfStockProductsCount = activeProducts.filter(p => {
      const stock = p.stockBySize || {};
      return Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0) === 0;
    }).length;

    // 7. Boutique documents awaiting review count
    const pendingDocumentsList = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const pendingDocumentsCount = pendingDocumentsList.length;

    // 8. Pending Products count (awaiting approval)
    const pendingProductsList = await ctx.db
      .query("products")
      .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", "pending"))
      .collect();
    const pendingProductsReviewCount = pendingProductsList.length;

    // 8. Dynamic operational queues
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    const waitingOver15m = pendingConfirmationList.filter(
      (o) => o.createdAt < fifteenMinutesAgo && o.createdAt >= thirtyMinutesAgo
    ).length;
    const waitingOver30m = pendingConfirmationList.filter(
      (o) => o.createdAt < thirtyMinutesAgo
    ).length;
    const readyForPickupCount = allOrders.filter((o) => o.status === "packed").length;

    const [failedShipments, bookingFailedShipments, lostShipments] = await Promise.all([
      ctx.db.query("shipments").withIndex("by_status", q => q.eq("status", "failed")).collect(),
      ctx.db.query("shipments").withIndex("by_status", q => q.eq("status", "booking_failed")).collect(),
      ctx.db.query("shipments").withIndex("by_status", q => q.eq("status", "lost")).collect(),
    ]);
    const courierExceptionsCount = failedShipments.length + bookingFailedShipments.length + lostShipments.length;

    // Optimized: Replace full table filter scan with parallel indexed by_status queries
    const [pendingRefunds, processingRefunds] = await Promise.all([
      ctx.db
        .query("refundQueue")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
      ctx.db
        .query("refundQueue")
        .withIndex("by_status", (q) => q.eq("status", "processing"))
        .collect(),
    ]);
    const refundQueuePending = [...pendingRefunds, ...processingRefunds];
    const refundPendingCount = refundQueuePending.length;

    const pipelineCounts = {
      pending: allOrders.filter((o) => o.status === "pending_confirmation" || o.status === "pending_payment").length,
      confirmed: allOrders.filter((o) => o.status === "confirmed").length,
      packed: allOrders.filter((o) => o.status === "packed").length,
      pickup: allOrders.filter((o) => o.status === "pickup_scheduled" || o.status === "picked_up").length,
      delivered: allOrders.filter((o) => o.status === "delivered").length,
    };

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      recentOrders,
      // Operational queues
      ordersPendingOver12h,
      ordersWaitingAcceptanceOver15m,
      averageAcceptanceDelayMins,
      claimsWaitingOver24h,
      suspendedBoutiquesCount,
      productsModeratedCount,
      totalProducts,
      outOfStockProductsCount,
      pendingDocumentsCount,
      pendingProductsReviewCount,
      commandCenterMetrics,
      // Added operations metrics
      isSandbox: process.env.ENABLE_DEBUG_TOOLS === "true",
      waitingOver15m,
      waitingOver30m,
      readyForPickupCount,
      courierExceptionsCount,
      refundPendingCount,
      pipelineCounts,
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

    const limit = args.limit ?? 50;

    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(limit);

    // Enrich with customer, boutique, and invoice info in batch
    const customerIds = Array.from(new Set(orders.map((o) => o.customerId)));
    const boutiqueIds = Array.from(new Set(orders.map((o) => o.boutiqueId)));

    const [customersList, boutiquesList, profilesList, itemsList, invoicesList, shipmentsList] = await Promise.all([
      Promise.all(customerIds.map((id) => ctx.db.get(id))),
      Promise.all(boutiqueIds.map((id) => ctx.db.get(id))),
      Promise.all(customerIds.map((id) => ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", id)).unique())),
      Promise.all(orders.map((o) => ctx.db.query("orderItems").withIndex("by_orderId", (q) => q.eq("orderId", o._id)).collect())),
      Promise.all(orders.map((o) => ctx.db.query("invoices").withIndex("by_order_id", (q) => q.eq("orderId", o._id)).unique())),
      Promise.all(orders.map((o) => o.shipmentId ? ctx.db.get(o.shipmentId) : null))
    ]);

    const customerMap = new Map(customersList.filter(Boolean).map((c) => [c!._id, c]));
    const boutiqueMap = new Map(boutiquesList.filter(Boolean).map((b) => [b!._id, b]));
    const profileMap = new Map(profilesList.filter(Boolean).map((p) => [p!.userId, p]));
    const itemsMap = new Map(orders.map((o, i) => [o._id, itemsList[i]]));
    const invoiceMap = new Map(orders.map((o, i) => [o._id, invoicesList[i]]));
    const shipmentMap = new Map(orders.map((o, i) => [o._id, shipmentsList[i]]));

    const enriched = orders.map((order) => {
      const customer = customerMap.get(order.customerId);
      const boutique = boutiqueMap.get(order.boutiqueId);
      const profile = profileMap.get(order.customerId);
      const items = itemsMap.get(order._id) || [];
      const invoice = invoiceMap.get(order._id);
      const shipment = shipmentMap.get(order._id);

      const customerName = profile?.displayName || customer?.email || "Customer";

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
        invoiceNumber: invoice?.invoiceNumber || null,
        invoicePdfUrl: invoice?.pdfUrl || null,
        shipmentId: order.shipmentId || null,
        shipmentStatus: shipment?.status || null,
        shipmentExceptionType: shipment?.exceptionType || null,
      };
    });

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
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["pending_confirmation", "cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "cancelled"],
  pickup_scheduled: ["picked_up", "in_transit", "out_for_delivery", "cancelled"],
  picked_up: ["in_transit", "out_for_delivery", "delivered", "cancelled"],
  in_transit: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  booking_failed: ["pickup_scheduled", "cancelled"],
  delivered: ["claim_submitted", "refund_requested", "refunded"],
  cancelled: [],
  claim_submitted: ["refund_requested", "replacement_requested"],
  replacement_requested: ["replacement_approved", "cancelled"],
  replacement_approved: ["replacement_dispatched", "cancelled"],
  replacement_dispatched: ["replacement_delivered", "cancelled"],
  replacement_delivered: [],
  refund_requested: ["refunded", "cancelled"],
  refunded: [],
};

function isValidTransition(current: string, target: string, isAdminOverride: boolean = false): boolean {
  if (current === target) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

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
      v.literal("refunded"),
      v.literal("booking_failed")
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found.");

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(args.status)) {
      throw new ConvexError(`Invalid transition: ${order.status} → ${args.status}`);
    }

    if (order.status === args.status) {
      return args.orderId;
    }

    if (["refunded", "refund_requested"].includes(args.status) && order.paymentStatus !== "paid") {
      throw new Error(`Cannot transition order to "${args.status}": order has not been paid.`);
    }

    const now = Date.now();

    // Check if transitioning to cancelled/refunded
    const wasCancelledOrRefunded = order.status === "cancelled" || order.status === "refunded";
    const isNowCancelledOrRefunded = args.status === "cancelled" || args.status === "refunded";
    const isReversible = ["pending_payment", "pending_confirmation", "confirmed", "packed", "pickup_scheduled"].includes(order.status);

    if (!wasCancelledOrRefunded && isNowCancelledOrRefunded && isReversible) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      const operator = await getCurrentUserOrNull(ctx);
      const operatorId = operator?._id ?? order.customerId;

      for (const item of orderItems) {
        const product = await ctx.db.get(item.productId);
        if (product) {
          const currentStock = product.stockBySize[item.variantSize] ?? 0;
          const newStock = currentStock + item.quantity;

          const stockBySize = { ...product.stockBySize };
          stockBySize[item.variantSize] = newStock;

          const beforeTotalStock = (product.sizes || []).reduce((sum: number, sz: string) => sum + (product.stockBySize[sz] ?? 0), 0);
          const totalStock = (product.sizes || []).reduce((sum: number, sz: string) => sum + (stockBySize[sz] ?? 0), 0);
          let active = product.active;
          let autoDeactivatedBecauseOutOfStock = product.autoDeactivatedBecauseOutOfStock ?? false;

          const isApproved = !product.approvalStatus || product.approvalStatus === "approved";

          if (totalStock === 0) {
            active = false;
            autoDeactivatedBecauseOutOfStock = true;
          } else if (product.autoDeactivatedBecauseOutOfStock && beforeTotalStock === 0 && totalStock > 0) {
            if (isApproved) {
              active = true;
            }
            autoDeactivatedBecauseOutOfStock = false;
          } else if (totalStock > 0) {
            autoDeactivatedBecauseOutOfStock = false;
          }

          await ctx.db.patch(product._id, {
            stockBySize,
            active,
            autoDeactivatedBecauseOutOfStock,
            updatedAt: now,
          });

          await ctx.db.insert("inventoryMovements", {
            productId: product._id,
            boutiqueId: product.boutiqueId,
            size: item.variantSize,
            beforeQty: currentStock,
            afterQty: newStock,
            adjustmentQty: item.quantity,
            reason: "online_order_reversal",
            source: "return",
            createdBy: operatorId,
            orderId: order._id,
            createdAt: now,
          });
        }
      }
    }

    const patch: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "confirmed" && !order.confirmedAt) {
      patch.confirmedAt = now;
      patch.orderAcceptedAt = now;
      patch.acceptanceTimeoutAt = undefined;
    }
    if (args.status === "packed" && !order.packedAt) {
      patch.packedAt = now;
      patch.readyForPickupAt = now;
      const acceptedTime = order.orderAcceptedAt ?? order.confirmedAt ?? order.createdAt;
      patch.prepTimeDurationMinutes = Math.round((now - acceptedTime) / 60000);
    }
    if (args.status === "pickup_scheduled" && !order.readyForPickupAt) {
      patch.readyForPickupAt = now;
    }
    if (args.status === "pickup_scheduled" && !order.pickupScheduledAt) patch.pickupScheduledAt = now;
    if (args.status === "picked_up" && !order.pickedUpAt) patch.pickedUpAt = now;
    if (args.status === "in_transit" && !order.inTransitAt) patch.inTransitAt = now;
    if (args.status === "out_for_delivery" && !order.outForDeliveryAt) patch.outForDeliveryAt = now;
    if (args.status === "delivered") {
      if (!order.shipmentId) {
        throw new Error("Cannot transition order to delivered: order does not have an associated shipment.");
      }
      const shipment = await ctx.db.get(order.shipmentId);
      if (!shipment || shipment.status !== "delivered") {
        throw new Error("Cannot transition order to delivered: associated shipment is not delivered.");
      }
      if (!order.deliveredAt) {
        patch.deliveredAt = now;
        patch.claimWindowExpiresAt = now + 7 * 24 * 3600 * 1000;
      }
    }
    if (args.status === "cancelled" && !order.cancelledAt) patch.cancelledAt = now;

    await ctx.db.patch(args.orderId, patch);

    if (args.status === "delivered") {
      await markOrderFinanciallyDelivered(ctx, args.orderId, now);
    }

    if (args.status === "packed") {
      // 1. Create a shipment record first
      const boutique = await ctx.db.get(order.boutiqueId);
      const customer = await ctx.db.get(order.customerId);

      const shipmentId = await ctx.db.insert("shipments", {
        orderId: args.orderId,
        provider: "shiprocket",
        status: "created",
        awbNumber: "",
        trackingUrl: "",
        rawWebhookEvents: [],
        pickupAddress: {
          name: boutique?.boutiqueName || "Boutique",
          line1: boutique?.address || "",
          city: boutique?.addressDetails?.city || "",
          state: boutique?.addressDetails?.state || "",
          pincode: boutique?.addressDetails?.pincode || "",
          phone: boutique?.phone || "",
        },
        deliveryAddress: {
          name: (order.deliveryAddress as any)?.name || customer?.email || "Customer",
          line1: order.deliveryAddress?.line1 || (order.deliveryAddress as any)?.formattedAddress || "",
          line2: order.deliveryAddress?.line2 || (order.deliveryAddress as any)?.houseNumber || "",
          city: (order.deliveryAddress as any)?.city || "",
          state: (order.deliveryAddress as any)?.state || "",
          pincode: (order.deliveryAddress as any)?.pincode || "",
          phone: order.deliveryAddress?.phone || customer?.phone || "",
        },
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(args.orderId, { shipmentId });

      // 2. Schedule dispatch action to hit Shiprocket Rate & Book API
      await ctx.scheduler.runAfter(0, internal.lib.shiprocket.dispatchOrder, {
        orderId: args.orderId,
        shipmentId: shipmentId,
      });
    }

    const targetStatuses = ["confirmed", "packed", "out_for_delivery", "delivered"];
    if (targetStatuses.includes(args.status)) {
      await ctx.scheduler.runAfter(0, internal.emails.sendOrderEmail, {
        orderId: args.orderId,
        event: args.status as "confirmed" | "packed" | "out_for_delivery" | "delivered",
      });

      let templateName = args.status as string;
      if (args.status === "confirmed") {
        templateName = "order_accepted";
      }

      await triggerNotification(
        ctx,
        order.customerId,
        "email",
        templateName,
        "order",
        order._id,
        JSON.stringify({
          orderNumber: order.orderNumber,
          amount: order.total,
        })
      );
    }

    if (args.status === "cancelled") {
      // TODO: wire Shiprocket cancellation here

      const boutique = await ctx.db.get(order.boutiqueId);
      const isWhatsAppEnabled = boutique?.whatsAppNotificationsEnabled ?? true;
      const recipientPhone = boutique?.notificationPhone || boutique?.phone;
      const cancelReason = order.cancelReason || "Cancelled by administrator";

      if (isWhatsAppEnabled && recipientPhone) {
        await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
          recipient: recipientPhone,
          templateName: "order_cancelled",
          parameters: [
            boutique?.ownerName || "Merchant",
            order.orderNumber,
            cancelReason
          ],
        });
      } else if (boutique?.email || boutique?.ownerEmail) {
        await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
          to: boutique.email || boutique.ownerEmail,
          subject: `Order Cancelled - ${order.orderNumber}`,
          html: `<p>Dear ${boutique.ownerName || "Merchant"},</p><p>Order ${order.orderNumber} has been cancelled. Reason: ${cancelReason}</p>`,
          templateName: "order_cancelled",
        });
      }

      const customerUser = await ctx.db.get(order.customerId);
      const invoice = await ctx.db
        .query("invoices")
        .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
        .unique();
      const customerEmail = invoice?.customerEmail || customerUser?.email;
      if (customerEmail) {
        await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
          to: customerEmail,
          subject: `Your Hive Order ${order.orderNumber} has been Cancelled`,
          html: `<p>Dear Customer,</p><p>Your order ${order.orderNumber} has been cancelled. Reason: ${cancelReason}. A refund will be initiated if applicable.</p>`,
          templateName: "order_cancelled_customer",
        });
      }
    }

    return args.orderId;
  },
});

export const notifyMerchant = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const boutique = await ctx.db.get(order.boutiqueId);
    if (!boutique) throw new Error("Boutique not found");

    const now = Date.now();
    const recipientId = boutique.ownerUserId || order.customerId;

    const fifteenMinutesAgo = now - 15 * 60 * 1000;
    const existingNotification = await ctx.db
      .query("notificationEvents")
      .withIndex("by_entity_template", (q) =>
        q.eq("entityType", "order").eq("entityId", order._id).eq("template", "order_notification")
      )
      .filter((q) => q.and(
        q.eq(q.field("userId"), recipientId),
        q.gte(q.field("createdAt"), fifteenMinutesAgo)
      ))
      .first();

    if (existingNotification) {
      console.log(`[notifyMerchant] Notification "order_notification" was already sent to recipient ${recipientId} for order ${order._id} within the last 15 minutes. Skipping.`);
      return { success: true, message: "deduplicated" };
    }

    await triggerNotification(
      ctx,
      recipientId,
      "email",
      "order_notification",
      "order",
      order._id,
      JSON.stringify({
        email: boutique.email,
        subject: `ACTION REQUIRED: Please accept Order ${order.orderNumber}`,
        orderNumber: order.orderNumber,
        amount: order.total,
      })
    );

    await ctx.db.insert("auditLogs", {
      actorId: (await getCurrentUserOrNull(ctx))?._id,
      actorRole: "admin",
      action: "order.notify_merchant",
      entityType: "orders",
      entityId: order._id,
      metadata: JSON.stringify({ boutiqueId: boutique._id, boutiqueName: boutique.boutiqueName }),
      createdAt: now,
    });

    return { success: true };
  },
});
