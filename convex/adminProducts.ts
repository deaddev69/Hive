// convex/adminProducts.ts
// Admin-only product moderation query and mutation APIs.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { updateBoutiqueProductCount } from "./boutiques";
import { getPublicUrl } from "./media/api";

/**
 * Quality Score helper function.
 * Calculates score from 6 key listing completeness signals:
 * Photos (16.6%), Description length (16.6%), Price (16.6%), Category (16.6%), Inventory presence (16.6%), Size chart (17%)
 */
export function computeQualityChecks(product: any, categoryName: string) {
  const totalStock = Object.values(product.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
  
  const checks = {
    photos: product.images && product.images.length >= 3,
    description: product.description && product.description.trim().length > 50,
    price: product.price && product.price > 0,
    category: product.categoryId !== undefined,
    inventory: product.sizes && product.sizes.length >= 1 && totalStock > 0,
    sizingChart: true,
  };

  // clothing category check
  const isClothingCategory = ["lehengas", "kurtis", "suits", "salwar suits"].includes(categoryName.toLowerCase());
  if (isClothingCategory) {
    if (!product.measurementMatrix || !Array.isArray(product.measurementMatrix) || product.measurementMatrix.length === 0) {
      checks.sizingChart = false;
    } else {
      // Check that every size in product.sizes has a non-empty chest, waist, shoulder, length
      for (const size of product.sizes) {
        const entry = product.measurementMatrix.find((m: any) => m.size === size);
        if (!entry || !entry.chest?.trim() || !entry.waist?.trim() || !entry.shoulder?.trim() || !entry.length?.trim()) {
          checks.sizingChart = false;
          break;
        }
      }
    }
  }

  let scoreSum = 0;
  scoreSum += checks.photos ? 16.6 : 0;
  scoreSum += checks.description ? 16.6 : 0;
  scoreSum += checks.price ? 16.6 : 0;
  scoreSum += checks.category ? 16.6 : 0;
  scoreSum += checks.inventory ? 16.6 : 0;
  scoreSum += checks.sizingChart ? 17 : 0;

  const qualityScore = Math.max(0, Math.min(100, Math.round(scoreSum)));

  return { qualityScore, qualityChecks: checks };
}

/**
 * Fetch all products with admin filters (search, boutique, status, sandbox filtering) and rich metrics.
 */
export const getAdminProducts = query({
  args: {
    searchTerm: v.optional(v.string()),
    boutiqueId: v.optional(v.id("boutiques")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("out_of_stock"),
      v.literal("recently_created"),
      v.literal("moderated"),
      v.literal("needs_review"),
      v.literal("pending_approval")
    )),
    excludeTestData: v.optional(v.boolean()),
    sortBy: v.optional(v.union(
      v.literal("lowest_quality"),
      v.literal("highest_claims"),
      v.literal("highest_revenue"),
      v.literal("highest_risk"),
      v.literal("recently_uploaded")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const limit = args.limit ?? 50;

    let products;
    if (args.status === "moderated") {
      products = await ctx.db
        .query("products")
        .withIndex("by_adminHidden", (q) => q.eq("adminHidden", true))
        .take(limit);
    } else if (args.boutiqueId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId!))
        .take(limit);
    } else {
      products = await ctx.db
        .query("products")
        .order("desc")
        .take(limit);
    }

    // 1. Load boutiques maps for sandbox checking and trust tiers
    const boutiqueIds = Array.from(new Set(products.map(p => p.boutiqueId)));
    const boutiques = await Promise.all(boutiqueIds.map(id => ctx.db.get(id)));
    const boutiqueMap = new Map(boutiques.filter(Boolean).map(b => [b!._id, b]));

    // Isolate Sandbox/test data
    const excludeTestData = args.excludeTestData ?? true;
    if (excludeTestData) {
      products = products.filter(p => {
        const b = boutiqueMap.get(p.boutiqueId);
        return b?.isSandbox !== true && b?.isTestData !== true;
      });
    }

    // 2. Load categories and performance metrics in batch
    const categoryIds = Array.from(new Set(products.map(p => p.categoryId)));
    const categories = await Promise.all(categoryIds.map(id => ctx.db.get(id)));
    const categoryMap = new Map(categories.filter(Boolean).map(c => [c!._id, c]));

    const performanceRows = await Promise.all(
      products.map(p =>
        ctx.db
          .query("productPerformance")
          .withIndex("by_productId", (q: any) => q.eq("productId", p._id))
          .first()
      )
    );
    const performanceMap = new Map(performanceRows.filter(Boolean).map(r => [r!.productId, r]));

    // 3. Enrich products
    let enriched = [];
    for (const p of products) {
      const resolvedImages = await Promise.all(
        p.images.map(async (imgId: any) => {
          if (!imgId) return "";
          if (typeof imgId !== "string") {
            return getPublicUrl(imgId, "pdp");
          }
          if (imgId.startsWith("http")) return imgId;
          try {
            const url = await ctx.storage.getUrl(imgId as any);
            return url || "";
          } catch {
            return imgId;
          }
        })
      );
      const imageUrl = resolvedImages[0] || "";
      const imageUrls = resolvedImages.filter(Boolean);

      const category = categoryMap.get(p.categoryId);
      const categoryName = category?.name || "Uncategorized";
      const boutique = boutiqueMap.get(p.boutiqueId);

      // Performance Stats
      const perf = performanceMap.get(p._id);
      const salesRevenue = perf?.salesRevenue ?? 0;
      const orderCount = perf?.orderCount ?? 0;
      const claimCount = perf?.claimCount ?? 0;
      const approvedClaimCount = perf?.approvedClaimCount ?? 0;
      const lastSoldAt = perf?.lastSoldAt;
      const statsPending = !perf;

      // Quality score
      const { qualityScore, qualityChecks } = computeQualityChecks(p, categoryName);

      // Merchant tier
      const merchantTier = boutique?.merchantTier || "Bronze";
      let trustTier = "Bronze 🥉";
      if (merchantTier === "Elite") trustTier = "Elite 👑";
      else if (merchantTier === "Gold") trustTier = "Gold 🥇";
      else if (merchantTier === "Silver") trustTier = "Silver 🥈";

      // Needs review flag
      const totalStock = Object.values(p.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
      const needsReview = qualityScore < 100 || totalStock < 5 || claimCount > 0 || p.adminHidden === true;

      // Risk score: claimScore + qualityPenalty + stockPenalty + revenueImpact
      const claimScore = claimCount * 40;
      const qualityPenalty = 100 - qualityScore;
      const stockPenalty = totalStock === 0 ? 100 : totalStock === 1 ? 50 : totalStock < 5 ? 20 : 0;
      const revenueImpact = Math.min(50, Math.floor(salesRevenue / 500000)); // Threshold of ₹5000 (500,000 paise)
      const riskScore = claimScore + qualityPenalty + stockPenalty + revenueImpact;

      enriched.push({
        ...p,
        images: imageUrls,
        imageUrl,
        imageUrls,
        categoryName,
        boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
        salesRevenue,
        orderCount,
        claimCount,
        approvedClaimCount,
        lastSoldAt,
        statsPending,
        qualityScore,
        qualityChecks,
        trustTier,
        needsReview,
        riskScore,
        totalStock,
        approvalStatus: p.approvalStatus,
        approvalNotes: p.approvalNotes,
        lastModeratedAt: p.lastModeratedAt,
      });
    }

    // 4. Apply filters
    if (args.boutiqueId) {
      enriched = enriched.filter(p => p.boutiqueId.toString() === args.boutiqueId!.toString());
    }

    if (args.status) {
      if (args.status === "active") {
        enriched = enriched.filter(p => p.active === true && p.adminHidden !== true);
      } else if (args.status === "inactive") {
        enriched = enriched.filter(p => p.active === false && p.adminHidden !== true);
      } else if (args.status === "out_of_stock") {
        enriched = enriched.filter(p => p.totalStock === 0);
      } else if (args.status === "recently_created") {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        enriched = enriched.filter(p => p.createdAt >= sevenDaysAgo);
      } else if (args.status === "moderated") {
        enriched = enriched.filter(p => p.adminHidden === true);
      } else if (args.status === "needs_review") {
        enriched = enriched.filter(p => p.needsReview === true);
      } else if (args.status === "pending_approval") {
        enriched = enriched.filter(p => p.approvalStatus === "pending");
      }
    }

    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase().trim();
      enriched = enriched.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term)
      );
    }

    // 5. Apply sorting
    const sortBy = args.sortBy || "recently_uploaded";
    if (sortBy === "lowest_quality") {
      enriched.sort((a, b) => a.qualityScore - b.qualityScore);
    } else if (sortBy === "highest_claims") {
      enriched.sort((a, b) => b.claimCount - a.claimCount);
    } else if (sortBy === "highest_revenue") {
      enriched.sort((a, b) => b.salesRevenue - a.salesRevenue);
    } else if (sortBy === "highest_risk") {
      enriched.sort((a, b) => b.riskScore - a.riskScore);
    } else {
      enriched.sort((a, b) => b.createdAt - a.createdAt);
    }

    return enriched;
  },
});

/**
 * Catalog Control Tower Dashboard KPI Metrics.
 * Returns overall clamped Catalog Health Score, Revenue at Risk (paise), and Failing Quality Gate Count.
 */
export const getCatalogDashboardMetricsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // TODO: Maintain a counter or table of active counts to avoid full scan for allProducts/orders
    const allProducts = await ctx.db.query("products").withIndex("by_active", q => q.eq("active", true)).collect();
    const categories = await ctx.db.query("categories").withIndex("by_active_and_sortOrder", q => q.eq("active", true)).collect();
    const categoryMap = new Map(categories.map(c => [c._id, c]));

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", thirtyDaysAgo))
      .collect();
    const activeClaimsStatuses = ["submitted", "under_review", "evidence_requested", "refund_approved", "refunded", "return_received"];
    const activeClaimsLists = await Promise.all(
      activeClaimsStatuses.map(status =>
        ctx.db.query("claims").withIndex("by_status", q => q.eq("status", status as any)).collect()
      )
    );
    const activeClaims = activeClaimsLists.flat();

    let totalQualityScore = 0;
    let activeProductCount = 0;
    const totalProductsCount = allProducts.length || 1;
    const moderatedProductsCount = allProducts.filter(p => p.adminHidden === true).length;

    for (const p of allProducts) {
      const category = categoryMap.get(p.categoryId);
      const categoryName = category?.name || "Uncategorized";
      const { qualityScore } = computeQualityChecks(p, categoryName);

      if (p.active && !p.adminHidden) {
        totalQualityScore += qualityScore;
        activeProductCount++;
      }
    }

    const averageQuality = activeProductCount > 0 ? (totalQualityScore / activeProductCount) : 100;
    const disputeRate = (activeClaims.length / Math.max(1, orders.length)) * 100; // in percent
    const moderatedRatio = (moderatedProductsCount / totalProductsCount) * 100; // in percent

    // averageQuality - (disputeRate * 5) - (moderatedRatio * 50)
    const rawScore = averageQuality - (disputeRate * 5) - (moderatedRatio * 50);
    const catalogHealthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Revenue at Risk (Delivered or Paid in last 30 days from inactive/moderated/quality < 60 products)
    const recentOrders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt", q => q.gte("createdAt", thirtyDaysAgo))
      .collect();

    const recentOrdersFiltered = recentOrders.filter(
      (o) => o.status === "delivered" || o.paymentStatus === "paid"
    );

    let revenueAtRisk = 0;
    for (const order of recentOrdersFiltered) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q: any) => q.eq("orderId", order._id))
        .collect();

      for (const item of orderItems) {
        const product = await ctx.db.get(item.productId);
        if (!product) continue;

        const category = categoryMap.get(product.categoryId);
        const categoryName = category?.name || "Uncategorized";
        const { qualityScore } = computeQualityChecks(product, categoryName);

        const isAtRisk = !product.active || product.adminHidden === true || qualityScore < 60;
        if (isAtRisk) {
          revenueAtRisk += item.subtotal || (item.priceAtPurchase * item.quantity);
        }
      }
    }

    // Failing Quality Gate Count (active non-hidden products with qualityScore < 100)
    let failingQualityGateCount = 0;
    for (const p of allProducts) {
      if (p.active && !p.adminHidden) {
        const category = categoryMap.get(p.categoryId);
        const categoryName = category?.name || "Uncategorized";
        const { qualityScore } = computeQualityChecks(p, categoryName);
        if (qualityScore < 100) {
          failingQualityGateCount++;
        }
      }
    }

    return {
      catalogHealthScore,
      revenueAtRisk,
      failingQualityGateCount,
    };
  },
});


/**
 * Deactivate a product from admin console with a logged reason.
 */
export const deactivateProductAdmin = mutation({
  args: {
    productId: v.id("products"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    
    if (args.reason.trim().length < 10) {
      throw new Error("Administrative reason must be at least 10 characters long.");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const now = Date.now();
    await ctx.db.patch(args.productId, {
      active: false,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: "product.deactivated_admin",
      entityType: "products",
      entityId: args.productId,
      metadata: JSON.stringify({
        reason: args.reason,
        productName: product.name,
      }),
      createdAt: now,
    });

    await updateBoutiqueProductCount(ctx, product.boutiqueId);

    return args.productId;
  },
});

/**
 * Reactivate a product from admin console with verification.
 */
export const reactivateProductAdmin = mutation({
  args: {
    productId: v.id("products"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");

    if (args.reason.trim().length < 10) {
      throw new Error("Administrative reason must be at least 10 characters long.");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Guard reactivation against stock === 0
    const totalStock = Object.values(product.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
    if (totalStock === 0) {
      throw new Error("Cannot reactivate a product with zero stock.");
    }

    const now = Date.now();
    await ctx.db.patch(args.productId, {
      active: true,
      autoDeactivatedBecauseOutOfStock: false,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: "product.reactivated_admin",
      entityType: "products",
      entityId: args.productId,
      metadata: JSON.stringify({
        reason: args.reason,
        productName: product.name,
      }),
      createdAt: now,
    });

    await updateBoutiqueProductCount(ctx, product.boutiqueId);

    return args.productId;
  },
});

/**
 * Toggle product adminHidden state (moderation status).
 */
export const toggleProductHiddenAdmin = mutation({
  args: {
    productId: v.id("products"),
    adminHidden: v.boolean(),
    moderationCategory: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const now = Date.now();
    const reasonText = args.reason?.trim() || "";

    if (args.adminHidden) {
      if (!args.moderationCategory) {
        throw new Error("Moderation category is required to hide a product.");
      }
      if (reasonText.length < 10) {
        throw new Error("Administrative reason of at least 10 characters is required to hide a product.");
      }

      await ctx.db.patch(args.productId, {
        adminHidden: true,
        moderationCategory: args.moderationCategory,
        adminHiddenReason: reasonText,
        adminHiddenAt: now,
        adminHiddenBy: adminUser._id,
        updatedAt: now,
      });
    } else {
      if (reasonText.length < 10) {
        throw new Error("Administrative reason of at least 10 characters is required to lift moderation.");
      }

      await ctx.db.patch(args.productId, {
        adminHidden: false,
        moderationCategory: undefined,
        adminHiddenReason: undefined,
        adminHiddenAt: undefined,
        adminHiddenBy: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      actorId: adminUser._id,
      actorRole: "admin",
      action: args.adminHidden ? "product.moderated" : "product.unmoderated",
      entityType: "products",
      entityId: args.productId,
      metadata: JSON.stringify({
        reason: reasonText,
        category: args.moderationCategory,
        productName: product.name,
      }),
      createdAt: now,
    });

    await updateBoutiqueProductCount(ctx, product.boutiqueId);

    return args.productId;
  },
});

/**
 * Retrieve the moderation history of a specific product from audit logs.
 */
export const getProductModerationHistory = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_entityType_entityId", (q) =>
        q.eq("entityType", "products").eq("entityId", args.productId)
      )
      .collect();

    // Filter to moderation/activation actions
    const moderationActions = [
      "product.moderated",
      "product.unmoderated",
      "product.deactivated_admin",
      "product.reactivated_admin",
    ];

    const filteredLogs = logs.filter((log) => moderationActions.includes(log.action));

    // Sort by createdAt descending (newest first)
    filteredLogs.sort((a, b) => b.createdAt - a.createdAt);

    // Enrich with actor email
    return await Promise.all(
      filteredLogs.map(async (log) => {
        let actorEmail = "System";
        if (log.actorId) {
          const user = await ctx.db.get(log.actorId);
          if (user) {
            actorEmail = user.email || "No Email";
          }
        }
        return {
          ...log,
          actorEmail,
        };
      })
    );
  },
});

/**
 * Approve a product listing.
 * Admin-only mutation.
 */
export const approveProductAdmin = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      approvalStatus: "approved",
      approvedAt: now,
      approvedBy: admin._id,
      lastModeratedAt: now,
      approvalNotes: undefined, // Clear feedback notes
    });

    // Write system audit logs
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "product.approve",
      entityType: "products",
      entityId: args.id,
      metadata: JSON.stringify({
        name: product.name,
        boutiqueId: product.boutiqueId,
      }),
      createdAt: now,
    });

    await updateBoutiqueProductCount(ctx, product.boutiqueId);

    return args.id;
  },
});

/**
 * Request changes for a product listing.
 * Admin-only mutation.
 */
export const requestChangesProductAdmin = mutation({
  args: { id: v.id("products"), notes: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    // Enforce safety guard: require meaningful notes of at least 10 characters
    if (args.notes.trim().length < 10) {
      throw new Error("Safety Guard: Please provide a meaningful note of at least 10 characters detailing the requested changes.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      approvalStatus: "changes_requested",
      approvalNotes: args.notes.trim(),
      lastModeratedAt: now,
    });

    // Write system audit logs
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "product.request_changes",
      entityType: "products",
      entityId: args.id,
      metadata: JSON.stringify({
        name: product.name,
        boutiqueId: product.boutiqueId,
        notes: args.notes.trim(),
      }),
      createdAt: now,
    });

    await updateBoutiqueProductCount(ctx, product.boutiqueId);

    return args.id;
  },
});
