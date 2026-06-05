// packages/utils/src/validation.ts
// Input validation helpers — mirrors Convex-side validation rules

/** Valid Indian pincode (6 digits) */
export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

/** Valid E.164 Indian phone number */
export function isValidIndianPhone(phone: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

/** Valid SKU format */
export function isValidSKU(sku: string): boolean {
  return /^[A-Z0-9_-]{2,30}$/.test(sku);
}

/** Valid product name */
export function isValidProductName(name: string): boolean {
  return name.trim().length >= 3 && name.trim().length <= 120;
}

/** Valid rating (1–5 integer) */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Validate file size (bytes) */
export function isWithinSizeLimit(bytes: number, maxMB: number): boolean {
  return bytes <= maxMB * 1024 * 1024;
}

export const ALLOWED_PRODUCT_CATEGORIES = [
  "Saree",
  "Kurti",
  "Co-ord Set",
  "Lehenga",
  "Gown",
  "Salwar Suit",
  "Dress",
  "Top",
  "Blouse",
  "Other",
] as const;

export type ProductCategory = (typeof ALLOWED_PRODUCT_CATEGORIES)[number];

export const MAX_PRODUCT_TAGS = 20;
export const MAX_TAG_LENGTH   = 30;
export const DELIVERY_FEE_PAISE = 49_00;  // ₹49
export const CLAIM_WINDOW_HOURS = 48;
export const DEFAULT_COMMISSION_RATE = 15;  // 15%
export const DEFAULT_HIVE_SCORE = 50;
export const LOW_STOCK_THRESHOLD = 2;
