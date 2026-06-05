import React from "react";
import { BoutiqueCard } from "./BoutiqueCard";
import { mockBoutiques } from "@/lib/mockBoutiques";
import { ArrowRight } from "lucide-react";

export const BoutiqueSpotlight: React.FC = () => {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-16 flex flex-col gap-8">
      {/* Spotlight Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-hive-border/40 pb-5">
        <div className="flex flex-col text-left items-start gap-1">
          <span className="text-[10px] font-bold text-hive-amber tracking-widest uppercase">
            DESIGNER SPOTLIGHT
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold font-serif text-hive-dark">
            Featured Boutiques
          </h2>
          <p className="text-sm text-hive-text-muted mt-1 max-w-xl">
            Discover independent designers and boutique fashion houses near you.
          </p>
        </div>

        {/* View All CTA Link */}
        <button className="text-xs font-bold uppercase tracking-widest text-hive-amber hover:text-hive-gold flex items-center gap-1.5 transition-colors self-start sm:self-auto group/header">
          View All Boutiques
          <ArrowRight className="w-4 h-4 transition-transform group-hover/header:translate-x-1" />
        </button>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="flex gap-6 overflow-x-auto w-full pb-4 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory">
        {mockBoutiques.map((boutique) => (
          <div
            key={boutique.id}
            className="min-w-[100%] sm:min-w-[calc(50%-12px)] lg:min-w-[calc(33.333%-16px)] snap-align-start flex-shrink-0"
          >
            <BoutiqueCard boutique={boutique} />
          </div>
        ))}
      </div>
    </section>
  );
};
