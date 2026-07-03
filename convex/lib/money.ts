// convex/lib/money.ts
// Reusable money utility helpers for Rupee -> Paise and Paise -> Rupee conversion.
// Enforces unified paise-based financial storage in the database.

export type MoneyPaise = number;

/**
 * Converts value in Paise (integer) to Rupees (floating point/decimal).
 * Used at client-facing query boundaries.
 */
export function formatMoney(paise: MoneyPaise): number {
  return paise / 100;
}

/**
 * Converts value in Rupees (floating point/decimal) to Paise (integer).
 * Used during database insertions and external gateway API calls.
 */
export function parseMoney(rupees: number): MoneyPaise {
  return Math.round(rupees * 100);
}
