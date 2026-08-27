// apps/customer/src/lib/seo/productAdapter.ts
//
// Single source of truth for "how does a raw Convex product object map
// to what ProductSchema.tsx (and product metadata) needs?"
//
// If your Convex product schema changes field names, this is the ONLY
// file that needs updating — ProductSchema.tsx and the page component
// stay untouched.
//
// The product object here is the *enriched* product returned by
// convex/products.ts → enrichProduct() → getProduct query, which
// spreads the raw Doc<"products"> with resolved image URLs, boutique
// info, and availability flags.

import { SITE_URL } from "@/lib/seo";

/** Shape expected by ProductSchema.tsx — mirrors its ProductSchemaProps["product"] */
export interface SeoProduct {
  _id?: string;
  name: string;
  description?: string;
  slug: string;
  price?: number;
  images?: string[];
  coverImage?: string;
  boutiqueName?: string;
  boutique?: {
    name?: string;
    boutiqueName?: string;
  };
  isUnavailable?: boolean;
  isAvailable?: boolean;
}

/**
 * Maps an enriched Convex product (from getProduct query) to the shape
 * ProductSchema.tsx expects. All field names come directly from:
 *   - convex/schema.ts → products table (name, slug, description, price, images)
 *   - convex/products.ts → enrichProducts() adds: boutiqueName, boutique, imageUrl, images (resolved URLs)
 *   - convex/products.ts → getProduct() adds: isUnavailable (when not purchasable)
 */
export function toSeoProduct(product: Record<string, any>): SeoProduct {
  return {
    _id: product._id,                                     // Convex document _id
    name: product.name ?? "",                              // schema: v.string()
    description: product.description ?? undefined,         // schema: v.string()
    slug: product.slug ?? "",                              // schema: v.string(), indexed by_slug
    price: product.price ?? 0,                             // schema: v.number() — price in paise
    images: Array.isArray(product.images)                  // enrichProducts() resolves storage IDs → URLs
      ? product.images
      : [],
    coverImage: product.imageUrl ?? undefined,             // enrichProducts() sets imageUrl = first resolved image
    boutiqueName: product.boutiqueName ?? undefined,       // enrichProducts() sets boutiqueName from boutique doc
    boutique: product.boutique ?? undefined,               // enrichProducts() sets full boutique object
    isUnavailable: product.isUnavailable ?? false,         // getProduct() sets this when !isPurchasableProduct
    isAvailable: product.active !== false,                 // schema: v.boolean() — product active state
  };
}
