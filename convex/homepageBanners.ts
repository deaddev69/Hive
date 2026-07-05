// convex/homepageBanners.ts
// Queries and mutations to manage homepage campaign banners with hyperlocal targeting.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { validateUploadedFile } from "./lib/uploads";

/**
 * Fetch all active campaign banners sorted by displayOrder.
 * Publicly accessible query used by the customer homepage.
 * Optionally partitions targeted city campaigns first.
 */
export const getActiveBanners = query({
  args: {
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let banners = await ctx.db
      .query("homepageBanners")
      .withIndex("by_active_and_displayOrder", (q) => q.eq("active", true))
      .collect();

    // Filter by date bounds if configured
    banners = banners.filter((b) => {
      if (b.startDate && now < b.startDate) return false;
      if (b.endDate && now > b.endDate) return false;
      return true;
    });

    // Partition: hyperlocal first, followed by national/generic campaigns
    if (args.city) {
      const normalizedCity = args.city.trim().toLowerCase();
      const cityBanners = banners.filter(
        (b) => b.city && b.city.trim().toLowerCase() === normalizedCity
      );
      const generalBanners = banners.filter((b) => !b.city);
      // Sort each subset by displayOrder
      const sortedCity = cityBanners.sort((a, b) => a.displayOrder - b.displayOrder);
      const sortedGeneral = generalBanners.sort((a, b) => a.displayOrder - b.displayOrder);
      return [...sortedCity, ...sortedGeneral];
    }

    return banners.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * Fetch all campaign banners.
 * Admin-only query.
 */
export const getBannersAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.db.query("homepageBanners").collect();
  },
});

/**
 * Create a new campaign banner.
 * Admin-only mutation.
 */
export const createBannerAdmin = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    desktopImageStorageId: v.optional(v.string()),
    mobileImageStorageId: v.optional(v.string()),
    desktopImageUrl: v.optional(v.string()),
    mobileImageUrl: v.optional(v.string()),
    ctaText: v.string(),
    active: v.boolean(),
    displayOrder: v.number(),
    targetType: v.union(
      v.literal("collection"),
      v.literal("category"),
      v.literal("product"),
      v.literal("search")
    ),
    targetValue: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageBytes = 5 * 1024 * 1024; // 5MB

    if (args.desktopImageStorageId) {
      await validateUploadedFile(ctx, args.desktopImageStorageId, undefined, allowedImageMimes, maxImageBytes);
    }
    if (args.mobileImageStorageId) {
      await validateUploadedFile(ctx, args.mobileImageStorageId, undefined, allowedImageMimes, maxImageBytes);
    }

    let desktopUrl = args.desktopImageUrl || "";
    if (args.desktopImageStorageId) {
      const resolved = await ctx.storage.getUrl(args.desktopImageStorageId);
      if (resolved) desktopUrl = resolved;
    }

    let mobileUrl = args.mobileImageUrl || "";
    if (args.mobileImageStorageId) {
      const resolved = await ctx.storage.getUrl(args.mobileImageStorageId);
      if (resolved) mobileUrl = resolved;
    }

    if (!desktopUrl) {
      throw new Error("Desktop banner image is required.");
    }

    // Default mobile URL to desktop if mobile was not provided
    const resolvedMobileUrl = mobileUrl || desktopUrl;

    const bannerId = await ctx.db.insert("homepageBanners", {
      title: args.title,
      subtitle: args.subtitle,
      desktopImageUrl: desktopUrl,
      mobileImageUrl: resolvedMobileUrl,
      ctaText: args.ctaText,
      active: args.active,
      displayOrder: args.displayOrder,
      targetType: args.targetType,
      targetValue: args.targetValue.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
      city: args.city?.trim() || undefined,
      createdAt: Date.now(),
    });

    return bannerId;
  },
});

/**
 * Update an existing campaign banner.
 * Admin-only mutation.
 */
export const updateBannerAdmin = mutation({
  args: {
    id: v.id("homepageBanners"),
    title: v.string(),
    subtitle: v.optional(v.string()),
    desktopImageStorageId: v.optional(v.string()),
    mobileImageStorageId: v.optional(v.string()),
    desktopImageUrl: v.optional(v.string()),
    mobileImageUrl: v.optional(v.string()),
    ctaText: v.string(),
    active: v.boolean(),
    displayOrder: v.number(),
    targetType: v.union(
      v.literal("collection"),
      v.literal("category"),
      v.literal("product"),
      v.literal("search")
    ),
    targetValue: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageBytes = 5 * 1024 * 1024; // 5MB

    if (args.desktopImageStorageId) {
      await validateUploadedFile(ctx, args.desktopImageStorageId, undefined, allowedImageMimes, maxImageBytes);
    }
    if (args.mobileImageStorageId) {
      await validateUploadedFile(ctx, args.mobileImageStorageId, undefined, allowedImageMimes, maxImageBytes);
    }

    const existing = await ctx.db.get("homepageBanners", args.id);
    if (!existing) {
      throw new Error("Campaign banner not found");
    }

    let desktopUrl = args.desktopImageUrl || existing.desktopImageUrl;
    if (args.desktopImageStorageId) {
      const resolved = await ctx.storage.getUrl(args.desktopImageStorageId);
      if (resolved) desktopUrl = resolved;
    }

    let mobileUrl = args.mobileImageUrl || existing.mobileImageUrl;
    if (args.mobileImageStorageId) {
      const resolved = await ctx.storage.getUrl(args.mobileImageStorageId);
      if (resolved) mobileUrl = resolved;
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      subtitle: args.subtitle,
      desktopImageUrl: desktopUrl,
      mobileImageUrl: mobileUrl || desktopUrl,
      ctaText: args.ctaText,
      active: args.active,
      displayOrder: args.displayOrder,
      targetType: args.targetType,
      targetValue: args.targetValue.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
      city: args.city?.trim() || undefined,
    });

    return args.id;
  },
});

/**
 * Delete a campaign banner.
 * Admin-only mutation.
 */
export const deleteBannerAdmin = mutation({
  args: {
    id: v.id("homepageBanners"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.delete(args.id);
    return args.id;
  },
});

/**
 * Toggle active status of a campaign banner.
 * Admin-only mutation.
 */
export const toggleBannerAdmin = mutation({
  args: {
    id: v.id("homepageBanners"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.id, {
      active: args.active,
    });
    return args.id;
  },
});
