"use client";

import React, { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ProductForm = dynamic(() => import("../ProductForm"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      <p className="text-sm text-slate-500 font-medium">Loading product form...</p>
    </div>
  ),
});

function NewProductPageContent() {
  const searchParams = useSearchParams();
  const templateFromId = searchParams.get("templateFrom");

  const categories = useQuery(api.categories.getCategories, { onlyActive: true });
  // Fetches the sibling colour to prefill from when the seller arrives via
  // "+ Add Another Colour". `skip` when there's nothing to template from.
  // Scoped server-side to the caller's own boutique — a seller must not be
  // able to template a new listing off another boutique's product.
  const templateProduct = useQuery(
    api.products.getMyProductToTemplate,
    templateFromId ? { id: templateFromId as any } : "skip"
  );

  const stillLoadingTemplate = !!templateFromId && templateProduct === undefined;

  if (categories === undefined || stillLoadingTemplate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500 font-medium">Loading form categories...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <ProductForm
        categories={categories || []}
        productToTemplate={templateProduct || undefined}
      />
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm text-slate-500 font-medium">Loading product form...</p>
        </div>
      }
    >
      <NewProductPageContent />
    </Suspense>
  );
}
