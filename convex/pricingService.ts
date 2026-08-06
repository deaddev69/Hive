import { MutationCtx, QueryCtx, ActionCtx } from "./_generated/server";
import { ConvexError } from "convex/values";

export interface PlatformSettings {
  markupRate: number;
  platformFeeRate: number;
  markupType?: "flat" | "tiered";
  markupTiers?: Array<{ min_price: number; max_price: number | null; rate: number }>;
}

export interface ItemFinancialSnapshot {
  priceAtPurchase: number; // Customer price in Paise
  basePriceAtPurchase: number; // Boutique base price in Paise
  platformMarkupRateAtPurchase: number; // e.g. 0.15
  platformFeeRateAtPurchase: number; // e.g. 0.02
  platformMarkupAmount: number; // Platform markup in Paise
  platformFeeAmount: number; // Store platform fee in Paise
  subtotal: number; // priceAtPurchase * quantity in Paise
}

export interface StoreSettlement {
  merchantPayablePaise: number;
  merchantPayableRupees: number;
  totalBasePricePaise: number;
  totalPlatformFeePaise: number;
}

export const DEFAULT_TIER_SLABS = [
  { min_price: 0, max_price: 499, rate: 18 },
  { min_price: 500, max_price: 999, rate: 16 },
  { min_price: 1000, max_price: 1499, rate: 14 },
  { min_price: 1500, max_price: 2499, rate: 12 },
  { min_price: 2500, max_price: 4999, rate: 11 },
  { min_price: 5000, max_price: null, rate: 10 },
];

/**
 * Fetch active platform settings from Convex database or fallback to defaults.
 */
export async function getPlatformSettings(ctx: QueryCtx | MutationCtx): Promise<PlatformSettings> {
  const settings = (await ctx.db.query("platformSettings").first()) as any;
  if (!settings) {
    return {
      markupRate: 0.15,
      platformFeeRate: 0.02,
      markupType: "tiered",
      markupTiers: DEFAULT_TIER_SLABS,
    };
  }
  return {
    markupRate: settings.markupRate ?? 0.15,
    platformFeeRate: settings.platformFeeRate ?? 0.02,
    markupType: settings.markupType ?? "tiered",
    markupTiers: settings.markupTiers ?? DEFAULT_TIER_SLABS,
  };
}

/**
 * Select active platform markup rate based on Platform Settings and Base Listing Price in Rupees.
 * Strictly checks tier slabs when markupType === "tiered".
 */
export function selectMarkupRate(basePriceRupees: number, settings: PlatformSettings): number {
  const markupType = settings.markupType ?? "tiered";
  const tiers = settings.markupTiers ?? DEFAULT_TIER_SLABS;

  if (markupType === "tiered" && Array.isArray(tiers) && tiers.length > 0) {
    const tier = tiers.find((t) => {
      const minMatch = basePriceRupees >= t.min_price;
      const maxMatch = t.max_price === null || t.max_price === undefined || basePriceRupees <= t.max_price;
      return minMatch && maxMatch;
    });
    if (tier) {
      return tier.rate / 100;
    }
  }

  return settings.markupRate ?? 0.15;
}

// Alias for backward compatibility
export const getPlatformMarkupRate = selectMarkupRate;

/**
 * Calculate dynamic customer pricing with Charm Pricing (rounding to nearest 9 ending).
 */
export function calculateProductPricing(
  basePriceRupees: number,
  baseDiscountPriceRupees: number | undefined | null,
  settings: PlatformSettings
) {
  const markupRate = selectMarkupRate(basePriceRupees, settings);
  const rawCustomerPrice = basePriceRupees * (1 + markupRate);
  const customerPrice = Math.ceil(rawCustomerPrice / 10) * 10 - 1;

  let customerDiscountPrice: number | undefined = undefined;
  let discountMarkupRate = markupRate;

  if (baseDiscountPriceRupees && baseDiscountPriceRupees > 0) {
    discountMarkupRate = selectMarkupRate(baseDiscountPriceRupees, settings);
    const rawDiscountPrice = baseDiscountPriceRupees * (1 + discountMarkupRate);
    customerDiscountPrice = Math.ceil(rawDiscountPrice / 10) * 10 - 1;
  }

  const discountPercent = customerDiscountPrice
    ? Math.max(0, Math.round(((customerPrice - customerDiscountPrice) / customerPrice) * 100))
    : 0;

  return {
    basePrice: basePriceRupees,
    customerPrice,
    baseDiscountPrice: baseDiscountPriceRupees ?? undefined,
    customerDiscountPrice,
    markupRate,
    discountMarkupRate,
    discountPercent,
  };
}

/**
 * Calculate the exact financial snapshot for an item at checkout based on current platform settings.
 * Validates the client's provided price against the dynamically calculated price.
 */
export async function calculateItemFinancials(
  ctx: MutationCtx | QueryCtx,
  productRow: any,
  clientPricePaise: number,
  quantity: number
): Promise<ItemFinancialSnapshot> {
  const settings = await getPlatformSettings(ctx);

  // Fallback to reverse-calculating basePrice if missing on legacy product records
  const basePriceRupees =
    productRow.basePrice !== undefined
      ? productRow.basePrice
      : Math.floor(productRow.price / (1 + (settings.markupRate || 0.15)));

  const platformMarkupRateAtPurchase = selectMarkupRate(basePriceRupees, settings);
  const platformFeeRateAtPurchase = settings.platformFeeRate;

  // Re-calculate customer price dynamically using Charm Pricing (Nearest 9)
  const rawCustomerPriceRupees = basePriceRupees * (1 + platformMarkupRateAtPurchase);
  const customerPriceRupees = Math.ceil(rawCustomerPriceRupees / 10) * 10 - 1;
  const expectedCustomerPricePaise = Math.round(customerPriceRupees * 100);

  // Validate against client-provided price (in paise) to prevent price manipulation and handle stale carts.
  if (Math.abs(expectedCustomerPricePaise - clientPricePaise) > 100) {
    throw new ConvexError({
      code: "STALE_CART_PRICE",
      message: "The prices of some items in your cart have been updated. Please review your new total before checking out.",
    });
  }

  const platformMarkupAmountPaise = Math.round((customerPriceRupees - basePriceRupees) * 100);
  const platformFeeAmountPaise = Math.round(basePriceRupees * platformFeeRateAtPurchase * 100);
  const basePriceAtPurchasePaise = Math.round(basePriceRupees * 100);

  return {
    priceAtPurchase: expectedCustomerPricePaise,
    basePriceAtPurchase: basePriceAtPurchasePaise,
    platformMarkupRateAtPurchase,
    platformFeeRateAtPurchase,
    platformMarkupAmount: platformMarkupAmountPaise,
    platformFeeAmount: platformFeeAmountPaise,
    subtotal: expectedCustomerPricePaise * quantity,
  };
}

/**
 * Calculate boutique payout amount for a single item based on its financial snapshot.
 */
export function calculateBoutiquePayout(orderItem: {
  basePriceAtPurchase?: number; // in Paise
  platformFeeAmount?: number; // in Paise
  priceAtPurchase?: number; // in Paise
  price?: number; // in Paise fallback
}): number {
  const priceAtPurchase = orderItem.priceAtPurchase ?? orderItem.price ?? 0;
  if (orderItem.basePriceAtPurchase !== undefined && orderItem.platformFeeAmount !== undefined) {
    return orderItem.basePriceAtPurchase - orderItem.platformFeeAmount;
  }
  // Legacy fallback for orders created before snapshot schema
  return Math.floor(priceAtPurchase * 0.82);
}

/**
 * Calculate computed StoreSettlement for a boutique based on order items.
 * Single source of truth for Razorpay Route Transfer amounts and merchant accruals.
 */
export function calculateStoreSettlement(
  items: Array<{
    basePriceAtPurchase?: number; // in Paise
    platformFeeAmount?: number; // in Paise
    priceAtPurchase?: number; // in Paise
    price?: number; // in Paise fallback
    quantity: number;
  }>
): StoreSettlement {
  let merchantPayablePaise = 0;
  let totalBasePricePaise = 0;
  let totalPlatformFeePaise = 0;

  for (const item of items) {
    const itemPayoutPaise = calculateBoutiquePayout(item);
    merchantPayablePaise += itemPayoutPaise * item.quantity;
    const priceAtPurchase = item.priceAtPurchase ?? item.price ?? 0;

    if (item.basePriceAtPurchase !== undefined && item.platformFeeAmount !== undefined) {
      totalBasePricePaise += item.basePriceAtPurchase * item.quantity;
      totalPlatformFeePaise += item.platformFeeAmount * item.quantity;
    } else {
      totalBasePricePaise += priceAtPurchase * item.quantity;
    }
  }

  return {
    merchantPayablePaise,
    merchantPayableRupees: merchantPayablePaise / 100,
    totalBasePricePaise,
    totalPlatformFeePaise,
  };
}

/**
 * Calculate expected order totals (Subtotal, Delivery Fee, Discount, Final Total).
 */
export function calculateOrderTotals(
  itemsFinancials: Array<{ priceAtPurchase: number; quantity: number }>,
  deliveryFeePaise: number,
  discountPaise: number
) {
  const subtotalPaise = itemsFinancials.reduce(
    (sum, item) => sum + item.priceAtPurchase * item.quantity,
    0
  );
  const totalPaise = Math.max(0, subtotalPaise - discountPaise + deliveryFeePaise);

  return {
    subtotalPaise,
    subtotalRupees: subtotalPaise / 100,
    deliveryFeePaise,
    deliveryFeeRupees: deliveryFeePaise / 100,
    discountPaise,
    discountRupees: discountPaise / 100,
    totalPaise,
    totalRupees: totalPaise / 100,
  };
}

/**
 * Calculate invoice financials and line item totals.
 */
export function calculateInvoiceFinancials(
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    size: string;
    quantity: number;
    priceAtPurchase: number;
  }>,
  deliveryFeePaise: number,
  discountPaise: number
) {
  const invoiceItems = items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    productImage: item.productImage,
    size: item.size,
    quantity: item.quantity,
    unitPricePaise: item.priceAtPurchase,
    unitPriceRupees: item.priceAtPurchase / 100,
    totalPricePaise: item.priceAtPurchase * item.quantity,
    totalPriceRupees: (item.priceAtPurchase * item.quantity) / 100,
  }));

  const subtotalPaise = invoiceItems.reduce((sum, item) => sum + item.totalPricePaise, 0);
  const totalAmountPaise = Math.max(0, subtotalPaise - discountPaise + deliveryFeePaise);

  return {
    items: invoiceItems,
    subtotalPaise,
    subtotalRupees: subtotalPaise / 100,
    deliveryFeePaise,
    deliveryFeeRupees: deliveryFeePaise / 100,
    discountPaise,
    discountRupees: discountPaise / 100,
    taxPaise: 0,
    taxRupees: 0,
    totalAmountPaise,
    totalAmountRupees: totalAmountPaise / 100,
  };
}

/**
 * Calculate boutique earnings and platform commission metrics for dashboards.
 */
export function calculateBoutiqueEarnings(
  items: Array<{
    basePriceAtPurchase?: number;
    platformMarkupAmount?: number;
    platformFeeAmount?: number;
    priceAtPurchase: number;
    quantity: number;
  }>
) {
  let totalPlatformMarkupPaise = 0;
  let totalPlatformFeePaise = 0;
  let totalBoutiquePayoutPaise = 0;

  for (const item of items) {
    const qty = item.quantity;
    if (item.platformMarkupAmount !== undefined && item.platformFeeAmount !== undefined) {
      totalPlatformMarkupPaise += item.platformMarkupAmount * qty;
      totalPlatformFeePaise += item.platformFeeAmount * qty;
    }
    totalBoutiquePayoutPaise += calculateBoutiquePayout(item) * qty;
  }

  const totalCommissionPaise = totalPlatformMarkupPaise + totalPlatformFeePaise;
  const gstPaise = Math.floor(totalCommissionPaise * 0.18);
  const netCommissionPaise = totalCommissionPaise - gstPaise;

  return {
    totalPlatformMarkupPaise,
    totalPlatformFeePaise,
    totalCommissionPaise,
    gstPaise,
    netCommissionPaise,
    totalBoutiquePayoutPaise,
    totalBoutiquePayoutRupees: totalBoutiquePayoutPaise / 100,
  };
}
