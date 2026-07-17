import { MutationCtx, QueryCtx, ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

/**
 * Calculates the exact financial snapshot for an item at checkout based on current platform settings.
 * Validates the client's provided price against the dynamically calculated price.
 */
export async function calculateItemFinancials(
  ctx: MutationCtx | QueryCtx,
  productRow: any,
  clientPricePaise: number,
  quantity: number
) {
  if (productRow.basePrice === undefined) {
    throw new Error(`Product ${productRow._id} has not been migrated to the new pricing model yet.`);
  }

  // Fetch active platform settings
  const settings = await ctx.db.query("platformSettings").first() || {
    markupRate: 0.15,
    platformFeeRate: 0.02,
  };

  const basePriceRupees = productRow.basePrice;
  const platformMarkupRateAtPurchase = settings.markupRate;
  const platformFeeRateAtPurchase = settings.platformFeeRate;
  
  // Re-calculate the exact customer price dynamically using Charm Pricing (Nearest 9)
  const rawCustomerPriceRupees = basePriceRupees * (1 + platformMarkupRateAtPurchase);
  const customerPriceRupees = Math.ceil(rawCustomerPriceRupees / 10) * 10 - 1;
  const expectedCustomerPricePaise = Math.round(customerPriceRupees * 100);
  
  // Validate against client-provided price (in paise) to prevent manipulation and handle stale carts.
  // A threshold of 100 paise (1 Rupee) allows for minor fractional rounding differences.
  if (Math.abs(expectedCustomerPricePaise - clientPricePaise) > 100) {
    throw new ConvexError({
      code: "STALE_CART_PRICE",
      message: "The prices of some items in your cart have been updated. Please review your new total before checking out."
    });
  }

  // The platform takes the entire markup amount (difference between customer price and base price)
  const platformMarkupAmountPaise = Math.round((customerPriceRupees - basePriceRupees) * 100);
  const platformFeeAmountPaise = Math.round(basePriceRupees * platformFeeRateAtPurchase * 100);
  const basePriceAtPurchasePaise = Math.round(basePriceRupees * 100);
  
  return {
    priceAtPurchase: expectedCustomerPricePaise, // in paise
    basePriceAtPurchase: basePriceAtPurchasePaise, // in paise
    platformMarkupRateAtPurchase,
    platformFeeRateAtPurchase,
    platformMarkupAmount: platformMarkupAmountPaise, // in paise
    platformFeeAmount: platformFeeAmountPaise, // in paise
    subtotal: expectedCustomerPricePaise * quantity, // in paise
  };
}

/**
 * Helper to determine the boutique's exact payout amount for an order item,
 * purely reading from the immutable snapshot.
 */
export function calculateBoutiquePayout(orderItem: {
  basePriceAtPurchase?: number;
  platformFeeAmount?: number;
  priceAtPurchase: number;
}): number {
  if (orderItem.basePriceAtPurchase !== undefined && orderItem.platformFeeAmount !== undefined) {
    return orderItem.basePriceAtPurchase - orderItem.platformFeeAmount;
  }
  
  // Legacy fallback for orders created before this pricing model
  return Math.floor(orderItem.priceAtPurchase * 0.82);
}
