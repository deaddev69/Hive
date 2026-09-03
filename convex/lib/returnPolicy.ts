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
import { getVerticalConfig } from "./verticals";

type DbReader = GenericDatabaseReader<DataModel>;

export type ReturnPolicyItem = {
  productId: Id<"products">;
  boutiqueId?: Id<"boutiques">;
};

/**
 * Resolve return eligibility for a single item.
 *
 * Precedence:
 *   1. Product explicit override wins (`product.returnsAccepted !== undefined`).
 *   2. Vertical default from product snapshot (`getVerticalConfig(product?.verticalType)`).
 *      - If vertical default is false (Fragrance / Final Sale by default):
 *        An explicit boutique opt-in (`returnsAcceptedDefault === true`) can permit returns.
 *        Unset boutique setting (`undefined`) defaults to false.
 *      - If vertical default is true (Apparel, Handbag, etc.):
 *        Inherits boutique default (`returnsAcceptedDefault !== false`, where undefined is true).
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

  const verticalConfig = getVerticalConfig(product?.verticalType);
  const verticalDefaultReturns = verticalConfig.policy.defaultReturnsAccepted;

  if (item.boutiqueId) {
    const itemBoutique = await db.get(item.boutiqueId);
    if (verticalDefaultReturns === false) {
      // Commercial override: boutique must explicitly opt-in to accept returns on a Final Sale vertical
      return itemBoutique?.returnsAcceptedDefault === true;
    }
    return itemBoutique?.returnsAcceptedDefault !== false;
  }

  if (verticalDefaultReturns === false) {
    return false;
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

/**
 * Resolve exchange eligibility for a whole order.
 *
 * Precedence:
 *   1. Vertical-level exchange check per item:
 *      - Any item with `defaultExchangesAccepted === false` (Fragrance) makes the order non-exchangeable.
 *   2. Store-level exchange preference:
 *      - `boutique.exchangesAcceptedDefault !== undefined ? boutique.exchangesAcceptedDefault : boutique.returnsAcceptedDefault !== false`
 */
export async function resolveOrderExchangesAccepted(
  db: DbReader,
  boutiqueId: Id<"boutiques">,
  items?: ReturnPolicyItem[]
): Promise<boolean> {
  if (items && items.length > 0) {
    for (const item of items) {
      const product = await db.get(item.productId);
      const verticalConfig = getVerticalConfig(product?.verticalType);
      if (verticalConfig.policy.defaultExchangesAccepted === false) {
        return false;
      }
    }
  }

  const boutique = await db.get(boutiqueId);
  if (boutique?.exchangesAcceptedDefault !== undefined) {
    return boutique.exchangesAcceptedDefault;
  }
  return boutique?.returnsAcceptedDefault !== false;
}
