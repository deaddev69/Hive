import React from "react";
import Link from "next/link";
import { RelatedCategory } from "@/lib/content/categoryContent";

export function RelatedCategories({ categories }: { categories: RelatedCategory[] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="mb-12">
      <h3 className="text-lg font-bold font-serif text-hive-dark mb-4">You may also like</h3>
      <div className="flex flex-wrap gap-3">
        {categories.map((cat, index) => (
          <Link
            key={index}
            href={`/products/${cat.slug}`}
            className="inline-flex items-center px-4 py-2 rounded-full border border-hive-border/60 text-sm font-medium text-stone-700 hover:border-hive-gold hover:text-hive-gold transition-colors bg-white"
          >
            {cat.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
