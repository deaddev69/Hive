"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function CategoryPillRail() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  
  // Fetch active categories from Convex
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });

  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-slate-100 z-10 relative">
      <div className="max-w-[1440px] mx-auto pl-4 sm:pl-6 lg:pl-8 py-3">
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pr-4 sm:pr-6 lg:pr-8">
          <Link
            href="/products?browse=all"
            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
              !activeCategory 
                ? "bg-hive-dark text-white shadow-sm" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Items
          </Link>
          
          {categories.map((cat) => {
            // Check if current URL slug matches this category
            const isActive = activeCategory === cat.slug || activeCategory === cat.name.toLowerCase().replace(/\s+/g, "-");
            return (
              <Link
                key={cat._id}
                href={`/products?category=${cat.slug}&browse=all`}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                  isActive 
                    ? "bg-hive-amber text-white shadow-sm shadow-hive-amber/20" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
