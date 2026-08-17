import React from "react";
import Link from "next/link";
import { Collection } from "@/lib/mockCollections";
import { ArrowRight, Sparkles } from "lucide-react";

export interface CollectionCardProps {
  collection: Collection & {
    tagline?: string;
    curator?: string;
  };
  variant?: "default" | "featured";
  className?: string;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  variant = "default",
  className = "",
}) => {
  if (variant === "featured") {
    return (
      <Link
        href={`/collections/${collection.slug}`}
        className={`group relative block w-full overflow-hidden rounded-3xl bg-stone-950 shadow-md hover:shadow-2xl hover:shadow-stone-950/30 transition-all duration-500 border border-stone-800/50 hover:border-amber-500/40 ${className}`}
        aria-label={`Browse ${collection.title} collection`}
      >
        <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full overflow-hidden bg-stone-900">
          <img
            src={collection.imageUrl}
            alt={collection.title}
            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-1000 ease-out pointer-events-none"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/45 to-stone-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/40 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-stone-950" />
              Editor's Spotlight
            </span>
          </div>

          {/* Bottom Left Content */}
          <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-1.5 max-w-xl text-left">
              <span className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase tracking-widest">
                Curated Lookbook
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-serif font-bold text-white leading-tight group-hover:text-amber-200 transition-colors">
                {collection.title}
              </h2>
              {collection.description && (
                <p className="text-xs sm:text-sm text-stone-300 line-clamp-2 leading-relaxed font-normal">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <span className="px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white group-hover:bg-amber-400 group-hover:text-stone-950 group-hover:border-amber-400 text-xs font-bold transition-all flex items-center gap-2">
                <span>Explore Capsule</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className={`group relative block w-full overflow-hidden rounded-2xl sm:rounded-[24px] bg-stone-950 shadow-sm hover:shadow-xl hover:shadow-stone-950/25 transition-all duration-500 hover:-translate-y-1 border border-stone-800/40 hover:border-amber-500/30 ${className}`}
      aria-label={`Browse ${collection.title} collection`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-900">
        <img
          src={collection.imageUrl}
          alt={collection.title}
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none"
          loading="lazy"
        />
        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/35 to-transparent" />

        {/* Featured badge */}
        {collection.isFeatured && (
          <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[8.5px] font-extrabold uppercase tracking-widest select-none shadow-xs">
            Featured
          </div>
        )}

        {/* Icon badge */}
        {collection.icon && (
          <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm select-none">
            {collection.icon}
          </div>
        )}
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-5 flex flex-col gap-1.5 text-left">
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-sm sm:text-base md:text-lg font-serif font-bold text-white leading-tight group-hover:text-amber-300 transition-colors duration-300 line-clamp-2">
            {collection.title}
          </h3>
          <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-amber-400 group-hover:border-amber-400 transition-all duration-300">
            <ArrowRight
              className="w-3 h-3 text-white group-hover:text-stone-950 transition-colors duration-300 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </div>
        </div>

        {/* Description */}
        {collection.description && (
          <p className="hidden sm:block text-[11px] text-stone-300/80 leading-relaxed line-clamp-1 font-normal">
            {collection.description}
          </p>
        )}

        {/* Meta strip */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-white/10 mt-0.5">
          <span className="text-[9.5px] font-extrabold text-amber-400 uppercase tracking-widest">
            {collection.productCount || "12"} Pieces
          </span>
          <span className="text-white/20 text-[9px]">·</span>
          <span className="text-[9.5px] text-stone-400 font-medium uppercase tracking-wide truncate">
            Boutique Edit
          </span>
        </div>
      </div>
    </Link>
  );
};
