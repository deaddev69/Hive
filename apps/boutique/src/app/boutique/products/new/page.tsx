"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import ProductForm from "../ProductForm";
import { Loader2 } from "lucide-react";

export default function NewProductPage() {
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });

  if (categories === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500 font-medium">Loading form categories...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <ProductForm categories={categories || []} />
    </div>
  );
}
