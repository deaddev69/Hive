import React from "react";
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
    const product = await client.query(api.products.getProduct, { slug });
    if (!product) return {};

    return {
      title: `${cleanProductTitle(product.name)} — Hive by TailorBee`,
      description: product.description || `Discover and shop ${product.name} on Hive by TailorBee.`,
      openGraph: {
        title: `${cleanProductTitle(product.name)} — Hive by TailorBee`,
        description: product.description || `Discover and shop ${product.name} on Hive by TailorBee.`,
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
  let initialProduct = null;
  try {
    initialProduct = await client.query(api.products.getProduct, { slug });
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
