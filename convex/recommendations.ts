// convex/recommendations.ts
// Product merchandising recommendations queries.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { enrichProducts } from "./products";
import { Id } from "./_generated/dataModel";

/**
 * Fetches matching items for a product to display in a "Complete the Look" section.
 */
export const getCompleteTheLook = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return [];

    const boutiqueId = product.boutiqueId;
    let productsToEnrich = [];

    const matchingIds = product.matchingProductIds || [];
    if (matchingIds.length > 0) {
      for (const id of matchingIds) {
        const p = await ctx.db.get(id);
        if (p && p.active && !p.adminHidden && p.boutiqueId === boutiqueId) {
          const stock = Object.values(p.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
          if (stock > 0) {
            productsToEnrich.push(p);
          }
        }
      }
    } else {
      // Fallback: fetch active products from the same boutique
      const sameBoutiqueProducts = await ctx.db
        .query("products")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutiqueId))
        .collect();

      productsToEnrich = sameBoutiqueProducts.filter((p) => {
        const stock = Object.values(p.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);
        return p.active && !p.adminHidden && p._id !== product._id && stock > 0;
      });
    }

    const enriched = await enrichProducts(ctx, productsToEnrich, false);

    // Sort matching items sequentially: Leggings -> Dupatta -> Jewellery -> Footwear / Sandals
    const categoryPriority = ["leggings", "dupatta", "jewellery", "footwear", "sandals"];
    const getPriorityIndex = (catName: string) => {
      const nameLower = catName.toLowerCase();
      const matchIdx = categoryPriority.findIndex((keyword) => nameLower.includes(keyword));
      return matchIdx !== -1 ? matchIdx : categoryPriority.length;
    };

    enriched.sort((a, b) => {
      const aIdx = getPriorityIndex(a.categoryName);
      const bIdx = getPriorityIndex(b.categoryName);
      return aIdx - bIdx;
    });

    return enriched;
  },
});

/**
 * Fetches up to 4 active, in-stock products from the same boutique, excluding the current product.
 */
export const getSameBoutiqueRecommendations = query({
  args: {
    boutiqueId: v.id("boutiques"),
    excludeProductId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    // Filter active, in-stock, and non-hidden products
    const filtered = products.filter((p) => {
      if (!p.active || p.adminHidden) return false;
      if (args.excludeProductId && p._id === args.excludeProductId) return false;
      
      // Stock check: total stock across sizes > 0
      const stock = p.stockBySize || {};
      const totalStock = Object.values(stock).reduce(
        (sum: number, val: any) => sum + (val || 0),
        0
      );
      return totalStock > 0;
    });

    // Limit to max 4 items
    const selected = filtered.slice(0, 4);

    return await enrichProducts(ctx, selected, false);
  },
});
