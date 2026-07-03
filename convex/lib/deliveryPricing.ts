// convex/lib/deliveryPricing.ts
// Single source of truth for delivery fee calculation.
// Used by both routing.ts (customer-facing quotes) and payments.ts (checkout validation).
// DO NOT duplicate this logic anywhere else.

/**
 * Calculates the customer-facing delivery fee based on distance and cart value.
 *
 * Distance Slabs (Rupees):
 *   0–3 km   → ₹39
 *   3–6 km   → ₹59
 *   6–10 km  → ₹79
 *   10+ km   → ₹99
 *
 * Cart-Based Subsidies (subtotal in Rupees):
 *   Cart >= ₹2500 → Free delivery
 *   Cart >= ₹1500 → 50% off delivery
 *
 * @param distanceKm - Distance between boutique and customer in kilometers
 * @param subtotalRupees - Cart subtotal in Rupees (NOT paise)
 * @param promoCode - Optional promo code (e.g., "FREESHIP")
 * @returns Delivery fee in Rupees
 */
export function calculateDeliveryFeeRupees(
  distanceKm: number,
  subtotalRupees: number,
  promoCode?: string
): number {
  // FREESHIP promo overrides everything
  if (promoCode && promoCode.trim().toUpperCase() === "FREESHIP") {
    return 0;
  }

  // Distance-based slab pricing
  let standardFee: number;
  if (distanceKm <= 3) {
    standardFee = 39;
  } else if (distanceKm <= 6) {
    standardFee = 59;
  } else if (distanceKm <= 10) {
    standardFee = 79;
  } else {
    standardFee = 99;
  }

  // Cart-value subsidies
  if (subtotalRupees >= 2500) {
    return 0; // Free delivery
  } else if (subtotalRupees >= 1500) {
    return Math.round(standardFee / 2); // 50% off
  }

  return standardFee;
}

/**
 * Estimates the internal courier cost for a given distance.
 * This is NOT the customer-facing fee — it's the platform's actual cost.
 *
 * Base fare: ₹45 for first 1.0 km, ₹8/km thereafter.
 *
 * @param distanceKm - Distance in kilometers
 * @returns Estimated courier cost in Rupees
 */
export function estimateCourierCostRupees(distanceKm: number): number {
  const baseFare = 45;
  const baseDist = 1.0;
  const perKmRate = 8;
  return baseFare + Math.max(0, distanceKm - baseDist) * perKmRate;
}
