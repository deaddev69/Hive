// convex/products.ts
// Product CRUD and queries for the Boutique Portal and Customer App.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getMyBoutique, requireRole } from "./lib/auth";
import { Id } from "./_generated/dataModel";

// Helper to generate unique slugs
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const rand = Math.random().toString(36).substring(2, 6);
  return `${base}-${rand}`;
}

// Helper to enrich product with storage URLs and category/boutique names
async function enrichProduct(ctx: any, product: any) {
  const imageUrls = await Promise.all(
    product.images.map(async (imgId: string) => {
      if (!imgId) return "";
      // If the string starts with http, it is already a URL (e.g. legacy/mock URL)
      if (imgId.startsWith("http")) return imgId;
      try {
        const url = await ctx.storage.getUrl(imgId);
        return url || "";
      } catch {
        return imgId;
      }
    })
  );

  const category = await ctx.db.get(product.categoryId);
  const boutique = await ctx.db.get(product.boutiqueId);

  return {
    ...product,
    // Overwrite raw storage IDs with resolved https:// URLs
    images: imageUrls.filter(Boolean),
    imageUrl: imageUrls[0] || "", // Primary main image (convenience alias)
    imageUrls,                     // All images as URLs
    categoryName: category?.name || "Uncategorized",
    boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
    boutique: boutique ? {
      id: boutique._id,
      name: boutique.boutiqueName,
      city: "Hyderabad",
      rating: 4.8,
      reviewCount: 25,
      verified: boutique.status === "APPROVED",
      sameDayDelivery: product.sameDayEligible,
      latitude: boutique.latitude,
      longitude: boutique.longitude,
      deliveryRadiusKm: boutique.deliveryRadiusKm,
    } : null,
  };
}

/**
 * Generate a short-lived upload URL for boutique product images.
 */
export const generateBoutiqueUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Requires boutique owner permissions
    await getMyBoutique(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new product.
 */
export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    price: v.number(),
    discountPrice: v.optional(v.number()),
    images: v.array(v.string()), // Storage IDs or URLs
    sizes: v.array(v.string()),
    stockBySize: v.record(v.string(), v.number()),
    sameDayEligible: v.boolean(),
    featured: v.boolean(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const slug = generateSlug(args.name);
    const now = Date.now();

    const productId = await ctx.db.insert("products", {
      boutiqueId: boutique._id,
      name: args.name,
      slug,
      description: args.description,
      categoryId: args.categoryId,
      price: args.price,
      discountPrice: args.discountPrice,
      images: args.images,
      sizes: args.sizes,
      stockBySize: args.stockBySize,
      sameDayEligible: args.sameDayEligible,
      featured: args.featured,
      active: args.active,
      createdAt: now,
      updatedAt: now,
    });

    return productId;
  },
});

/**
 * Update an existing product.
 */
export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    description: v.string(),
    categoryId: v.id("categories"),
    price: v.number(),
    discountPrice: v.optional(v.number()),
    images: v.array(v.string()),
    sizes: v.array(v.string()),
    stockBySize: v.record(v.string(), v.number()),
    sameDayEligible: v.boolean(),
    featured: v.boolean(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const product = await ctx.db.get(args.id);
    if (!product || product.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized: Product does not belong to your boutique.");
    }

    // Clean up replaced images from storage if necessary
    const removedImages = product.images.filter(img => !args.images.includes(img));
    for (const imgId of removedImages) {
      if (!imgId.startsWith("http")) {
        try {
          await ctx.storage.delete(imgId);
        } catch (e) {
          console.error("Failed to delete storage file:", imgId, e);
        }
      }
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      price: args.price,
      discountPrice: args.discountPrice,
      images: args.images,
      sizes: args.sizes,
      stockBySize: args.stockBySize,
      sameDayEligible: args.sameDayEligible,
      featured: args.featured,
      active: args.active,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Delete a product.
 */
export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const product = await ctx.db.get(args.id);
    if (!product || product.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized: Product does not belong to your boutique.");
    }

    // Clean up all images from storage
    for (const imgId of product.images) {
      if (imgId && !imgId.startsWith("http")) {
        try {
          await ctx.storage.delete(imgId);
        } catch (e) {
          console.error("Failed to delete image storage:", imgId, e);
        }
      }
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

/**
 * Toggle active status of a product.
 */
export const toggleProductStatus = mutation({
  args: { id: v.id("products"), active: v.boolean() },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const product = await ctx.db.get(args.id);
    if (!product || product.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      active: args.active,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

/**
 * Fetch all products for the logged-in boutique.
 */
export const getBoutiqueProducts = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .order("desc")
      .collect();

    return Promise.all(products.map(p => enrichProduct(ctx, p)));
  },
});

/**
 * Fetch a single product details by either ID or slug.
 */
export const getProduct = query({
  args: {
    id: v.optional(v.id("products")),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let product = null;
    if (args.id) {
      product = await ctx.db.get(args.id);
    } else if (args.slug) {
      const slug = args.slug;
      product = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
    }

    if (!product) return null;
    return await enrichProduct(ctx, product);
  },
});

// Helper for Haversine distance
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Public query to fetch products matching filters (for Customer App).
 * Supports multi-category, price range, and location-based delivery radius filtering.
 */
export const getActiveProducts = query({
  args: {
    categoryIds: v.optional(v.array(v.id("categories"))),
    featuredOnly: v.optional(v.boolean()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    let filtered = products;

    // Category filter — multi-select, applied at query level
    if (args.categoryIds && args.categoryIds.length > 0) {
      const catSet = new Set(args.categoryIds);
      filtered = filtered.filter(p => catSet.has(p.categoryId));
    }

    // Featured filter
    if (args.featuredOnly) {
      filtered = filtered.filter(p => p.featured === true);
    }

    // Price range filter
    if (args.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= args.maxPrice!);
    }

    // Location-based delivery radius filter
    if (args.userLat !== undefined && args.userLng !== undefined) {
      const boutiques = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .collect();

      const deliverableBoutiqueIds = new Set(
        boutiques
          .filter((b) => {
            const dist = calculateDistanceKm(args.userLat!, args.userLng!, b.latitude, b.longitude);
            return dist <= b.deliveryRadiusKm;
          })
          .map((b) => b._id)
      );

      filtered = filtered.filter(p => deliverableBoutiqueIds.has(p.boutiqueId));
    }

    return Promise.all(filtered.map(p => enrichProduct(ctx, p)));
  },
});

/**
 * Update stock levels for a product.
 */
export const updateInventory = mutation({
  args: {
    productId: v.id("products"),
    stockBySize: v.record(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || product.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.productId, {
      stockBySize: args.stockBySize,
      updatedAt: Date.now(),
    });
    return args.productId;
  },
});

/**
 * Fetch dashboard metrics for the logged-in boutique.
 */
export const getDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx);

    const products = await ctx.db
      .query("products")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .collect();

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .collect();

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.active).length;

    const pendingOrders = orders.filter(o =>
      o.status === "pending_confirmation" || o.status === "confirmed"
    ).length;

    const completedOrders = orders.filter(o => o.status === "delivered").length;

    // Sum revenue from delivered orders (stored in rupees)
    const rawRevenue = orders
      .filter(o => o.status === "delivered" || o.paymentStatus === "paid")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const revenue = rawRevenue;

    // Get recent 5 orders enriched with details
    const recentOrdersRaw = [...orders]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const recentOrders = await Promise.all(
      recentOrdersRaw.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        return {
          ...order,
          items,
        };
      })
    );

    // Get recent 5 products
    const recentProductsRaw = [...products]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const recentProducts = await Promise.all(
      recentProductsRaw.map(p => enrichProduct(ctx, p))
    );

    return {
      totalProducts,
      activeProducts,
      pendingOrders,
      completedOrders,
      revenue,
      recentOrders,
      recentProducts,
    };
  },
});

/**
 * Public query to search products matching a term and user location range (optional).
 */
export const searchProducts = query({
  args: {
    searchTerm: v.string(),
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase().trim();
    if (!term) {
      return { products: [], totalMatchedCount: 0 };
    }

    // Fetch active products
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Fetch categories and boutiques for matching
    const categories = await ctx.db.query("categories").collect();
    const categoriesMap = new Map(categories.map(c => [c._id, c]));

    const boutiques = await ctx.db.query("boutiques").collect();
    const boutiquesMap = new Map(boutiques.map(b => [b._id, b]));

    // Match criteria (case-insensitive)
    let matched = products.filter((p) => {
      const category = categoriesMap.get(p.categoryId);
      const boutique = boutiquesMap.get(p.boutiqueId);

      const nameMatch = p.name.toLowerCase().includes(term);
      const descMatch = p.description.toLowerCase().includes(term);
      const catMatch = category?.name.toLowerCase().includes(term) || false;
      const boutiqueMatch = boutique?.boutiqueName.toLowerCase().includes(term) || false;

      // Handle optional tags (array of strings) if present on the record
      const tags = (p as any).tags;
      const tagsMatch = Array.isArray(tags) && tags.some((tag: string) => tag.toLowerCase().includes(term));

      return nameMatch || descMatch || catMatch || boutiqueMatch || tagsMatch;
    });

    const totalMatchedCount = matched.length;

    // Filter by location if coordinates are provided
    if (args.userLat !== undefined && args.userLng !== undefined) {
      const deliverableBoutiqueIds = new Set(
        boutiques
          .filter((b) => {
            const bLat = b.latitude;
            const bLng = b.longitude;
            if (bLat === undefined || bLng === undefined) return false;
            const dist = calculateDistanceKm(args.userLat!, args.userLng!, bLat, bLng);
            return dist <= b.deliveryRadiusKm;
          })
          .map((b) => b._id)
      );

      matched = matched.filter((p) => deliverableBoutiqueIds.has(p.boutiqueId));
    }

    const enriched = await Promise.all(matched.map(p => enrichProduct(ctx, p)));

    return {
      products: enriched,
      totalMatchedCount,
    };
  },
});

