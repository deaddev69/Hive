import React, { cache } from "react";
// Trigger new Vercel deployment after production Convex functions deployment (July 31, 2026)
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { ProductDetailPageClient } from "./ProductDetailPageClient";
import { Metadata } from "next";
// cleanTitle is inlined here (same logic as cleanProductTitle in ProductCard.tsx)
// to avoid importing a client component module into this Server Component,
// which would crash the RSC renderer in production.
function cleanTitle(name: string): string {
  if (!name) return "";
  return name
    .replace(/\s*-\s*[A-Za-z0-9\s]+#\d+$/, "")
    .replace(/\s*#\d+$/, "")
    .replace(/\s*\(Out of Stock\)$/i, "")
    .trim();
}
import { getCategoryContent } from "@/lib/content/categoryContent";
import { getCategoryMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { ProductSchema } from "@/components/seo/ProductSchema";
import { ProductsClient } from "../ProductsClient";

export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Shared Convex client for this route's server-side reads. Created lazily so a
 * missing URL surfaces inside the callers' existing error handling rather than
 * at module import.
 */
let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    // Unreachable in practice: both callers below check the variable first.
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  if (!convexClient) convexClient = new ConvexHttpClient(url);
  return convexClient;
}

/**
 * Request-scoped reads shared by generateMetadata() and the page component.
 *
 * Next renders MetadataTree inside the same RSC pass as the page tree, so both
 * run under one React cache dispatcher — which is what lets these two entry
 * points share a result instead of each issuing its own request. Previously a
 * product page cost four Convex round trips (category + product, twice); it now
 * costs two.
 *
 * The argument MUST stay the primitive `slug`. React's cache keys object and
 * function arguments by identity through a WeakMap, and only primitives by
 * value through a Map — so a helper taking `{ slug }` would receive two
 * distinct object literals from the two call sites and would never dedupe,
 * silently doing nothing while looking correct.
 */
const fetchCategoryBySlug = cache((slug: string) =>
  getConvexClient().query(api.categories.getCategoryBySlug, { slug })
);

const fetchProductBySlug = cache((slug: string) =>
  getConvexClient().query(api.products.getProduct, { slug })
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return getCategoryContent(slug) ? getCategoryMetadata(slug) : {};
  }

  try {
    // Same precedence as the page body: database category first, then editorial
    // landing page, then product.
    const dbCategory = await fetchCategoryBySlug(slug);
    if (dbCategory) {
      return getCategoryMetadata(slug);
    }

    if (getCategoryContent(slug)) {
      return getCategoryMetadata(slug);
    }

    const product = await fetchProductBySlug(slug);
    if (!product) return {};

    return {
      // No brand suffix here: the root layout's title template already appends " | Hive", so
      // carrying one produced "Pleated Yoke Dress — Hive | Hive" in the tab and in search results.
      title: cleanTitle(product.name),
      description: product.description || `Discover and shop ${product.name} on Hive.`,
      alternates: {
        canonical: `${SITE_URL}/products/${product.slug}`,
      },
      openGraph: {
        // The template does not reach openGraph, and a shared link arrives with no surrounding
        // context, so this one keeps the brand.
        title: `${cleanTitle(product.name)} — Hive`,
        description: product.description || `Discover and shop ${product.name} on Hive.`,
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductOrCategoryPage({ params }: Props) {
  const { slug } = await params;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return notFound();
  }

  // 1. A real database category wins. Its slug is passed through so the catalogue
  //    filters to it (and, via getCatalogPage, to all of its descendants).
  let dbCategory = null;
  try {
    dbCategory = await fetchCategoryBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch database category:", error);
  }

  if (dbCategory) {
    return (
      <>
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Products", url: "/products" },
            { name: dbCategory.name, url: `/products/${slug}` },
          ]}
        />
        <ProductsClient initialCategorySlug={slug} />
      </>
    );
  }

  // 2. An editorial landing page with no category behind it (women, men, sale,
  //    accessories). These are marketing surfaces, not filters — none of these
  //    slugs names a category — so they render the unfiltered catalogue plus
  //    their SEO block rather than a category filter that cannot resolve.
  if (getCategoryContent(slug)) {
    const formattedCategory = slug.charAt(0).toUpperCase() + slug.slice(1);
    return (
      <>
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Products", url: "/products" },
            { name: formattedCategory, url: `/products/${slug}` },
          ]}
        />
        <ProductsClient />
      </>
    );
  }

  // Only reached for non-category slugs, so a category page still never issues
  // the product query — the early return above is preserved.
  let initialProduct = null;
  try {
    initialProduct = await fetchProductBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch product:", error);
  }

  if (!initialProduct) {
    return notFound();
  }

  // Safely adapt Convex product fields to what ProductSchema expects.
  // Convex enrichProduct() uses imageUrl/images/boutiqueName/active —
  // ProductSchema expects coverImage/images/boutiqueName/isAvailable.
  const p = initialProduct as any;
  const schemaProduct = {
    _id: p._id,
    name: p.name ?? "",
    description: p.description,
    slug: p.slug ?? "",
    price: typeof p.price === "number" ? p.price : undefined,
    images: Array.isArray(p.images) ? p.images : undefined,
    coverImage: p.imageUrl ?? p.coverImage,
    boutiqueName: p.boutiqueName,
    boutique: p.boutique,
    isUnavailable: p.isUnavailable ?? false,
    isAvailable: p.active !== false,
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
          { name: cleanTitle(initialProduct.name), url: `/products/${initialProduct.slug}` },
        ]}
      />
      <ProductSchema product={schemaProduct} />
      <ProductDetailPageClient product={initialProduct} />
    </>
  );
}
