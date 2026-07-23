// convex/categories.ts
// Queries and mutations to manage product discovery categories.

import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getPublicUrl } from "./media/api";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { validateUploadedFile } from "./lib/uploads";
import { ImageAsset } from "./schema";

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
      categories.map(async (cat) => {
        let imageUrl = cat.imageUrl || null;
        if (cat.imageStorageId) {
          if (typeof cat.imageStorageId === "object") {
            imageUrl = getPublicUrl(cat.imageStorageId as any);
          } else if (typeof cat.imageStorageId === "string" && cat.imageStorageId.startsWith("http")) {
            imageUrl = cat.imageStorageId;
          } else {
            try {
              imageUrl = await ctx.storage.getUrl(cat.imageStorageId as any);
            } catch (e) {
              console.error("Failed to get url for storage id", cat.imageStorageId, e);
            }
          }
        }
        let homepageImageUrl = cat.homepageImage || null;
        if (cat.homepageImage && !cat.homepageImage.startsWith("http")) {
          try {
            homepageImageUrl = await ctx.storage.getUrl(cat.homepageImage as any);
          } catch (e) {
            console.error("Failed to get url for homepage image", cat.homepageImage, e);
          }
        }
        return {
          ...cat,
          imageUrl,
          homepageImageUrl,
        };
      })
    );
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
    imageStorageId: v.optional(v.union(v.id("_storage"), v.string(), ImageAsset)),
    imageUrl:       v.optional(v.string()),
    homepageImage:  v.optional(v.string()),
    homepageOrder:  v.optional(v.number()),
    icon:           v.optional(v.string()),
    active:         v.boolean(),
    sortOrder:      v.number(),
    featured:       v.optional(v.boolean()),
    showOnHomepage: v.optional(v.boolean()),
    parentId:       v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    if (args.imageStorageId && typeof args.imageStorageId === "string" && !args.imageStorageId.startsWith("http")) {
      // Validate category image (max 5MB, MIME: jpeg/png/webp) (legacy storage IDs only)
      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
      const maxImageBytes = 5 * 1024 * 1024;
      await validateUploadedFile(ctx, args.imageStorageId as any, undefined, allowedImageMimes, maxImageBytes);
    }

    const categoryId = await ctx.db.insert("categories", {
      name:           args.name,
      slug:           args.slug,
      imageStorageId: args.imageStorageId,
      imageUrl:       args.imageUrl,
      homepageImage:  args.homepageImage,
      homepageOrder:  args.homepageOrder,
      icon:           args.icon,
      active:         args.active,
      sortOrder:      args.sortOrder,
      featured:       args.featured,
      showOnHomepage: args.showOnHomepage,
      parentId:       args.parentId,
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
    imageStorageId: v.optional(v.union(v.id("_storage"), v.string(), ImageAsset)),
    imageUrl:       v.optional(v.string()),
    homepageImage:  v.optional(v.string()),
    homepageOrder:  v.optional(v.number()),
    icon:           v.optional(v.string()),
    active:         v.boolean(),
    sortOrder:      v.number(),
    featured:       v.optional(v.boolean()),
    showOnHomepage: v.optional(v.boolean()),
    parentId:       v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    if (args.imageStorageId && typeof args.imageStorageId === "string" && !args.imageStorageId.startsWith("http")) {
      // Validate new category image if changed (legacy storage IDs only)
      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
      const maxImageBytes = 5 * 1024 * 1024;
      await validateUploadedFile(ctx, args.imageStorageId as any, undefined, allowedImageMimes, maxImageBytes);
    }

    const oldCategory = await ctx.db.get(args.id);
    if (!oldCategory) throw new Error("Category not found");

    // Clean up old image if it was replaced and it's a native storage ID
    if (args.imageStorageId && oldCategory.imageStorageId && oldCategory.imageStorageId !== args.imageStorageId) {
      if (typeof oldCategory.imageStorageId === "string" && !oldCategory.imageStorageId.startsWith("http")) {
        try {
          await ctx.storage.delete(oldCategory.imageStorageId as any);
        } catch (e) {
          console.warn(`Failed to delete old storage id ${oldCategory.imageStorageId}`, e);
        }
      }
    }

    await ctx.db.patch(args.id, {
      name:           args.name,
      slug:           args.slug,
      imageStorageId: args.imageStorageId,
      imageUrl:       args.imageUrl,
      homepageImage:  args.homepageImage,
      homepageOrder:  args.homepageOrder,
      icon:           args.icon,
      active:         args.active,
      sortOrder:      args.sortOrder,
      featured:       args.featured,
      showOnHomepage: args.showOnHomepage,
      parentId:       args.parentId,
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
    const adminUser = await requireRole(ctx, "admin");
    
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error("Category not found");

    // Check if there are products in this category
    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .collect();

    if (products.length > 0) {
      const activeCount = products.filter(p => p.active).length;
      const totalCount = products.length;
      throw new Error(
        `Cannot delete category. ${totalCount} products currently belong to this category (${activeCount} active). Move or delete those products first.`
      );
    }

    // Clean up associated image from storage if native
    if (category.imageStorageId && typeof category.imageStorageId === "string" && !category.imageStorageId.startsWith("http")) {
      try {
        await ctx.storage.delete(category.imageStorageId as any);
      } catch (e) {
        console.warn(`Failed to delete storage id ${category.imageStorageId}, it may have already been deleted.`, e);
      }
    }
    
    await ctx.db.delete(args.id);

    // Log category deletion
    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: "category.deleted",
      entityType: "categories",
      entityId: args.id,
      before: JSON.stringify(category),
      metadata: JSON.stringify({
        name: category.name,
        slug: category.slug,
      }),
      createdAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Fetch a single category by its slug.
 */
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
  },
});
