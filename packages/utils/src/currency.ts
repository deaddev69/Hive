// packages/utils/src/currency.ts
// Indian Rupee currency formatting utilities

/**
 * Convert paise (integer) to formatted INR string
 * @example formatINR(299900) → "₹2,999"
 * @example formatINR(299900, { showDecimal: true }) → "₹2,999.00"
 */
export function formatINR(
  paise: number,
  options: { showDecimal?: boolean } = {}
): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: options.showDecimal ? 2 : 0,
    maximumFractionDigits: options.showDecimal ? 2 : 0,
  }).format(rupees);
}

/**
 * Convert INR rupees to paise
 * @example inrToPaise(299.90) → 29990
 */
export function inrToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise to rupees
 * @example paiseToInr(29990) → 299.90
 */
export function paiseToInr(paise: number): number {
  return paise / 100;
}

/**
 * Calculate platform commission
 * @example calcCommission(1000_00, 15) → 15000 (₹150 on ₹1000)
 */
export function calcCommission(subtotalPaise: number, ratePercent: number): number {
  return Math.round(subtotalPaise * (ratePercent / 100));
}
