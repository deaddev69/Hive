"use client";

import React from "react";
import { cn } from "@hive/ui";
import { FilterSection } from "./FilterSection";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

interface CategoryFilterProps {
  selected: string[]; // Array of category DB IDs
  onChange: (values: string[]) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selected,
  onChange,
}) => {
  const dbCategories = useQuery(api.categories.getCategories, { onlyActive: true });

  /**
   * Top-level categories, each with its subcategories.
   *
   * Rendering these at equal weight made "Women's Fashion" and "Sarees" look
   * like alternatives rather than a group and one of its members. Selecting a
   * parent already returns its descendants' products (getCatalogPage resolves
   * the tree), so the nesting shown here matches what the filter actually does.
   */
  const groups = React.useMemo(() => {
    if (!dbCategories) return [];
    const byOrder = (a: any, b: any) =>
      (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name);
    return dbCategories
      .filter((c: any) => !c.parentId)
      .sort(byOrder)
      .map((parent: any) => ({
        parent,
        children: dbCategories.filter((c: any) => c.parentId === parent._id).sort(byOrder),
      }));
  }, [dbCategories]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  if (dbCategories === undefined) {
    return (
      <FilterSection title="Category" activeCount={selected.length}>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-hive-comb/20 animate-pulse border border-hive-border/30"
            />
          ))}
        </div>
      </FilterSection>
    );
  }

  if (dbCategories.length === 0) {
    return (
      <FilterSection title="Category" activeCount={0}>
        <p className="text-xs text-hive-text-muted py-2 text-center">
          No categories available.
        </p>
      </FilterSection>
    );
  }

  const chip = (cat: any, isChild: boolean) => {
    const active = selected.includes(cat._id);
    return (
      <button
        key={cat._id}
        type="button"
        onClick={() => toggle(cat._id)}
        className={cn(
          "inline-flex items-center px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer select-none",
          isChild ? "font-medium" : "font-semibold",
          active
            ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs scale-[1.02]"
            : "bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-800 hover:border-amber-400 hover:bg-stone-100"
        )}
        aria-pressed={active}
      >
        <span>{cat.name}</span>
      </button>
    );
  };

  return (
    <FilterSection title="Category" activeCount={selected.length}>
      <div className="flex flex-col gap-3 py-1">
        {groups.map(({ parent, children }: any) => (
          <div key={parent._id} className="flex flex-col gap-1.5">
            {/*
              Selecting the parent is a real choice, not just a label: the server
              expands it to every descendant, so it reads as "all of this group".
            */}
            <div className="flex flex-wrap gap-2">{chip(parent, false)}</div>
            {children.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-3 border-l border-stone-200/70 dark:border-stone-800 ml-1">
                {children.map((child: any) => chip(child, true))}
              </div>
            )}
          </div>
        ))}
      </div>
    </FilterSection>
  );
};
