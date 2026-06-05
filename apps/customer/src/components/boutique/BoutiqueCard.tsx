import React from "react";
import { Boutique } from "@/lib/mockBoutiques";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@hive/ui";

export interface BoutiqueCardProps {
  boutique: Boutique;
  className?: string;
}

export const BoutiqueCard: React.FC<BoutiqueCardProps> = ({ boutique, className }) => {
  return (
    <div
      className={cn(
        "w-full overflow-hidden bg-white border border-hive-border/60 rounded-[32px] group shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col",
        className
      )}
    >
      {/* Cover Image Wrapper */}
      <div className="relative w-full aspect-[16/10] overflow-hidden rounded-t-[30px] bg-hive-cream/20">
        <img
          src={boutique.imageUrl}
          alt={boutique.name}
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500 pointer-events-none"
        />

        {/* Verified Badge */}
        {boutique.verified && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-hive-border/40 text-hive-amber text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm select-none z-10">
            <ShieldCheck className="w-3.5 h-3.5 text-hive-amber" />
            VERIFIED
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-6 flex flex-col justify-between flex-1 gap-4 text-left">
        <div>
          {/* Header row: Name, Tagline */}
          <h3 className="text-lg font-serif font-extrabold text-hive-dark group-hover:text-hive-amber transition-colors duration-300 tracking-wide">
            {boutique.name}
          </h3>
          <p className="text-xs text-hive-text-muted mt-1.5 leading-relaxed line-clamp-2 min-h-[36px]">
            {boutique.tagline}
          </p>

          {/* Metadata Row: Rating & City */}
          <div className="flex items-center gap-1.5 text-[11px] text-hive-text-muted mt-3 font-sans">
            <span className="text-hive-amber text-xs">★</span>
            <span className="font-extrabold text-hive-dark">{boutique.rating}</span>
            <span>({boutique.reviewCount} reviews)</span>
            <span className="text-hive-border/80 font-normal">•</span>
            <span>{boutique.city}</span>
          </div>

          {/* Specialties Display */}
          <div className="flex flex-wrap gap-2 mt-3.5">
            {boutique.specialties.map((spec) => (
              <span
                key={spec}
                className="inline-block bg-hive-comb/25 text-hive-amber text-[9px] font-extrabold px-2.5 py-0.5 rounded border border-hive-border/40 uppercase tracking-wider select-none"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom row: Delivery & Products */}
        <div className="flex flex-col gap-3.5 mt-2 pt-4 border-t border-hive-border/40 w-full">
          <div className="flex items-center justify-between text-xs w-full">
            <div>
              {boutique.sameDayDelivery ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wide">
                  Same Day Delivery
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-50 text-slate-600 border border-slate-200 uppercase tracking-wide">
                  Standard Delivery
                </span>
              )}
            </div>
            <span className="text-[11px] font-extrabold text-hive-text-muted uppercase tracking-wider">
              {boutique.productCount} Designs
            </span>
          </div>

          {/* CTA Link */}
          <button className="text-xs font-bold uppercase tracking-widest text-hive-amber hover:text-hive-gold flex items-center gap-1 transition-colors duration-200 mt-0.5 self-start group/cta">
            View Boutique
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
