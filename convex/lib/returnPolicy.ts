// convex/lib/returnPolicy.ts
// Shared resolution of whether an order is return/exchange eligible.
//
// The policy lives in two places: each product may carry its own
// `returnsAccepted`, and each boutique carries a `returnsAcceptedDefault`
// that applies to its products which don't set one explicitly.
//
// This value MUST be snapshotted onto the order at creation time. It drives
// the Razorpay Route payout hold (Final Sale releases on delivery, 24h-return
// holds until delivered + 24h), so resolving it live at read time would let a
// seller retroactively change the payout terms of orders already placed.

import { GenericDatabaseReader } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;

export type ReturnPolicyItem = {
  productId: Id<"products">;
  boutiqueId?: Id<"boutiques">;
};

/**
 * Resolve return eligibility for a single item.
 * A product's own setting wins; otherwise its boutique's default applies.
 */
async function resolveItemReturnsAccepted(
  db: DbReader,
  item: ReturnPolicyItem,
  fallbackBoutiqueDefault: boolean
): Promise<boolean> {
  const product = await db.get(item.productId);
  if (product?.returnsAccepted !== undefined) {
    return product.returnsAccepted;
  }

  if (item.boutiqueId) {
    const itemBoutique = await db.get(item.boutiqueId);
    return itemBoutique?.returnsAcceptedDefault !== false;
  }

  return fallbackBoutiqueDefault;
}

/**
 * Resolve return eligibility for a whole order.
 *
 * An order is returnable only when every item is returnable AND the order's
 * boutique accepts returns by default. Any single Final Sale item makes the
 * whole order Final Sale, because the payout hold is applied per order.
 */
export async function resolveOrderReturnsAccepted(
  db: DbReader,
  boutiqueId: Id<"boutiques">,
  items: ReturnPolicyItem[]
): Promise<boolean> {
  const boutique = await db.get(boutiqueId);
  const boutiqueReturnsDefault = boutique?.returnsAcceptedDefault !== false;

  if (items.length === 0) return boutiqueReturnsDefault;

  for (const item of items) {
    const itemAccepts = await resolveItemReturnsAccepted(
      db,
      item,
      boutiqueReturnsDefault
    );
    if (itemAccepts === false) return false;
  }

  return boutiqueReturnsDefault;
}
