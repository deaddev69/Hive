// convex/pricingService.ts
// Hive Pricing Engine v2 — Commission-based model
// Single authoritative pricing calculation. All other code consumes this output.

import { MutationCtx, QueryCtx } from "./_generated/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlatformConfig {
  handlingChargePaise: number;       // e.g. 2900 = ₹29
  platformFeePaise: number;          // e.g. 2000 = ₹20
  gstRatePercent: number;            // e.g. 18
  commissionTiers: Array<{
    key: string;                     // "bronze", "silver", "gold"
    name: string;                    // "Bronze", "Silver", "Gold"
    sellerCommissionPercent: number;  // e.g. 2, 3, 5
  }>;
}

export interface SellerItemPricing {
  sellerBasePricePaise: number;
  sellerCommissionPercent: number;
  sellerCommissionPaise: number;
  sellerCommissionGstPaise: number;
  sellerPayoutPaise: number;
}

export interface CheckoutPricing {
  // Product-level
  productSubtotalPaise: number;       // sum of seller base prices × quantities
  // Platform charges (charged to customer)
  handlingChargePaise: number;
  platformFeePaise: number;
  platformChargesGstPaise: number;    // GST on (handling + platform fee)
  // Delivery
  deliveryFeePaise: number;
  // Discount
  discountPaise: number;
  // Total
  totalPayablePaise: number;
  // Seller settlement
  sellerTierKey: string;
  sellerTierName: string;
  sellerCommissionPercent: number;
  sellerCommissionPaise: number;      // commission on product subtotal
  sellerCommissionGstPaise: number;   // GST on commission (deducted from seller)
  sellerPayoutPaise: number;          // product subtotal - commission - commission GST
  // Config snapshot
  gstRatePercent: number;
  handlingChargeConfigPaise: number;
  platformFeeConfigPaise: number;
  gstRateConfigPercent: number;
  sellerCommissionConfigPercent: number;
}

// ─── Legacy types (backward compat for old orders) ───────────────────────────

/** @deprecated Use PlatformConfig instead */
export interface PlatformSettings {
  markupRate: number;
  platformFeeRate: number;
  markupType?: "flat" | "tiered";
  markupTiers?: Array<{ min_price: number; max_price: number | null; rate: number }>;
  tier1?: { name: string; slabs: Array<{ min_price: number; max_price: number | null; rate: number }> };
  tier2?: { name: string; slabs: Array<{ min_price: number; max_price: number | null; rate: number }> };
  tier3?: { name: string; slabs: Array<{ min_price: number; max_price: number | null; rate: number }> };
}

/** @deprecated Use SellerItemPricing instead */
export interface ItemFinancialSnapshot {
  priceAtPurchase: number;
  basePriceAtPurchase: number;
  platformMarkupRateAtPurchase: number;
  platformFeeRateAtPurchase: number;
  fixedPlatformFeeAtPurchase: number;
  platformMarkupAmount: number;
  platformFeeAmount: number;
  gstAmountAtPurchase: number;
  subtotal: number;
}

/** @deprecated */
export interface StoreSettlement {
  merchantPayablePaise: number;
  merchantPayableRupees: number;
  totalBasePricePaise: number;
  totalPlatformFeePaise: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_COMMISSION_TIERS = [
  { key: "bronze", name: "Bronze", sellerCommissionPercent: 2 },
  { key: "silver", name: "Silver", sellerCommissionPercent: 3 },
  { key: "gold",   name: "Gold",   sellerCommissionPercent: 5 },
];

export const DEFAULT_HANDLING_CHARGE_PAISE = 2900;  // ₹29
export const DEFAULT_PLATFORM_FEE_PAISE = 2000;     // ₹20
export const DEFAULT_GST_RATE_PERCENT = 18;

/** @deprecated Legacy defaults — kept for backward compat */
export const FIXED_PLATFORM_FEE_PAISE = 700;
export const FIXED_PLATFORM_FEE_RUPEES = 7;
export const DEFAULT_TIER_SLABS = [
  { min_price: 0, max_price: 499, rate: 8 },
  { min_price: 500, max_price: 999, rate: 8 },
  { min_price: 1000, max_price: 1499, rate: 8 },
  { min_price: 1500, max_price: 2499, rate: 8 },
  { min_price: 2500, max_price: 4999, rate: 8 },
  { min_price: 5000, max_price: null, rate: 5 },
];

// ─── Config Fetching ─────────────────────────────────────────────────────────

/**
 * Fetch the current platform config from the database.
 * Returns v2 commission-based config if available, otherwise constructs defaults.
 */
export async function getPlatformConfig(ctx: QueryCtx | MutationCtx): Promise<PlatformConfig> {
  const settings = (await ctx.db.query("platformSettings").first()) as any;
  return {
    handlingChargePaise: settings?.handlingChargePaise ?? DEFAULT_HANDLING_CHARGE_PAISE,
    platformFeePaise: settings?.platformFeePaise ?? DEFAULT_PLATFORM_FEE_PAISE,
    gstRatePercent: settings?.gstRatePercent ?? DEFAULT_GST_RATE_PERCENT,
    commissionTiers: settings?.commissionTiers ?? DEFAULT_COMMISSION_TIERS,
  };
}

/**
 * @deprecated Use getPlatformConfig instead. Kept for backward compat during migration.
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
    tier1: settings.tier1,
    tier2: settings.tier2,
    tier3: settings.tier3,
  };
}

// ─── Tier Resolution ─────────────────────────────────────────────────────────

/**
 * Find the commission tier config for a given tier key.
 * Falls back to the first tier if not found.
 */
export function resolveCommissionTier(
  tierKey: string,
  config: PlatformConfig
): { key: string; name: string; sellerCommissionPercent: number } {
  const tier = config.commissionTiers?.find(t => t.key === tierKey);
  if (tier) return tier;
  return config.commissionTiers?.[0] ?? DEFAULT_COMMISSION_TIERS[0]!;
}


// ─── Item-Level Seller Pricing ───────────────────────────────────────────────

/**
 * Calculate seller economics for a single product item.
 * This is used for seller dashboard preview and order item snapshots.
 * 
 * @param sellerBasePricePaise - The seller's listed base price in paise
 * @param tierKey - The seller's pricing tier key (e.g. "bronze")
 * @param config - Platform config
 * @returns Seller commission breakdown
 */
export function calculateSellerItemPricing(
  sellerBasePricePaise: number,
  tierKey: string,
  config: PlatformConfig
): SellerItemPricing {
  const tier = resolveCommissionTier(tierKey, config);
  const commissionPercent = tier.sellerCommissionPercent;
  const gstRate = config.gstRatePercent;

  // Commission = basePrice × commissionRate
  const commissionPaise = Math.round(sellerBasePricePaise * commissionPercent / 100);
  // GST on commission (deducted from seller)
  const commissionGstPaise = Math.round(commissionPaise * gstRate / 100);
  // Seller payout = base - commission - commission GST
  const payoutPaise = sellerBasePricePaise - commissionPaise - commissionGstPaise;

  return {
    sellerBasePricePaise,
    sellerCommissionPercent: commissionPercent,
    sellerCommissionPaise: commissionPaise,
    sellerCommissionGstPaise: commissionGstPaise,
    sellerPayoutPaise: payoutPaise,
  };
}

// ─── Checkout-Level Pricing ──────────────────────────────────────────────────

/**
 * Calculate the complete checkout pricing for a single-seller order.
 * This is the ONE authoritative pricing calculation.
 * 
 * @param items - Array of { sellerBasePricePaise, quantity }
 * @param deliveryFeePaise - Dynamic Porter delivery fee
 * @param discountPaise - Coupon/promo discount amount
 * @param sellerTierKey - The seller's pricing tier key
 * @param config - Platform config
 */
export function calculateCheckoutPricing(
  items: Array<{ sellerBasePricePaise: number; quantity: number }>,
  deliveryFeePaise: number,
  discountPaise: number,
  sellerTierKey: string,
  config: PlatformConfig
): CheckoutPricing {
  const tier = resolveCommissionTier(sellerTierKey, config);
  const gstRate = config.gstRatePercent;

  // Product subtotal (sum of seller base prices × quantities)
  const productSubtotalPaise = items.reduce(
    (sum, item) => sum + item.sellerBasePricePaise * item.quantity, 0
  );

  // Platform charges (charged to customer)
  const handlingChargePaise = config.handlingChargePaise;
  const platformFeePaise = config.platformFeePaise;
  const platformSubtotalPaise = handlingChargePaise + platformFeePaise;
  const platformChargesGstPaise = Math.round(platformSubtotalPaise * gstRate / 100);

  // Seller commission (on product subtotal)
  const sellerCommissionPaise = Math.round(productSubtotalPaise * tier.sellerCommissionPercent / 100);
  const sellerCommissionGstPaise = Math.round(sellerCommissionPaise * gstRate / 100);
  const sellerPayoutPaise = productSubtotalPaise - sellerCommissionPaise - sellerCommissionGstPaise;

  // Customer payable
  const totalPayablePaise = Math.max(
    0,
    productSubtotalPaise
    + handlingChargePaise
    + platformFeePaise
    + platformChargesGstPaise
    + deliveryFeePaise
    - discountPaise
  );

  return {
    productSubtotalPaise,
    handlingChargePaise,
    platformFeePaise,
    platformChargesGstPaise,
    deliveryFeePaise,
    discountPaise,
    totalPayablePaise,
    sellerTierKey: tier.key,
    sellerTierName: tier.name,
    sellerCommissionPercent: tier.sellerCommissionPercent,
    sellerCommissionPaise,
    sellerCommissionGstPaise,
    sellerPayoutPaise,
    gstRatePercent: gstRate,
    handlingChargeConfigPaise: config.handlingChargePaise,
    platformFeeConfigPaise: config.platformFeePaise,
    gstRateConfigPercent: config.gstRatePercent,
    sellerCommissionConfigPercent: tier.sellerCommissionPercent,
  };
}

// ─── Legacy Functions (backward compat) ──────────────────────────────────────

/** @deprecated Use resolveCommissionTier instead */
export function selectMarkupRate(basePriceRupees: number, settings: PlatformSettings, pricingTier?: string): number {
  const markupType = settings.markupType ?? "tiered";
  const tierKey = pricingTier || "tier1";
  const tierConfig = (settings as any)[tierKey] as { name: string; slabs: Array<{ min_price: number; max_price: number | null; rate: number }> } | undefined;
  const hasTierSpecificSlabs = tierConfig && Array.isArray(tierConfig.slabs) && tierConfig.slabs.length > 0;
  let tiers: Array<{ min_price: number; max_price: number | null; rate: number }> | undefined;
  if (hasTierSpecificSlabs) {
    tiers = tierConfig!.slabs;
  } else if (markupType === "tiered") {
    tiers = settings.markupTiers ?? DEFAULT_TIER_SLABS;
  }
  if (tiers && Array.isArray(tiers) && tiers.length > 0) {
    const tier = tiers.find((t) => {
      const minMatch = basePriceRupees >= t.min_price;
      const maxMatch = t.max_price === null || t.max_price === undefined || basePriceRupees <= t.max_price;
      return minMatch && maxMatch;
    });
    if (tier) return tier.rate / 100;
  }
  return settings.markupRate ?? 0.15;
}

export const getPlatformMarkupRate = selectMarkupRate;

/** @deprecated Product price = seller base price in v2. No markup calculation needed. */
export function calculateProductPricing(
  basePriceRupees: number,
  baseDiscountPriceRupees: number | undefined | null,
  settings: PlatformSettings,
  pricingTier?: string
) {
  // v2: Product price = base price (no markup). Return identity.
  const customerPrice = basePriceRupees;
  const customerDiscountPrice = baseDiscountPriceRupees && baseDiscountPriceRupees > 0
    ? baseDiscountPriceRupees
    : undefined;

  const discountPercent = customerDiscountPrice
    ? Math.max(0, Math.round(((customerPrice - customerDiscountPrice) / customerPrice) * 100))
    : 0;

  return {
    basePrice: basePriceRupees,
    customerPrice,
    baseDiscountPrice: baseDiscountPriceRupees ?? undefined,
    customerDiscountPrice,
    markupRate: 0,
    discountMarkupRate: 0,
    discountPercent,
    markupAmount: 0,
    platformFeeAmount: 0,
    sellerProcessingFee: 0,
    gstAmount: 0,
    discountGstAmount: 0,
  };
}

/** @deprecated Use calculateCheckoutPricing instead */
export async function calculateItemFinancials(
  ctx: MutationCtx | QueryCtx,
  productRow: any,
  clientPricePaise: number,
  quantity: number
): Promise<ItemFinancialSnapshot> {
  // In v2, product price = base price. Validate that client price matches DB.
  const canonicalPricePaise = productRow.discountPrice ?? productRow.price;

  if (Math.abs(canonicalPricePaise - clientPricePaise) > 100) {
    const { ConvexError } = await import("convex/values");
    throw new ConvexError({
      code: "STALE_CART_PRICE",
      message: "The prices of some items in your cart have been updated. Please review your new total before checking out.",
    });
  }

  // For v2, base price = price (no markup)
  const basePricePaise = productRow.basePrice ?? canonicalPricePaise;

  return {
    priceAtPurchase: canonicalPricePaise,
    basePriceAtPurchase: basePricePaise,
    platformMarkupRateAtPurchase: 0,
    platformFeeRateAtPurchase: 0,
    fixedPlatformFeeAtPurchase: 0,
    platformMarkupAmount: 0,
    platformFeeAmount: 0,
    gstAmountAtPurchase: 0,
    subtotal: canonicalPricePaise * quantity,
  };
}

/** @deprecated Use calculateCheckoutPricing().sellerPayoutPaise instead */
export function calculateBoutiquePayout(orderItem: {
  // v2 fields
  sellerBasePricePaise?: number;
  sellerCommissionPaise?: number;
  sellerCommissionGstPaise?: number;
  sellerPayoutPaise?: number;
  // v1 fields
  basePriceAtPurchase?: number;
  platformFeeAmount?: number;
  priceAtPurchase?: number;
  price?: number;
}): number {
  // v2: use explicit seller payout
  if (orderItem.sellerPayoutPaise !== undefined) {
    return orderItem.sellerPayoutPaise;
  }
  // v1: legacy calculation
  if (orderItem.basePriceAtPurchase !== undefined && orderItem.platformFeeAmount !== undefined) {
    return orderItem.basePriceAtPurchase - orderItem.platformFeeAmount;
  }
  const price = orderItem.priceAtPurchase ?? orderItem.price ?? 0;
  return Math.floor(price * 0.82);
}

/** @deprecated Use calculateCheckoutPricing() instead */
export function calculateStoreSettlement(
  items: Array<{
    sellerPayoutPaise?: number;
    basePriceAtPurchase?: number;
    platformFeeAmount?: number;
    priceAtPurchase?: number;
    price?: number;
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

  const roundedMerchantPayablePaise = Math.round(merchantPayablePaise);

  return {
    merchantPayablePaise: roundedMerchantPayablePaise,
    merchantPayableRupees: roundedMerchantPayablePaise / 100,
    totalBasePricePaise: Math.round(totalBasePricePaise),
    totalPlatformFeePaise: Math.round(totalPlatformFeePaise),
  };
}

/** @deprecated */
export function calculateOrderTotals(
  itemsFinancials: Array<{ priceAtPurchase: number; quantity: number }>,
  deliveryFeePaise: number,
  discountPaise: number
) {
  const subtotalPaise = Math.round(
    itemsFinancials.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0)
  );
  const totalPaise = Math.max(0, subtotalPaise - Math.round(discountPaise) + Math.round(deliveryFeePaise));

  return {
    subtotalPaise,
    subtotalRupees: subtotalPaise / 100,
    deliveryFeePaise: Math.round(deliveryFeePaise),
    deliveryFeeRupees: Math.round(deliveryFeePaise) / 100,
    discountPaise: Math.round(discountPaise),
    discountRupees: Math.round(discountPaise) / 100,
    totalPaise,
    totalRupees: totalPaise / 100,
  };
}

/** @deprecated */
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
    unitPricePaise: Math.round(item.priceAtPurchase),
    unitPriceRupees: Math.round(item.priceAtPurchase) / 100,
    totalPricePaise: Math.round(item.priceAtPurchase * item.quantity),
    totalPriceRupees: Math.round(item.priceAtPurchase * item.quantity) / 100,
  }));

  const subtotalPaise = invoiceItems.reduce((sum, item) => sum + item.totalPricePaise, 0);
  const totalAmountPaise = Math.max(0, subtotalPaise - Math.round(discountPaise) + Math.round(deliveryFeePaise));

  return {
    items: invoiceItems,
    subtotalPaise,
    subtotalRupees: subtotalPaise / 100,
    deliveryFeePaise: Math.round(deliveryFeePaise),
    deliveryFeeRupees: Math.round(deliveryFeePaise) / 100,
    discountPaise: Math.round(discountPaise),
    discountRupees: Math.round(discountPaise) / 100,
    taxPaise: 0,
    taxRupees: 0,
    totalAmountPaise,
    totalAmountRupees: totalAmountPaise / 100,
  };
}

/** @deprecated Use pricingSnapshot on order instead */
export function calculateBoutiqueEarnings(
  items: Array<{
    sellerPayoutPaise?: number;
    basePriceAtPurchase?: number;
    platformMarkupAmount?: number;
    platformFeeAmount?: number;
    fixedPlatformFeeAtPurchase?: number;
    priceAtPurchase: number;
    quantity: number;
  }>
) {
  let totalPlatformMarkupPaise = 0;
  let totalPlatformFeePaise = 0;
  let totalFixedPlatformFeePaise = 0;
  let totalBoutiquePayoutPaise = 0;

  for (const item of items) {
    const qty = item.quantity;
    if (item.platformMarkupAmount !== undefined && item.platformFeeAmount !== undefined) {
      totalPlatformMarkupPaise += item.platformMarkupAmount * qty;
      totalPlatformFeePaise += item.platformFeeAmount * qty;
      totalFixedPlatformFeePaise += (item.fixedPlatformFeeAtPurchase ?? FIXED_PLATFORM_FEE_PAISE) * qty;
    }
    totalBoutiquePayoutPaise += calculateBoutiquePayout(item) * qty;
  }

  const totalCommissionPaise = totalPlatformMarkupPaise + totalPlatformFeePaise + totalFixedPlatformFeePaise;
  const gstPaise = Math.floor(totalCommissionPaise * 0.18);
  const netCommissionPaise = totalCommissionPaise - gstPaise;

  return {
    totalPlatformMarkupPaise: Math.round(totalPlatformMarkupPaise),
    totalPlatformFeePaise: Math.round(totalPlatformFeePaise),
    totalFixedPlatformFeePaise: Math.round(totalFixedPlatformFeePaise),
    totalCommissionPaise: Math.round(totalCommissionPaise),
    gstPaise: Math.round(gstPaise),
    netCommissionPaise: Math.round(netCommissionPaise),
    totalBoutiquePayoutPaise: Math.round(totalBoutiquePayoutPaise),
    totalBoutiquePayoutRupees: Math.round(totalBoutiquePayoutPaise) / 100,
  };
}
