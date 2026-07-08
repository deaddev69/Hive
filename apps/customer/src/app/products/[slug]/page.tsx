import React from "react";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { ProductDetailPageClient } from "./ProductDetailPageClient";
import { Metadata } from "next";
import { cleanProductTitle } from "@/components/product/ProductCard";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return notFound();
  }

  const client = new ConvexHttpClient(convexUrl);
  const product = await client.query(api.products.getProduct, { slug });

  if (!product) {
    notFound();
  }

  return <ProductDetailPageClient product={product} />;
}
