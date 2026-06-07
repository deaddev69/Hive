// convex/banners.ts
// Queries and mutations to manage homepage promotional banners.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Fetch all active banners sorted by sortOrder.
 * Publicly accessible query used by the customer homepage.
 */
export const getActiveBanners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("banners")
      .withIndex("by_active_and_sortOrder", (q) => q.eq("active", true))
      .collect();
  },
});

/**
 * Fetch all banners.
 * Admin-only query.
 */
export const getBanners = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.db.query("banners").collect();
  },
});

/**
 * Create a new banner.
 * Admin-only mutation.
 */
export const createBanner = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    desktopImageStorageId: v.optional(v.string()),
    mobileImageStorageId: v.optional(v.string()),
    desktopImageUrl: v.optional(v.string()),
    mobileImageUrl: v.optional(v.string()),
    ctaText: v.string(),
    ctaLink: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

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

    if (!desktopUrl || !mobileUrl) {
      throw new Error("Both desktop and mobile images are required.");
    }

    const bannerId = await ctx.db.insert("banners", {
      title: args.title,
      subtitle: args.subtitle,
      desktopImageUrl: desktopUrl,
      mobileImageUrl: mobileUrl,
      ctaText: args.ctaText,
      ctaLink: args.ctaLink,
      active: args.active,
      sortOrder: args.sortOrder,
      createdAt: Date.now(),
    });
    return bannerId;
  },
});

/**
 * Update an existing banner.
 * Admin-only mutation.
 */
export const updateBanner = mutation({
  args: {
    id: v.id("banners"),
    title: v.string(),
    subtitle: v.string(),
    desktopImageStorageId: v.optional(v.string()),
    mobileImageStorageId: v.optional(v.string()),
    desktopImageUrl: v.optional(v.string()),
    mobileImageUrl: v.optional(v.string()),
    ctaText: v.string(),
    ctaLink: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Fetch existing first to fallback on images
    const existing = await ctx.db.get("banners", args.id);
    if (!existing) {
      throw new Error("Banner not found");
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
      mobileImageUrl: mobileUrl,
      ctaText: args.ctaText,
      ctaLink: args.ctaLink,
      active: args.active,
      sortOrder: args.sortOrder,
    });
    return args.id;
  },
});

/**
 * Toggle active status of a banner.
 * Admin-only mutation.
 */
export const toggleBanner = mutation({
  args: {
    id: v.id("banners"),
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

/**
 * Delete a banner.
 * Admin-only mutation.
 */
export const deleteBanner = mutation({
  args: {
    id: v.id("banners"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.delete(args.id);
    return args.id;
  },
});

/**
 * Generate an upload URL for admin banner images.
 * Admin-only mutation.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.storage.generateUploadUrl();
  },
});
