import React from "react";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { ProductDetailPageClient } from "./ProductDetailPageClient";
import { Metadata } from "next";
import { cleanProductTitle } from "@/components/product/ProductCard";
import { getCategoryContent } from "@/lib/content/categoryContent";
import { getCategoryMetadata, SITE_URL } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { ProductSchema } from "@/components/seo/ProductSchema";
import { ProductsClient } from "../ProductsClient";

export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  if (getCategoryContent(slug)) {
    return getCategoryMetadata(slug);
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return {};

  const client = new ConvexHttpClient(convexUrl);
  try {
    // 1. Check if slug belongs to a database category
    const dbCategory = await client.query(api.categories.getCategoryBySlug, { slug });
    if (dbCategory) {
      return getCategoryMetadata(slug);
    }

    const product = await client.query(api.products.getProduct, { slug });
    if (!product) return {};

    const cleanTitle = cleanProductTitle(product.name);
    const description =
      product.description ||
      `Buy ${product.name} online from verified local boutiques in Kochi on Hive. Same-day 1-2 hour delivery available across Ernakulam.`;
    const canonicalUrl = `${SITE_URL}/products/${product.slug}`;
    const ogImage =
      product.images && product.images.length > 0
        ? product.images[0]
        : product.coverImage || `${SITE_URL}/icon-512x512.png`;

    return {
      title: `${cleanTitle} — Hive`,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${cleanTitle} — Hive`,
        description,
        url: canonicalUrl,
        siteName: "Hive",
        type: "website",
        images: [
          {
            url: ogImage,
            alt: product.name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${cleanTitle} — Hive`,
        description,
        images: [ogImage],
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

  const client = new ConvexHttpClient(convexUrl);
  
  // 1. Check if slug belongs to a database category
  let dbCategory = null;
  try {
    dbCategory = await client.query(api.categories.getCategoryBySlug, { slug });
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

  let initialProduct = null;
  try {
    initialProduct = await client.query(api.products.getProduct, { slug });
  } catch (error) {
    console.error("Failed to fetch product:", error);
  }

  if (!initialProduct) {
    return notFound();
  }

  const cleanTitle = cleanProductTitle(initialProduct.name);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
          { name: cleanTitle, url: `/products/${initialProduct.slug}` },
        ]}
      />
      <ProductSchema product={initialProduct} />
      <ProductDetailPageClient product={initialProduct} />
    </>
  );
}
