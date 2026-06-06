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
      className={`group relative block w-full overflow-hidden rounded-[28px] bg-hive-dark shadow-md hover:shadow-2xl hover:shadow-hive-dark/20 transition-all duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold focus-visible:ring-offset-2 ${className}`}
      aria-label={`Browse ${collection.title} collection`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <img
          src={collection.imageUrl}
          alt={collection.title}
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          loading="lazy"
        />
        {/* Dark gradient overlay — stronger at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-hive-dark/90 via-hive-dark/30 to-transparent" />

        {/* Featured badge */}
        {collection.isFeatured && (
          <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-hive-gold text-hive-dark text-[9px] font-extrabold uppercase tracking-widest select-none">
            Featured
          </div>
        )}

        {/* Icon badge — top right */}
        <div className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-lg select-none">
          {collection.icon}
        </div>
      </div>

      {/* Content overlay — pinned to bottom of image */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-2">
        {/* Title row */}
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-lg md:text-xl font-serif font-extrabold text-white leading-tight group-hover:text-hive-gold transition-colors duration-300">
            {collection.title}
          </h3>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-hive-gold group-hover:border-hive-gold transition-all duration-300">
            <ArrowRight
              className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-white/70 leading-relaxed line-clamp-2 max-w-[260px]">
          {collection.description}
        </p>

        {/* Meta strip */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/15">
          <span className="text-[10px] font-extrabold text-hive-gold uppercase tracking-widest">
            {collection.productCount} Pieces
          </span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] text-white/50 font-medium uppercase tracking-wide">
            Boutique Curated
          </span>
        </div>
      </div>
    </Link>
  );
};
