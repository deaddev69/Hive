// convex/categories.ts
// Queries and mutations to manage product discovery categories.

import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getPublicUrl } from "./media/api";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { validateUploadedFile } from "./lib/uploads";
import { ImageAsset, VerticalTypeValidator } from "./schema";

// ─── HIERARCHY INVARIANTS ───────────────────────────────────────────────────
//
// The tree is deliberately capped at two levels: a top-level category and its
// children. Everything downstream assumes that shape — the seller picker offers
// "parent, then subcategory", the storefront groups a parent with its children,
// and getCatalogPage walks descendants on every parent-level browse. Allowing a
// third level would silently change all three.

const MAX_CATEGORY_DEPTH = 2;

/**
 * A slug is the category's public URL and the only key the storefront resolves
 * against. Two categories sharing one would make which of them a link opens a
 * matter of insertion order.
 */
async function assertSlugAvailable(
  ctx: { db: any },
  slug: string,
  exceptId?: Id<"categories">
) {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) throw new Error("Slug is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
    throw new Error(
      `Invalid slug "${slug}". Use lowercase letters, numbers and single hyphens, e.g. "party-wear".`
    );
  }
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q: any) => q.eq("slug", trimmed))
    .first();
  if (existing && existing._id !== exceptId) {
    throw new Error(
      `The slug "${trimmed}" is already used by the category "${existing.name}". Slugs must be unique.`
    );
  }
  return trimmed;
}

/**
 * Validates a proposed parent for `childId` (undefined when creating).
 *
 * Rejects self-parenting, cycles, parents that are themselves children (which
 * would create a third level), and — when the category already has children of
 * its own — any attempt to demote it under another parent.
 */
async function assertValidParent(
  ctx: { db: any },
  parentId: Id<"categories"> | undefined,
  childId?: Id<"categories">
) {
  if (!parentId) return;

  if (childId && parentId === childId) {
    throw new Error("A category cannot be its own parent.");
  }

  const parent = await ctx.db.get(parentId);
  if (!parent) throw new Error("The selected parent category no longer exists.");

  if (parent.parentId) {
    throw new Error(
      `"${parent.name}" is already a subcategory of another category. Categories nest at most ${MAX_CATEGORY_DEPTH} levels deep.`
    );
  }

  if (childId) {
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q: any) => q.eq("parentId", childId))
      .collect();
    if (children.length > 0) {
      throw new Error(
        `This category has ${children.length} subcategor${children.length === 1 ? "y" : "ies"} of its own, so it cannot become a subcategory. Move or reassign its children first.`
      );
    }
  }
}

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
    isFreeSize:     v.optional(v.boolean()),
    seoIntro:       v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    verticalType:   v.optional(VerticalTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const slug = await assertSlugAvailable(ctx, args.slug);
    await assertValidParent(ctx, args.parentId);

    if (args.imageStorageId && typeof args.imageStorageId === "string" && !args.imageStorageId.startsWith("http")) {
      // Validate category image (max 5MB, MIME: jpeg/png/webp) (legacy storage IDs only)
      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
      const maxImageBytes = 5 * 1024 * 1024;
      await validateUploadedFile(ctx, args.imageStorageId as any, undefined, allowedImageMimes, maxImageBytes);
    }

    const categoryId = await ctx.db.insert("categories", {
      name:           args.name,
      slug,
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
      isFreeSize:     args.isFreeSize,
      seoIntro:       args.seoIntro,
      seoDescription: args.seoDescription,
      verticalType:   args.verticalType,
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
    isFreeSize:     v.optional(v.boolean()),
    seoIntro:       v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    verticalType:   v.optional(VerticalTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const slug = await assertSlugAvailable(ctx, args.slug, args.id);
    await assertValidParent(ctx, args.parentId, args.id);

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
      slug,
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
      isFreeSize:     args.isFreeSize,
      seoIntro:       args.seoIntro,
      seoDescription: args.seoDescription,
      verticalType:   args.verticalType,
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

    // Deleting a parent would leave its children pointing at a missing row.
    // getCatalogPage resolves descendants by parentId, so those children would
    // still browse and list but could never be reached from their parent again.
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .collect();
    if (children.length > 0) {
      throw new Error(
        `Cannot delete "${category.name}". ${children.length} subcategor${children.length === 1 ? "y belongs" : "ies belong"} to it: ${children.map((c) => c.name).join(", ")}. Move or delete those first.`
      );
    }

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
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});
