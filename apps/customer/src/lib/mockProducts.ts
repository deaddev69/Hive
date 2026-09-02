export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  boutiqueName: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number;
  /**
   * Percentage off, derived alongside price by calculateDisplayPricing.
   * Every mapper that builds a card already sets this; the field was simply
   * never declared here.
   */
  discountPercent?: number;
  rating?: number;
  reviewCount?: number;
  occasion?: string;
  isVerifiedBoutique?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  sameDayDelivery?: boolean;
  videoAvailable?: boolean;
  favorite?: boolean;
  sizes?: string[];
  stockBySize?: Record<string, number>;
  description?: string;
  images?: string[];
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  estimatedEtaMinutes?: number;
  hiveScore?: number;
  /** Delivery promise resolved server-side from boutique hours, prep time and real distance.
   *  ProductCard prefers this over its own clock-based fallback. */
  deliveryLabel?: string | null;
}

