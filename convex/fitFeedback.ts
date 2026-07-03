// convex/fitFeedback.ts
// Post-delivery fit feedback — customers report how a garment's size fit.
// Feeds into Sizing Accuracy scores at product, category, and boutique levels.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

// Statuses that indicate an order has been delivered
const DELIVERED_STATUSES = new Set([
  "delivered",
  "claim_submitted",
  "replacement_requested",
  "replacement_approved",
  "replacement_dispatched",
  "replacement_delivered",
  "refund_requested",
  "refunded",
]);

/**
 * Submit fit feedback for a delivered order item.
 * One response per orderItemId — duplicates are silently ignored.
 */
export const submitFitFeedback = mutation({
  args: {
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    fitResponse: v.union(
      v.literal("too_small"),
      v.literal("perfect_fit"),
      v.literal("too_large")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // 1. Validate order exists and belongs to this customer
    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== user._id) {
      throw new Error("Order not found or does not belong to you.");
    }

    // 2. Validate order is in a delivered state
    if (!DELIVERED_STATUSES.has(order.status)) {
      throw new Error("Fit feedback can only be submitted for delivered orders.");
    }

    // 3. Validate order item exists and belongs to this order
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem || orderItem.orderId !== args.orderId) {
      throw new Error("Order item not found or does not belong to this order.");
    }

    // 4. Check for duplicate — silently return if already submitted
    const existing = await ctx.db
      .query("fitFeedback")
      .withIndex("by_orderItemId", (q: any) => q.eq("orderItemId", args.orderItemId))
      .first();

    if (existing) {
      return existing._id; // Already submitted, return existing
    }

    // 5. Look up product to get categoryId for denormalization
    const product = await ctx.db.get(orderItem.productId);
    if (!product) {
      throw new Error("Product not found.");
    }

    // 6. Insert the feedback
    const feedbackId = await ctx.db.insert("fitFeedback", {
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      productId: orderItem.productId,
      boutiqueId: order.boutiqueId,
      categoryId: product.categoryId,
      customerId: user._id,
      sizePurchased: orderItem.variantSize,
      fitResponse: args.fitResponse,
      createdAt: Date.now(),
    });

    return feedbackId;
  },
});

/**
 * Get all fit feedback entries for an order.
 * Used to show which items already have responses.
 */
export const getFitFeedbackForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fitFeedback")
      .withIndex("by_orderId", (q: any) => q.eq("orderId", args.orderId))
      .collect();
  },
});

/**
 * Compute Sizing Accuracy for a specific product.
 * Returns null if fewer than 3 responses (insufficient data).
 */
export const getProductSizingAccuracy = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("fitFeedback")
      .withIndex("by_productId", (q: any) => q.eq("productId", args.productId))
      .collect();

    if (feedback.length < 3) return null;

    const breakdown = {
      tooSmall: feedback.filter(f => f.fitResponse === "too_small").length,
      perfectFit: feedback.filter(f => f.fitResponse === "perfect_fit").length,
      tooLarge: feedback.filter(f => f.fitResponse === "too_large").length,
    };

    return {
      accuracy: Math.round((breakdown.perfectFit / feedback.length) * 100),
      totalResponses: feedback.length,
      breakdown,
    };
  },
});

/**
 * Compute Sizing Accuracy at three levels for a boutique:
 * 1. Boutique overall
 * 2. Per category (within this boutique)
 * 3. Per product
 *
 * Returns the most specific level that has sufficient data (≥ 3 responses).
 */
export const getBoutiqueSizingAccuracy = query({
  args: {
    boutiqueId: v.id("boutiques"),
    categoryId: v.optional(v.id("categories")),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const computeAccuracy = (entries: any[]) => {
      if (entries.length < 3) return null;
      const breakdown = {
        tooSmall: entries.filter(f => f.fitResponse === "too_small").length,
        perfectFit: entries.filter(f => f.fitResponse === "perfect_fit").length,
        tooLarge: entries.filter(f => f.fitResponse === "too_large").length,
      };
      return {
        accuracy: Math.round((breakdown.perfectFit / entries.length) * 100),
        totalResponses: entries.length,
        breakdown,
      };
    };

    // Product-level (most specific)
    if (args.productId) {
      const productFeedback = await ctx.db
        .query("fitFeedback")
        .withIndex("by_productId", (q: any) => q.eq("productId", args.productId))
        .collect();
      const productResult = computeAccuracy(productFeedback);
      if (productResult) {
        return { level: "product" as const, ...productResult };
      }
    }

    // Category-level
    if (args.categoryId) {
      const categoryFeedback = await ctx.db
        .query("fitFeedback")
        .withIndex("by_boutiqueId_categoryId", (q: any) =>
          q.eq("boutiqueId", args.boutiqueId).eq("categoryId", args.categoryId)
        )
        .collect();
      const categoryResult = computeAccuracy(categoryFeedback);
      if (categoryResult) {
        return { level: "category" as const, ...categoryResult };
      }
    }

    // Boutique-level (broadest)
    const boutiqueFeedback = await ctx.db
      .query("fitFeedback")
      .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", args.boutiqueId))
      .collect();
    const boutiqueResult = computeAccuracy(boutiqueFeedback);
    if (boutiqueResult) {
      return { level: "boutique" as const, ...boutiqueResult };
    }

    return null; // Not enough data at any level
  },
});
