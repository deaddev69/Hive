import React, { cache } from "react";
// Trigger new Vercel deployment after production Convex functions deployment (July 31, 2026)
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { ProductDetailPageClient } from "./ProductDetailPageClient";
import { Metadata } from "next";
import { cleanProductTitle } from "@/components/product/ProductCard";
import { getCategoryContent } from "@/lib/content/categoryContent";
import { getCategoryMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
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
  
  if (getCategoryContent(slug)) {
    return getCategoryMetadata(slug);
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return {};

  try {
    // 1. Check if slug belongs to a database category
    const dbCategory = await fetchCategoryBySlug(slug);
    if (dbCategory) {
      return getCategoryMetadata(slug);
    }

    const product = await fetchProductBySlug(slug);
    if (!product) return {};

    return {
      title: `${cleanProductTitle(product.name)} — Hive`,
      description: product.description || `Discover and shop ${product.name} on Hive.`,
      openGraph: {
        title: `${cleanProductTitle(product.name)} — Hive`,
        description: product.description || `Discover and shop ${product.name} on Hive.`,
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductOrCategoryPage({ params }: Props) {
  const { slug } = await params;

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
        <ProductsClient initialCategorySlug={slug} />
      </>
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return notFound();
  }

  // 1. Check if slug belongs to a database category
  let dbCategory = null;
  try {
    dbCategory = await fetchCategoryBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch database category:", error);
  }

  if (dbCategory) {
    const formattedCategory = dbCategory.name;
    return (
      <>
        <BreadcrumbSchema 
          items={[
            { name: "Home", url: "/" },
            { name: "Products", url: "/products" },
            { name: formattedCategory, url: `/products/${slug}` },
          ]} 
        />
        <ProductsClient initialCategorySlug={slug} />
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

  return (
    <ProductDetailPageClient product={initialProduct} />
  );
}
