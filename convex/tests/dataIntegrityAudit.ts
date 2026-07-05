// convex/tests/dataIntegrityAudit.ts
// Permanent diagnostic query for auditing rupee/paise conversions and order-snapshot consistency.

import { internalQuery, query } from "../_generated/server";
import { requireRole } from "../lib/auth";
import { v } from "convex/values";

export const runDataIntegrityScan = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", args.token);

    console.log("=== STARTING DATA INTEGRITY SCAN ===");
    const results = {
      ordersScanned: 0,
      productsScanned: 0,
      issues: [] as string[],
      latestCorruptProductTimestamp: 0,
      latestCorruptOrderTimestamp: 0,
    };

    // 1. Scan Products for Rupee/Paise consistency
    // Product prices are expected to be in Rupees (e.g., UI consistent).
    // An excessively large number likely indicates it was accidentally stored as Paise (e.g. 100x larger).
    const products = await ctx.db.query("products").collect();
    results.productsScanned = products.length;

    for (const product of products) {
      if (product.price > 500000) { // Unlikely a standard item is > 5 Lakhs rupees
        results.issues.push(`Product ${product._id} (${product.name}) has an unusually high price: ${product.price}. Was it saved in paise instead of rupees?`);
        results.latestCorruptProductTimestamp = Math.max(results.latestCorruptProductTimestamp, product.updatedAt || product._creationTime);
      }
      if (product.discountPrice && product.discountPrice > product.price) {
        results.issues.push(`Product ${product._id} (${product.name}) has a discountPrice > price.`);
        results.latestCorruptProductTimestamp = Math.max(results.latestCorruptProductTimestamp, product.updatedAt || product._creationTime);
      }
    }

    // 2. Scan Orders for Snapshot Integrity and Format consistency
    const orders = await ctx.db.query("orders").collect();
    results.ordersScanned = orders.length;

    for (const order of orders) {
      let hasError = false;
      // If order total is excessively large, it might be double-multiplied by 100
      if (order.total > 50000000) {
        results.issues.push(`Order ${order._id} (${order.orderNumber}) has unusually high total: ${order.total}. Paise/Rupee mixup?`);
        hasError = true;
      }

      // Snapshot integrity validation
      if (!order.deliveryAddress) {
         results.issues.push(`Order ${order._id} is missing deliveryAddress snapshot.`);
         hasError = true;
      }
      
      if (!order.orderSnapshot) {
         results.issues.push(`Order ${order._id} is missing orderSnapshot entirely.`);
         hasError = true;
      } else {
         if (!order.orderSnapshot.addressSnapshot) {
            results.issues.push(`Order ${order._id} orderSnapshot is missing nested addressSnapshot.`);
            hasError = true;
         }
         
         // Verify items inside snapshot are populated
         if (!order.orderSnapshot.items || order.orderSnapshot.items.length === 0) {
             results.issues.push(`Order ${order._id} orderSnapshot has empty items array.`);
             hasError = true;
         }
      }

      if (hasError) {
        results.latestCorruptOrderTimestamp = Math.max(results.latestCorruptOrderTimestamp, order.updatedAt || order.createdAt || order._creationTime);
      }
    }

    console.log(`=== SCAN COMPLETE: ${results.issues.length} issues found ===`);
    return {
      success: true,
      timestamp: Date.now(),
      results,
    };
  },
});

export const getFirstAdminId = query({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).first();
    return admin ? admin._id : null;
  }
});
