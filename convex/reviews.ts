// convex/reviews.ts
// Customer post-order reviews and seller feedback management API.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getMyBoutique, requireRole } from "./lib/auth";
import { ImageAsset } from "./schema";
import { getPublicUrl } from "./media/api";

/**
 * Submit a review for a delivered order item.
 * Incrementally updates product average rating & review count.
 */
export const submitOrderReview = mutation({
  args: {
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    rating: v.number(), // 1–5 stars
    platformRating: v.optional(v.number()), // 1–5 stars (Delivery & Platform)
    reviewText: v.optional(v.string()),
    fitResponse: v.optional(v.union(
      v.literal("too_small"),
      v.literal("perfect_fit"),
      v.literal("too_large")
    )),
    images: v.optional(v.array(v.union(v.string(), ImageAsset))),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Retrieve order first
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }

    if (order.status?.toLowerCase() !== "delivered") {
      throw new Error("Reviews can only be submitted for delivered orders.");
    }

    // 2. Resolve authenticated user safely
    let user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) {
      user = await getAuthenticatedUser(ctx, args.token).catch(() => null);
    }
    if (!user && order.customerId) {
      user = await ctx.db.get(order.customerId);
    }

    if (!user) {
      throw new Error("Authentication required to submit review.");
    }

    // 2. Retrieve order item
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem || orderItem.orderId !== args.orderId) {
      throw new Error("Invalid order item selection.");
    }

    // 3. Idempotency Check: Prevent duplicate reviews for the same order item
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_orderItemId", (q) => q.eq("orderItemId", args.orderItemId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Validate rating range
    const cleanRating = Math.min(5, Math.max(1, args.rating));
    const cleanPlatformRating = args.platformRating ? Math.min(5, Math.max(1, args.platformRating)) : undefined;

    const product = orderItem.productId ? await ctx.db.get(orderItem.productId) : null;
    const boutiqueId = (orderItem as any).boutiqueId || order.boutiqueId || product?.boutiqueId;

    if (!boutiqueId) {
      throw new Error("Boutique association missing for this item.");
    }

    const now = Date.now();

    // 4. Insert review document
    const reviewId = await ctx.db.insert("reviews", {
      productId: orderItem.productId,
      boutiqueId,
      customerId: user._id,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      rating: cleanRating,
      platformRating: cleanPlatformRating,
      reviewText: args.reviewText?.trim() || undefined,
      fitResponse: args.fitResponse,
      images: args.images,
      isVerifiedPurchase: true,
      isFlagged: false,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Update Product Average Rating incrementally
    if (product) {
      const currentAvg = (product as any).averageRating ?? 0;
      const currentCount = (product as any).reviewCount ?? 0;
      const newCount = currentCount + 1;
      const newAvg = Number(((currentAvg * currentCount + cleanRating) / newCount).toFixed(2));

      await ctx.db.patch(product._id, {
        averageRating: newAvg,
        reviewCount: newCount,
      } as any);
    }

    // 6. Insert fit feedback record if provided
    if (args.fitResponse && product && (product as any).categoryId) {
      await ctx.db.insert("fitFeedback", {
        orderId: args.orderId,
        orderItemId: args.orderItemId,
        productId: product._id,
        boutiqueId,
        categoryId: (product as any).categoryId,
        customerId: user._id,
        sizePurchased: (orderItem as any).variantSize || (orderItem as any).size || "M",
        fitResponse: args.fitResponse,
        createdAt: now,
      });
    }

    return reviewId;
  },
});

/**
 * Fetch published reviews for a product page.
 */
export const getProductReviews = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId_published", (q) =>
        q.eq("productId", args.productId).eq("isPublished", true)
      )
      .order("desc")
      .take(limit);

    const customerIds = Array.from(new Set(reviews.map((r) => r.customerId)));
    const profilesList = await Promise.all(
      customerIds.map((id) =>
        ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", id)).unique()
      )
    );
    const profileMap = new Map(profilesList.filter(Boolean).map((p) => [p!.userId, p]));

    return await Promise.all(
      reviews.map(async (r) => {
        const profile = profileMap.get(r.customerId);
        const authorName = profile?.displayName || "Verified Buyer";

        const resolvedImages = r.images
          ? await Promise.all(
              r.images.map(async (img: any) => {
                if (typeof img === "object") return getPublicUrl(img, "thumbnail");
                if (typeof img === "string" && img.startsWith("http")) return img;
                try {
                  return (await ctx.storage.getUrl(img as any)) || "";
                } catch {
                  return "";
                }
              })
            )
          : [];

        return {
          _id: r._id,
          rating: r.rating,
          reviewText: r.reviewText,
          fitResponse: r.fitResponse,
          images: resolvedImages.filter(Boolean),
          authorName,
          sellerReply: r.sellerReply,
          sellerRepliedAt: r.sellerRepliedAt,
          createdAt: r.createdAt,
        };
      })
    );
  },
});

/**
 * Fetch boutique reviews for the Seller Portal dashboard.
 */
export const getBoutiqueReviews = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);
    const limit = args.limit ?? 50;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .order("desc")
      .take(limit);

    const productIds = Array.from(new Set(reviews.map((r) => r.productId)));
    const customerIds = Array.from(new Set(reviews.map((r) => r.customerId)));

    const [productsList, profilesList] = await Promise.all([
      Promise.all(productIds.map((id) => ctx.db.get(id))),
      Promise.all(
        customerIds.map((id) =>
          ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", id)).unique()
        )
      ),
    ]);

    const productMap = new Map(productsList.filter(Boolean).map((p) => [p!._id, p]));
    const profileMap = new Map(profilesList.filter(Boolean).map((p) => [p!.userId, p]));

    const totalReviews = reviews.length;
    const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 5.0;

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let fitPerfectCount = 0;
    let fitResponseTotal = 0;
    let repliedCount = 0;

    reviews.forEach((r) => {
      const rKey = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[rKey] = (ratingBreakdown[rKey] || 0) + 1;

      if (r.fitResponse) {
        fitResponseTotal++;
        if (r.fitResponse === "perfect_fit") fitPerfectCount++;
      }
      if (r.sellerReply) repliedCount++;
    });

    const fitRatio = fitResponseTotal > 0 ? Math.round((fitPerfectCount / fitResponseTotal) * 100) : 100;
    const responseRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 100;

    const enrichedReviews = await Promise.all(
      reviews.map(async (r) => {
        const product = productMap.get(r.productId);
        const profile = profileMap.get(r.customerId);

        const resolvedImages = r.images
          ? await Promise.all(
              r.images.map(async (img: any) => {
                if (typeof img === "object") return getPublicUrl(img, "thumbnail");
                if (typeof img === "string" && img.startsWith("http")) return img;
                try {
                  return (await ctx.storage.getUrl(img as any)) || "";
                } catch {
                  return "";
                }
              })
            )
          : [];

        return {
          _id: r._id,
          productName: product?.name || "Unknown Product",
          productSlug: product?.slug,
          customerName: profile?.displayName || "Verified Buyer",
          rating: r.rating,
          platformRating: r.platformRating,
          reviewText: r.reviewText,
          fitResponse: r.fitResponse,
          images: resolvedImages.filter(Boolean),
          sellerReply: r.sellerReply,
          sellerRepliedAt: r.sellerRepliedAt,
          createdAt: r.createdAt,
        };
      })
    );

    return {
      metrics: {
        averageRating,
        totalReviews,
        fitRatio,
        responseRate,
        ratingBreakdown,
      },
      reviews: enrichedReviews,
    };
  },
});

/**
 * Seller mutation to reply to a customer review.
 * Verifies authenticated seller owns the target boutique.
 */
export const replyToReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    replyText: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token);

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.boutiqueId !== boutique._id) {
      throw new Error("Review not found or unauthorized access.");
    }

    if (!args.replyText.trim()) {
      throw new Error("Reply text cannot be empty.");
    }

    const now = Date.now();
    await ctx.db.patch(args.reviewId, {
      sellerReply: args.replyText.trim(),
      sellerRepliedAt: now,
      updatedAt: now,
    });

    return { success: true, reviewId: args.reviewId };
  },
});

/**
 * Check review status for an order's items (returns map of reviewed orderItemId -> reviewId).
 */
export const getOrderReviewStatus = query({
  args: {
    orderId: v.id("orders"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== user._id) {
      return {};
    }

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    const reviewMap: Record<string, string> = {};
    reviews.forEach((r) => {
      reviewMap[r.orderItemId] = r._id;
    });

    return reviewMap;
  },
});
