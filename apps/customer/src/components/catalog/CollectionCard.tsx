import React from "react";
import Link from "next/link";
import { Collection } from "@/lib/mockCollections";
import { ArrowRight } from "lucide-react";

export interface CollectionCardProps {
  collection: Collection;
  className?: string;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  className = "",
}) => {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className={`group relative block w-full overflow-hidden rounded-2xl sm:rounded-[28px] bg-hive-dark shadow-sm hover:shadow-xl hover:shadow-hive-dark/20 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2 ${className}`}
      aria-label={`Browse ${collection.title} collection`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden bg-zinc-900">
        <img
          src={collection.imageUrl}
          alt={collection.title}
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          loading="lazy"
        />
        {/* Dark gradient overlay — stronger at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-hive-dark/95 via-hive-dark/40 to-transparent" />

        {/* Featured badge */}
        {collection.isFeatured && (
          <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-hive-gold text-hive-dark text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest select-none shadow-xs">
            Featured
          </div>
        )}

        {/* Icon badge — top right */}
        {collection.icon && (
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-sm sm:text-lg select-none">
            {collection.icon}
          </div>
        )}
      </div>

      {/* Content overlay — pinned to bottom of image */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 flex flex-col gap-1 sm:gap-2">
        {/* Title row */}
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-sm sm:text-lg md:text-xl font-serif font-extrabold text-white leading-tight group-hover:text-hive-gold transition-colors duration-300 line-clamp-2">
            {collection.title}
          </h3>
          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-hive-gold group-hover:border-hive-gold transition-all duration-300">
            <ArrowRight
              className="w-3 h-3 sm:w-4 sm:h-4 text-white transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </div>
        </div>

        {/* Description — hidden on mobile for clean 2-col look */}
        {collection.description && (
          <p className="hidden sm:block text-xs text-white/70 leading-relaxed line-clamp-2 max-w-[260px]">
            {collection.description}
          </p>
        )}

        {/* Meta strip */}
        <div className="flex items-center gap-1.5 sm:gap-3 pt-1 sm:pt-2 border-t border-white/15 mt-0.5">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-hive-gold uppercase tracking-wider sm:tracking-widest">
            {collection.productCount} Pieces
          </span>
          <span className="text-white/20 text-[9px]">·</span>
          <span className="text-[9px] sm:text-[10px] text-white/50 font-medium uppercase tracking-wide truncate">
            Curated
          </span>
        </div>
      </div>
    </Link>
  );
};
