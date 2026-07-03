// convex/lib/inventory.ts
import { GenericMutationCtx } from "convex/server";
import { Id } from "../_generated/dataModel";

/**
 * Shared helper to restore reserved stock from a checkout session.
 * Used during payment failures, webhooks, and session expiration sweeps.
 */
export async function restoreCheckoutSessionStock(
  ctx: GenericMutationCtx<any>,
  session: any
) {
  const now = Date.now();
  for (const item of session.items) {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q: any) => q.eq("slug", item.productId))
      .unique();
    let productRow = product;
    if (!productRow) {
      try {
        productRow = await ctx.db.get(item.productId as Id<"products">);
      } catch { }
    }

    if (productRow) {
      const currentStock = productRow.stockBySize[item.size] ?? 0;
      const newStock = currentStock + item.quantity;
      const stockBySize = { ...productRow.stockBySize };
      stockBySize[item.size] = newStock;

      const totalStock = Object.values(stockBySize).reduce((sum: number, val: any) => sum + (val || 0), 0);
      const autoDeactivatedBecauseOutOfStock = totalStock <= 0;

      await ctx.db.patch(productRow._id, { 
        stockBySize, 
        autoDeactivatedBecauseOutOfStock, 
        updatedAt: now 
      });

      await ctx.db.insert("inventoryMovements", {
        productId: productRow._id,
        boutiqueId: productRow.boutiqueId,
        size: item.size,
        beforeQty: currentStock,
        afterQty: newStock,
        adjustmentQty: item.quantity,
        reason: "online_order_reversal",
        source: "return",
        createdBy: session.userId,
        createdAt: now,
      });
    }
  }
}
