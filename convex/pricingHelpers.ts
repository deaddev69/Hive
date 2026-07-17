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

  const basePriceAtPurchase = productRow.basePrice; // in paise
  const platformMarkupRateAtPurchase = settings.markupRate;
  const platformFeeRateAtPurchase = settings.platformFeeRate;
  
  // Re-calculate the exact customer price dynamically.
  // Note: if there is a discountPrice, we should apply markup on discountPrice? 
  // Wait, if a boutique sets a discountPrice, they are discounting their basePrice. 
  // Let's assume the active base price is basePrice. If discountPrice exists, it's a legacy field, but in the new model 
  // boutiques might still set a discount price. For now, we use basePrice.
  // Actually, let's check if the product has a baseDiscountPrice. They don't. 
  // So basePrice is the source of truth.
  
  const expectedCustomerPricePaise = Math.floor(basePriceAtPurchase * (1 + platformMarkupRateAtPurchase));
  
  // Validate against client-provided price (in paise) to prevent manipulation and handle stale carts.
  // A threshold of 100 paise (1 Rupee) allows for minor fractional rounding differences.
  if (Math.abs(expectedCustomerPricePaise - clientPricePaise) > 100) {
    throw new ConvexError({
      code: "STALE_CART_PRICE",
      message: "The prices of some items in your cart have been updated. Please review your new total before checking out."
    });
  }

  const platformMarkupAmount = Math.floor(basePriceAtPurchase * platformMarkupRateAtPurchase);
  const platformFeeAmount = Math.floor(basePriceAtPurchase * platformFeeRateAtPurchase);
  
  return {
    priceAtPurchase: expectedCustomerPricePaise,
    basePriceAtPurchase,
    platformMarkupRateAtPurchase,
    platformFeeRateAtPurchase,
    platformMarkupAmount,
    platformFeeAmount,
    subtotal: expectedCustomerPricePaise * quantity,
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
