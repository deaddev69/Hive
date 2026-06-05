// packages/types/src/product.ts
import type { MeasurementMatrix, ProductSize } from "./common";

export type ProductStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";

export interface Product {
  _id:                string;
  _creationTime:      number;
  boutiqueId:         string;
  name:               string;
  slug:               string;
  description?:       string;
  category:           string;
  occasionIds:        string[];
  priceMin:           number;   // paise
  priceMax:           number;   // paise
  measurementMatrix?: MeasurementMatrix;
  careInstructions?:  string;
  fabricDetails?:     string;
  tags:               string[];
  status:             ProductStatus;
  rejectionReason?:   string;
  isActive:           boolean;
  viewCount:          number;
  orderCount:         number;
  approvedAt?:        number;
  approvedBy?:        string;
  createdAt:          number;
  updatedAt:          number;
}

export interface ProductImage {
  _id:                string;
  productId:          string;
  boutiqueId:         string;
  cloudinaryPublicId: string;
  url:                string;
  altText?:           string;
  sortOrder:          number;
  isPrimary:          boolean;
  createdAt:          number;
}

export interface ProductVideo {
  _id:                string;
  productId:          string;
  boutiqueId:         string;
  cloudinaryPublicId: string;
  url:                string;
  thumbnailUrl?:      string;
  durationSeconds?:   number;
  sortOrder:          number;
  createdAt:          number;
}

export interface ProductVariant {
  _id:            string;
  productId:      string;
  boutiqueId:     string;
  size:           ProductSize;
  color?:         string;
  sku:            string;
  price:          number;   // paise
  compareAtPrice?: number;  // MRP in paise
  isActive:       boolean;
  createdAt:      number;
  updatedAt:      number;
}

export interface InventoryRecord {
  _id:               string;
  variantId:         string;
  productId:         string;
  boutiqueId:        string;
  quantityTotal:     number;
  quantityReserved:  number;
  quantityAvailable: number;
  lowStockThreshold: number;
  lastUpdatedBy?:    string;
  updatedAt:         number;
}

/** Full product detail view — product + images + variants + inventory */
export interface ProductDetail extends Product {
  images:   ProductImage[];
  videos:   ProductVideo[];
  variants: Array<ProductVariant & { inventory: InventoryRecord }>;
  boutique: {
    _id:     string;
    name:    string;
    slug:    string;
    logoUrl?: string;
  };
}

/** Lightweight card view for catalog listings */
export interface ProductCard {
  _id:         string;
  name:        string;
  slug:        string;
  category:    string;
  priceMin:    number;
  priceMax:    number;
  primaryImage?: string;
  boutiqueName: string;
  boutiqueSlug: string;
  occasionIds: string[];
}
