"use client";

import React, { useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { ProductDetailPageClient } from "./ProductDetailPageClient";
import { Loader2 } from "lucide-react";
import { cleanProductTitle } from "@/components/product/ProductCard";

export default function ProductDetailPage() {
  const params = useParams() as { slug: string };
  const product = useQuery(api.products.getProduct, { slug: params.slug });

  // Update document title dynamically
  useEffect(() => {
    if (product) {
      document.title = `${cleanProductTitle(product.name)} — Hive by TailorBee`;
    }
  }, [product]);

  if (product === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-bold">Loading product details...</p>
      </div>
    );
  }

  if (product === null) {
    notFound();
  }

  return <ProductDetailPageClient product={product} />;
}
