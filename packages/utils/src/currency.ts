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
  const showDec = options.showDecimal ?? true;
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: showDec ? 2 : 2,
    maximumFractionDigits: showDec ? 2 : 2,
  })}`;
}

/**
 * Convert paise (integer) to formatted currency string (rupees)
 * @example formatCurrency(177600) → "₹1,776.00"
 */
export function formatCurrency(
  paise: number,
  options: { showDecimal?: boolean } = {}
): string {
  return formatINR(paise, options);
}

/**
 * Convert rupees (float/int) to formatted currency string
 * @example formatRupees(1776) → "₹1,776.00"
 */
export function formatRupees(
  rupees: number,
  options: { showDecimal?: boolean } = {}
): string {
  const showDec = options.showDecimal ?? true;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: showDec ? 2 : 2,
    maximumFractionDigits: showDec ? 2 : 2,
  })}`;
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
