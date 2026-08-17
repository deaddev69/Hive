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
  // Merchandising & Operations
  createdAt?: number;
  distanceKm?: number;
  etaMinutes?: number;
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
