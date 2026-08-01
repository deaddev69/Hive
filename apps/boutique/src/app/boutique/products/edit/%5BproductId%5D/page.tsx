"use client";

import React, { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import ProductForm from "../../ProductForm";
import { Loader2 } from "lucide-react";

interface EditProductPageProps {
  params: Promise<{ productId: string }>;
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.productId;

  const product = useQuery(api.products.getProduct, { id: productId as any });
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });

  if (product === undefined || categories === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm font-bold text-slate-700">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <ProductForm productToEdit={product} categories={categories || []} />
    </div>
  );
}
