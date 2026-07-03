import { Id } from "../_generated/dataModel";

/**
 * Helper to update product performance metrics atomically and incrementally.
 * Maintained with O(1) complexity.
 */
export async function incrementProductStats(
  ctx: any,
  productId: Id<"products">,
  boutiqueId: Id<"boutiques">,
  updates: {
    salesRevenue?: number;
    orderCount?: number;
    claimCount?: number;
    approvedClaimCount?: number;
    lastSoldAt?: number;
  }
) {
  const existing = await ctx.db
    .query("productPerformance")
    .withIndex("by_productId", (q: any) => q.eq("productId", productId))
    .first();

  const now = Date.now();
  if (existing) {
    const patch: any = {
      updatedAt: now,
    };
    if (updates.salesRevenue !== undefined) {
      patch.salesRevenue = (existing.salesRevenue || 0) + updates.salesRevenue;
    }
    if (updates.orderCount !== undefined) {
      patch.orderCount = (existing.orderCount || 0) + updates.orderCount;
    }
    if (updates.claimCount !== undefined) {
      patch.claimCount = (existing.claimCount || 0) + updates.claimCount;
    }
    if (updates.approvedClaimCount !== undefined) {
      patch.approvedClaimCount = (existing.approvedClaimCount || 0) + updates.approvedClaimCount;
    }
    if (updates.lastSoldAt !== undefined) {
      patch.lastSoldAt = updates.lastSoldAt;
    }
    await ctx.db.patch(existing._id, patch);
  } else {
    await ctx.db.insert("productPerformance", {
      productId,
      boutiqueId,
      salesRevenue: updates.salesRevenue || 0,
      orderCount: updates.orderCount || 0,
      claimCount: updates.claimCount || 0,
      approvedClaimCount: updates.approvedClaimCount || 0,
      lastSoldAt: updates.lastSoldAt,
      updatedAt: now,
    });
  }
}
