import { mutation } from "./_generated/server";
import { requireRole } from "./lib/auth";

/**
 * Migration to backfill the productPerformance table for all historical orders and claims.
 * Keeps convex queries strictly read-only and aggregates all stats safely in O(1) fields.
 */
export const backfillProductPerformance = mutation({
  args: {},
  handler: async (ctx) => {
    // If run from client, enforce admin check. Bypassed for Convex CLI run command.
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const products = await ctx.db.query("products").collect();
    const allClaims = await ctx.db.query("claims").collect();
    
    // Group claims by orderItemId for efficient O(N) access
    const claimsByOrderItemId = new Map<string, any[]>();
    for (const claim of allClaims) {
      const list = claimsByOrderItemId.get(claim.orderItemId) || [];
      list.push(claim);
      claimsByOrderItemId.set(claim.orderItemId, list);
    }

    let backfilledCount = 0;
    for (const product of products) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .collect();

      let salesRevenue = 0;
      let orderCount = 0;
      let claimCount = 0;
      let approvedClaimCount = 0;
      let lastSoldAt: number | undefined = undefined;

      for (const item of orderItems) {
        const order = await ctx.db.get(item.orderId);
        if (!order) continue;

        let shipmentDelivered = false;
        if (order.shipmentId) {
          const shipment = await ctx.db.get(order.shipmentId);
          if (shipment && shipment.status === "delivered") {
            shipmentDelivered = true;
          }
        }

        const isDelivered = order.status === "delivered" || shipmentDelivered;

        if (isDelivered) {
          salesRevenue += item.subtotal || (item.priceAtPurchase * item.quantity);
          orderCount += item.quantity;
          
          const soldTime = order.deliveredAt || order.updatedAt || order.createdAt;
          if (lastSoldAt === undefined || soldTime > lastSoldAt) {
            lastSoldAt = soldTime;
          }
        }

        const itemClaims = claimsByOrderItemId.get(item._id) || [];
        for (const claim of itemClaims) {
          claimCount++;
          if (claim.status === "refund_approved" || claim.status === "refunded") {
            approvedClaimCount++;
          }
        }
      }

      const existing = await ctx.db
        .query("productPerformance")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          salesRevenue,
          orderCount,
          claimCount,
          approvedClaimCount,
          lastSoldAt,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("productPerformance", {
          productId: product._id,
          boutiqueId: product.boutiqueId,
          salesRevenue,
          orderCount,
          claimCount,
          approvedClaimCount,
          lastSoldAt,
          updatedAt: Date.now(),
        });
      }
      backfilledCount++;
    }

    return { success: true, backfilledCount };
  },
});

/**
 * Migration to backfill merchantTier to 'Bronze' and approvalStatus to 'approved' for legacy records.
 */
export const backfillListingApprovalFields = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const boutiques = await ctx.db.query("boutiques").collect();
    let boutiqueCount = 0;
    for (const b of boutiques) {
      if (!b.merchantTier) {
        await ctx.db.patch(b._id, {
          merchantTier: "Bronze",
        });
        boutiqueCount++;
      }
    }

    const products = await ctx.db.query("products").collect();
    let productCount = 0;
    for (const p of products) {
      if (!p.approvalStatus) {
        await ctx.db.patch(p._id, {
          approvalStatus: "approved",
        });
        productCount++;
      }
    }

    return { success: true, boutiqueCount, productCount };
  }
});

/**
 * Migration to backfill the slug field for all approved boutiques that lack one.
 * Uses a basic slugify function based on the boutiqueName.
 */
export const backfillBoutiqueSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const boutiques = await ctx.db.query("boutiques").collect();
    let backfilledCount = 0;

    for (const b of boutiques) {
      if (!b.slug) {
        // Basic slugify
        let baseSlug = b.boutiqueName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        if (!baseSlug) {
          baseSlug = `shop-${b._id.slice(-6)}`;
        }

        // Handle collisions (just in case)
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (true) {
          const existing = await ctx.db
            .query("boutiques")
            .filter((q) => q.eq(q.field("slug"), uniqueSlug))
            .first();
          if (!existing) break;
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        await ctx.db.patch(b._id, { slug: uniqueSlug });
        backfilledCount++;
      }
    }

    return `Backfilled slugs for ${backfilledCount} boutiques.`;
  }
});

/**
 * Phase 1 Migration: Set basePrice and bump customer price by 15%
 */
export const migrateProductPricesPhase1 = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    // 1. Migrate Products
    const products = await ctx.db.query("products").collect();
    let updatedProducts = 0;
    
    for (const product of products) {
      if (product.basePrice === undefined) {
        const basePrice = product.price; // Treat current price as basePrice
        const newCustomerPrice = Math.floor(basePrice * 1.15); // Add 15% markup
        
        await ctx.db.patch(product._id, {
          basePrice: basePrice,
          price: newCustomerPrice,
        });
        updatedProducts++;
      }
    }

    // 2. Migrate Product Variants
    const variants = await ctx.db.query("productVariants").collect();
    let updatedVariants = 0;
    
    for (const variant of variants) {
      if (variant.basePrice === undefined) {
        const basePrice = variant.price;
        const newCustomerPrice = Math.floor(basePrice * 1.15);
        
        await ctx.db.patch(variant._id, {
          basePrice: basePrice,
          price: newCustomerPrice,
        });
        updatedVariants++;
      }
    }

    return `Successfully migrated ${updatedProducts} products and ${updatedVariants} variants to the new pricing model.`;
  },
});
