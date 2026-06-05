// packages/utils/src/slug.ts
// URL slug generation utilities

/**
 * Convert a display name to a URL-safe slug
 * @example generateSlug("Ananya's Boutique!") → "ananya-s-boutique"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")   // remove special chars
    .trim()
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/-+/g, "-")         // collapse multiple hyphens
    .replace(/^-|-$/g, "");      // strip leading/trailing hyphens
}

/**
 * Generate a product slug with boutique context and uniqueness suffix
 * Format: {product-slug}-{boutique-slug}-{6-char-timestamp}
 */
export function generateProductSlug(productName: string, boutiqueSlug: string): string {
  const base = generateSlug(productName);
  const suffix = Date.now().toString(36).slice(-6);
  return `${base}-${boutiqueSlug}-${suffix}`;
}

/**
 * Generate an order number
 * Format: HV-YYYYMMDD-NNNN (zero-padded daily sequence)
 */
export function generateOrderNumber(dailySequence: number): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq  = String(dailySequence).padStart(4, "0");
  return `HV-${date}-${seq}`;
}

/**
 * Generate a claim number
 * Format: CLM-YYYYMMDD-NNNN
 */
export function generateClaimNumber(dailySequence: number): string {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq  = String(dailySequence).padStart(4, "0");
  return `CLM-${date}-${seq}`;
}
