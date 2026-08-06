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
            className={`relative shrink-0 px-4 py-2 text-[12px] uppercase tracking-widest font-bold transition-all duration-300 ${
              !activeCategory 
                ? "text-slate-900" 
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            All Items
            {!activeCategory && (
              <span className="absolute bottom-1 left-4 right-4 h-[2px] bg-slate-900 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.1)]" />
            )}
          </Link>
          
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug || activeCategory === cat.name.toLowerCase().replace(/\s+/g, "-");
            return (
              <Link
                key={cat._id}
                href={`/products?category=${cat.slug}&browse=all`}
                className={`relative shrink-0 px-4 py-2 text-[12px] uppercase tracking-widest font-bold transition-all duration-300 ${
                  isActive 
                    ? "text-slate-900" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {cat.name}
                {isActive && (
                  <span className="absolute bottom-1 left-4 right-4 h-[2px] bg-slate-900 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.1)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
