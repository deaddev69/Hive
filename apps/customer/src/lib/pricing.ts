/**
 * Centralized Pricing Utility for Hive E-Commerce
 * Standardizes customer selling price and authentic, tag-verified MRP & discount calculations.
 * 
 * STRICT LEGAL & COMPLIANCE RULES:
 * - Legal Metrology Act, 2009: MRP is a statutory metric that must match physical product tags.
 * - CCPA 2023 Dark Patterns Guidelines: Zero algorithmic or synthetic MRP price inflation.
 * - Only displays MRP & discount percentage when an authentic, higher physical MRP is in the DB.
 */

export interface DisplayPricing {
  price: number;              // The customer selling price (in Rupees)
  compareAtPrice?: number;    // The authentic physical MRP / anchor price (in Rupees, only if valid & higher)
  discountPercent: number;    // E.g. 25 for 25% OFF, 0 if no discount
  hasDiscount: boolean;       // True only if valid higher MRP exists
  formattedPrice: string;     // E.g. "₹1,379"
  formattedMrp?: string;      // E.g. "₹1,899"
}

export function calculateDisplayPricing(p: any): DisplayPricing {
  if (!p) {
    return {
      price: 0,
      discountPercent: 0,
      hasDiscount: false,
      formattedPrice: "₹0",
    };
  }

  // Normalize raw price (DB stores in paise e.g. 137900 or 1379)
  let rawPrice = p.price || 0;
  if (rawPrice > 10000 && !p._isRupees) {
    rawPrice = rawPrice / 100;
  }

  let rawDiscountPrice = p.discountPrice;
  if (rawDiscountPrice && rawDiscountPrice > 10000 && !p._isRupees) {
    rawDiscountPrice = rawDiscountPrice / 100;
  }

  let rawCompareAtPrice = p.compareAtPrice ?? p.mrp;
  if (rawCompareAtPrice && rawCompareAtPrice > 10000 && !p._isRupees) {
    rawCompareAtPrice = rawCompareAtPrice / 100;
  }

  // Determine actual customer selling price
  const hasExplicitSellerDiscount =
    rawDiscountPrice !== undefined &&
    rawDiscountPrice !== null &&
    rawDiscountPrice > 0 &&
    rawDiscountPrice < rawPrice;

  const sellingPrice = hasExplicitSellerDiscount ? Math.round(rawDiscountPrice) : Math.round(rawPrice);

  // Sourced directly from seller / physical tag (never fabricated):
  let mrp: number | undefined;
  if (hasExplicitSellerDiscount) {
    mrp = Math.round(rawPrice);
  } else if (rawCompareAtPrice && rawCompareAtPrice > sellingPrice) {
    mrp = Math.round(rawCompareAtPrice);
  }

  const hasDiscount = !!mrp && mrp > sellingPrice;
  const discountPercent = hasDiscount
    ? Math.round(((mrp! - sellingPrice) / mrp!) * 100)
    : 0;

  return {
    price: sellingPrice,
    compareAtPrice: hasDiscount ? mrp : undefined,
    discountPercent,
    hasDiscount,
    formattedPrice: `₹${sellingPrice.toLocaleString("en-IN")}`,
    formattedMrp: hasDiscount && mrp ? `₹${mrp.toLocaleString("en-IN")}` : undefined,
  };
}
