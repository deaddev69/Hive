import { notFound } from "next/navigation";
import { getProductDetailBySlug, mockProductDetails } from "@/lib/mockProductDetails";
import { ProductDetailPageClient } from "./ProductDetailPageClient";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductDetailBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Hive by TailorBee`,
    description: product.description,
  };
}

export async function generateStaticParams() {
  return Object.keys(mockProductDetails).map((slug) => ({ slug }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductDetailBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailPageClient product={product} />;
}
