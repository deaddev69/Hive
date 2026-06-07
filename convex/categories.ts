// convex/categories.ts
// Queries and mutations to manage product discovery categories.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Fetch categories.
 * If onlyActive is true, returns active ones sorted by sortOrder.
 * Otherwise, returns all categories.
 */
export const getCategories = query({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let categories;
    if (args.onlyActive) {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_active_and_sortOrder", (q) => q.eq("active", true))
        .collect();
    } else {
      categories = await ctx.db.query("categories").collect();
    }

    return Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        imageUrl: await ctx.storage.getUrl(cat.imageStorageId),
      }))
    );
  },
});

/**
 * Generate a short-lived upload URL for Convex File Storage.
 * Admin-only.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new category.
 * Admin-only mutation.
 */
export const createCategory = mutation({
  args: {
    name:           v.string(),
    slug:           v.string(),
    imageStorageId: v.id("_storage"),
    active:         v.boolean(),
    sortOrder:      v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const categoryId = await ctx.db.insert("categories", {
      name:           args.name,
      slug:           args.slug,
      imageStorageId: args.imageStorageId,
      active:         args.active,
      sortOrder:      args.sortOrder,
      createdAt:      Date.now(),
    });
    return categoryId;
  },
});

/**
 * Update an existing category.
 * Admin-only mutation.
 */
export const updateCategory = mutation({
  args: {
    id:             v.id("categories"),
    name:           v.string(),
    slug:           v.string(),
    imageStorageId: v.id("_storage"),
    active:         v.boolean(),
    sortOrder:      v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const oldCategory = await ctx.db.get(args.id);
    if (!oldCategory) throw new Error("Category not found");

    // Clean up old image if it was replaced
    if (oldCategory.imageStorageId !== args.imageStorageId) {
      await ctx.storage.delete(oldCategory.imageStorageId);
    }

    await ctx.db.patch(args.id, {
      name:           args.name,
      slug:           args.slug,
      imageStorageId: args.imageStorageId,
      active:         args.active,
      sortOrder:      args.sortOrder,
    });
    return args.id;
  },
});

/**
 * Toggle category active status.
 * Admin-only mutation.
 */
export const toggleCategory = mutation({
  args: {
    id:     v.id("categories"),
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
 * Delete a category.
 * Admin-only mutation.
 */
export const deleteCategory = mutation({
  args: {
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error("Category not found");

    // Clean up associated image from storage
    await ctx.storage.delete(category.imageStorageId);
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});
