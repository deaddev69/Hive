// convex/lib/inventory.ts
import { GenericMutationCtx } from "convex/server";
import { Id } from "../_generated/dataModel";

/**
 * Shared helper to restore reserved stock from a checkout session.
 * Used during payment failures, webhooks, and session expiration sweeps.
 * 
 * IDEMPOTENT: If session.stockRestoredAt is already set, this is a no-op.
 * After restoring, patches the session with stockRestoredAt to prevent
 * duplicate restoration from concurrent callers.
 */
export async function restoreCheckoutSessionStock(
  ctx: GenericMutationCtx<any>,
  session: any
) {
  // Idempotency guard: if stock was already restored for this session, skip
  if (session.stockRestoredAt) {
    return;
  }

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

    if (productRow && !item.reservationId) {
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

  // Mark session as stock-restored (idempotency flag)
  // Under Convex OCC, concurrent callers writing this same field will conflict,
  // and the retrying caller will see stockRestoredAt is set and exit early.
  if (session._id) {
    await ctx.db.patch(session._id, { stockRestoredAt: now });
  }
}

