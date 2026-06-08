import React from "react";
import Image from "next/image";
import { Boutique } from "@/lib/mockBoutiques";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@hive/ui";

export interface BoutiqueCardProps {
  boutique: Boutique;
  className?: string;
}

export const BoutiqueCard: React.FC<BoutiqueCardProps> = ({
  boutique,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-white border border-hive-border/60 rounded-2xl sm:rounded-[24px] group shadow-sm hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300 flex flex-col p-1.5 sm:p-3",
        className
      )}
    >
      {/* ── Image area — same 4:5 ratio as product cards ── */}
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl bg-hive-cream/20">
        <Image
          src={boutique.imageUrl}
          alt={boutique.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transform group-hover:scale-105 transition-transform duration-500 pointer-events-none"
          priority={false}
        />

        {/* Verified badge — smaller on mobile */}
        {boutique.verified && (
          <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 bg-white/95 backdrop-blur-sm border border-hive-border/40 text-hive-amber text-[8px] sm:text-[10px] font-extrabold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl flex items-center gap-1 shadow-sm select-none z-10">
            <ShieldCheck className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-hive-amber" />
            <span className="hidden sm:inline">VERIFIED</span>
          </div>
        )}

        {/* Same-day badge — hidden on very small mobile */}
        {boutique.sameDayDelivery && (
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-3 sm:left-3 hidden xs:flex sm:flex bg-white/90 backdrop-blur-sm border border-hive-border/40 text-hive-dark text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl items-center gap-1 z-10 shadow-sm select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="hidden sm:inline">Same Day</span>
          </div>
        )}
      </div>

      {/* ── Card content ── */}
      <div className="px-1 pt-2 pb-1.5 sm:px-1.5 sm:py-3 flex flex-col text-left">
        {/* Boutique name */}
        <h3 className="text-xs sm:text-sm font-serif font-extrabold text-hive-dark group-hover:text-hive-amber transition-colors duration-300 tracking-wide leading-tight line-clamp-1">
          {boutique.name}
        </h3>

        {/* Rating row */}
        <div className="flex items-center gap-1 mt-1 sm:mt-2">
          <span className="text-hive-amber text-[10px] sm:text-xs">★</span>
          <span className="text-[10px] sm:text-[11px] font-extrabold text-hive-dark">{boutique.rating}</span>
          <span className="hidden sm:inline text-[10px] text-hive-text-muted">({boutique.reviewCount})</span>
          <span className="hidden sm:inline text-hive-border/80 text-[10px]">•</span>
          <span className="hidden sm:inline text-[10px] text-hive-text-muted">{boutique.city}</span>
        </div>

        {/* Bottom row */}
        <div className="mt-1.5 pt-1.5 border-t border-hive-border/40 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs font-extrabold text-hive-text-muted uppercase tracking-wider">
            {boutique.productCount} Designs
          </span>
          <button
            aria-label={`View ${boutique.name}`}
            className="hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-hive-amber hover:text-hive-gold transition-colors group/cta"
          >
            View
            <ArrowRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5" />
          </button>
          {/* Mobile: chevron-only button */}
          <button
            aria-label={`View ${boutique.name}`}
            className="sm:hidden flex items-center justify-center w-6 h-6 rounded-lg border border-hive-border/50 text-hive-amber bg-hive-comb/10 hover:bg-hive-comb/20 transition-colors"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
