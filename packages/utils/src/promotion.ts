// packages/utils/src/promotion.ts
// Pure layout geometry and aspect ratio configurations for Post-Purchase Promotions.
// Consumed identically by customer SponsoredOfferCard and Admin Live Mobile Preview.

export type PromotionAspectRatio = "1:1" | "3:4" | "4:5" | "16:9";

export interface PromotionAspectRatioConfig {
  /** CSS aspect-ratio property value (e.g. "16 / 9") */
  cssRatio: "1 / 1" | "3 / 4" | "4 / 5" | "16 / 9";
  /** Constrained width in pixels for the customer post-purchase card */
  customerWidthPx: number;
  /** Constrained width in pixels for the admin live mobile preview simulator */
  adminWidthPx: number;
}

export const PROMOTION_ASPECT_RATIO_CONFIGS: Record<
  PromotionAspectRatio,
  PromotionAspectRatioConfig
> = {
  "1:1": {
    cssRatio: "1 / 1",
    customerWidthPx: 104,
    adminWidthPx: 64,
  },
  "3:4": {
    cssRatio: "3 / 4",
    customerWidthPx: 84,
    adminWidthPx: 54,
  },
  "4:5": {
    cssRatio: "4 / 5",
    customerWidthPx: 88,
    adminWidthPx: 58,
  },
  "16:9": {
    cssRatio: "16 / 9",
    customerWidthPx: 136,
    adminWidthPx: 88,
  },
} as const;

/**
 * Returns the layout geometry configuration for a post-purchase promotion creative.
 * Defaults safely to 1:1 if unspecified or unrecognized.
 */
export function getPromotionAspectRatioConfig(
  ratio?: string | null
): PromotionAspectRatioConfig {
  if (ratio && ratio in PROMOTION_ASPECT_RATIO_CONFIGS) {
    return PROMOTION_ASPECT_RATIO_CONFIGS[ratio as PromotionAspectRatio];
  }
  return PROMOTION_ASPECT_RATIO_CONFIGS["1:1"];
}

/**
 * Pure style generator for creative media frames.
 * Ensures identical presentation geometry between customer storefront and admin preview.
 */
export function getPromotionMediaStyle(
  ratio?: string | null,
  context: "customer" | "admin" = "customer"
): { aspectRatio: string; width: string; maxWidth?: string } {
  const config = getPromotionAspectRatioConfig(ratio);
  const widthPx = context === "customer" ? config.customerWidthPx : config.adminWidthPx;
  return {
    aspectRatio: config.cssRatio,
    width: `${widthPx}px`,
    ...(context === "customer" ? { maxWidth: "45%" } : {}),
  };
}
