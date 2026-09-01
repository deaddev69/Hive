// DTOs for the Content API

export interface ResolvedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  imageUrl: string;
  boutiqueId: string;
  boutiqueName: string;
  boutiqueSlug: string;
  categoryId?: string;
  rating?: number;
  reviewCount?: number;
  // Merchandising & Operations
  createdAt?: number;
  sameDayEligible?: boolean;
  distanceKm?: number;
  etaMinutes?: number;
  /** Resolved delivery promise ("90-Min Delivery" / "Delivers Tomorrow" / …), computed server-side
   *  from boutique hours + prep time + real distance. See convex/lib/deliveryEta.ts. */
  deliveryLabel?: string | null;
  hiveScore?: number;
  badges?: string[];
}

export interface ResolvedCollection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  products: ResolvedProduct[];
}

export interface ResolvedBlock {
  id: string;
  blockKey: string;
  blockType: "hero" | "category" | "collection" | "banner" | "recentlyViewed" | "trust" | "vibeGrid" | "newArrivals" | "premiumCuration" | string;
  title?: string;
  subtitle?: string;
  renderer?: "productCarousel" | "largeCards" | "moodGrid" | "occasionGrid" | "editorialGrid" | "twoProductGrid" | "vibeGrid" | string;
  config?: any;
  data: {
    collection?: Omit<ResolvedCollection, 'products'>; // The top level block handles the products array directly
    products?: ResolvedProduct[];
    banner?: any;
    banners?: any[];
    categories?: any[];
    /** True when this block's products were actually ranked from the shopper's own view
     * history, rather than the generic recency-ranked fallback. */
    isPersonalized?: boolean;
  };
}

export interface ResolvedExperience {
  id: string;
  name: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks: ResolvedBlock[];
}
