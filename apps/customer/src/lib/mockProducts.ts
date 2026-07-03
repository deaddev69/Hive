export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  boutiqueName: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number;
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
}

