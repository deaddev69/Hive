"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

/**
 * Two rails, not one flat list.
 *
 * The top rail is the top-level categories. When one of them is the current
 * context — either it is selected, or one of its subcategories is — a second
 * rail appears underneath with that group's subcategories. A flat rail put
 * "Women's Fashion" and "Sarees" side by side at identical weight, which hid
 * the fact that one contains the other.
 */
export function CategoryPillRail() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const browseAll = searchParams.get("browse") === "all";

  const categories = useQuery(api.categories.getCategories, { onlyActive: true });

  const { roots, childrenOf, activeRootId } = React.useMemo(() => {
    if (!categories) {
      return { roots: [], childrenOf: new Map<string, any[]>(), activeRootId: null };
    }

    const byOrder = (a: any, b: any) =>
      (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name);

    const rootList = categories.filter((c: any) => !c.parentId).sort(byOrder);

    const map = new Map<string, any[]>();
    for (const root of rootList) {
      map.set(
        root._id,
        categories.filter((c: any) => c.parentId === root._id).sort(byOrder)
      );
    }

    // Which group the shopper is currently inside — the selected category if it
    // is top-level, otherwise its parent.
    const current = activeCategory
      ? categories.find((c: any) => c.slug === activeCategory)
      : null;
    const rootId = current ? ((current as any).parentId ?? current._id) : null;

    return { roots: rootList, childrenOf: map, activeRootId: rootId };
  }, [categories, activeCategory]);

  if (!categories || categories.length === 0) return null;

  const suffix = browseAll ? "&browse=all" : "";
  const activeChildren = activeRootId ? (childrenOf.get(activeRootId) ?? []) : [];

  const pill = (
    label: string,
    href: string,
    isActive: boolean,
    emphasis: "primary" | "secondary"
  ) => (
    <Link
      key={href}
      href={href}
      className={`relative shrink-0 px-4 py-2 transition-all duration-300 ${
        emphasis === "primary"
          ? "text-[12px] uppercase tracking-widest font-bold"
          : "text-[11px] tracking-wide font-semibold"
      } ${isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-700"}`}
    >
      {label}
      {isActive && (
        <span className="absolute bottom-1 left-4 right-4 h-[2px] bg-slate-900 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.1)]" />
      )}
    </Link>
  );

  return (
    <div className="w-full bg-white border-b border-slate-100 z-10 relative">
      <div className="max-w-[1440px] mx-auto pl-4 sm:pl-6 lg:pl-8 py-3 flex flex-col gap-1">
        {/* Top-level */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pr-4 sm:pr-6 lg:pr-8">
          {pill("All Items", "/products?browse=all", !activeCategory, "primary")}
          {roots.map((cat: any) =>
            pill(
              cat.name,
              `/products?category=${cat.slug}${suffix}`,
              activeCategory === cat.slug,
              "primary"
            )
          )}
        </div>

        {/* Subcategories of the group currently being browsed */}
        {activeChildren.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4 sm:pr-6 lg:pr-8 border-t border-slate-100 pt-1.5">
            <span className="shrink-0 pl-4 pr-1 text-[10px] uppercase tracking-widest text-slate-300 font-bold">
              In this group
            </span>
            {activeChildren.map((child: any) =>
              pill(
                child.name,
                `/products?category=${child.slug}${suffix}`,
                activeCategory === child.slug,
                "secondary"
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
