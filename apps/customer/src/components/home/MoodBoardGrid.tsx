import React from "react";
import Link from "next/link";
import { cn } from "@hive/ui";

interface MoodBoardGridProps {
  title?: string;
  subtitle?: string;
  collections: any[];
}

export function MoodBoardGrid({ title = "How are you dressing today?", subtitle, collections }: MoodBoardGridProps) {
  if (!collections || collections.length === 0) return null;

  // Aesthetic backgrounds for Pinterest style blocks
  const backgrounds = [
    "bg-rose-50",
    "bg-amber-50",
    "bg-slate-50",
    "bg-indigo-50",
    "bg-rose-50",
    "bg-slate-50",
    "bg-emerald-50",
    "bg-amber-50"
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2.5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {collections.map((col, index) => {
          const bg = backgrounds[index % backgrounds.length];
          return (
            <Link href={`/collections/${col.slug}`} key={col._id}>
              <div className={cn("aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 p-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs border border-slate-100", bg)}>
                <div className="text-4xl">
                  {col.emoji || "✨"}
                </div>
                <span className="text-[11px] font-bold text-slate-700 text-center leading-tight line-clamp-2">
                  {col.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
