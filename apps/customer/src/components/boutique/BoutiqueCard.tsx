import React from "react";
import Image from "next/image";
import Link from "next/link";
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
    <Link
      href={`/products?boutiqueId=${boutique.id}`}
      className={cn(
        "relative w-full overflow-hidden bg-white border border-stone-200/80 rounded-2xl group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ease-out flex flex-col p-3 sm:p-4 cursor-pointer",
        className
      )}
    >
      {/* ── Image area — same 4:5 ratio as product cards ── */}
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl bg-stone-50">
        <Image
          src={boutique.imageUrl}
          alt={boutique.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transform group-hover:scale-[1.02] transition-transform duration-500 ease-out pointer-events-none"
          priority={false}
        />

        {/* Same-day badge — bottom-left overlay (looks like an editorial apparel label) */}
        {boutique.sameDayDelivery && (() => {
          const currentHour = new Date().getHours();
          const deliveryText = (currentHour >= 8 && currentHour < 20) ? "Delivers Today" : "Delivers Tomorrow";
          return (
            <div className="absolute bottom-2.5 left-2.5 bg-white/95 border border-stone-200/30 text-stone-855 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm select-none tracking-widest uppercase z-10">
              {deliveryText}
            </div>
          );
        })()}
      </div>

      {/* ── Card content ── */}
      <div className="pt-4 flex flex-col text-left">
        
        {/* Boutique name and verification check */}
        <div className="flex items-center gap-1.5">
          <h3 className="text-base sm:text-lg md:text-xl font-serif font-bold text-stone-900 group-hover:text-amber-700 transition-colors duration-200 tracking-wide leading-tight line-clamp-1">
            {boutique.name}
          </h3>
          {boutique.verified && (
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2.5} />
          )}
        </div>

        {/* Location details row */}
        <div className="flex items-center gap-1 mt-1.5 select-none text-[11px] sm:text-xs text-stone-500 font-medium">
          <span>{boutique.city}</span>
        </div>

        {/* Bottom row */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-widest select-none">
            {boutique.productCount} Products
          </span>
          <span
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 group-hover:text-amber-850 transition-colors duration-200 group/cta"
          >
            View
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
};
