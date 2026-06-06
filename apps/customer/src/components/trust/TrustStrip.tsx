import React from "react";
import { TrustCard } from "./TrustCard";
import { Ruler, Store, Truck, RefreshCw } from "lucide-react";

const trustItems = [
  {
    title: "Real Measurements",
    description: "Every product includes detailed measurement matrices instead of generic sizing.",
    icon: Ruler,
  },
  {
    title: "Verified Boutiques",
    description: "All boutiques are reviewed and approved before joining Hive.",
    icon: Store,
  },
  {
    title: "Same-Day Delivery",
    description: "Eligible orders are delivered on the same day within serviceable regions.",
    icon: Truck,
  },
  {
    title: "48-Hour Replacements",
    description: "Easy replacements supported with continuous unboxing video proof.",
    icon: RefreshCw,
  },
];

export const TrustStrip: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF5] via-[#FFFDF5]/40 to-white border-t border-b border-hive-border/60 py-16 lg:py-20 w-full">
      {/* Background Honeycomb SVG with Low Opacity */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-20">
        <svg className="w-full h-full stroke-hive-gold/10" aria-hidden="true">
          <defs>
            <pattern id="trust-honeycomb" patternUnits="userSpaceOnUse" width="52" height="90">
              <path fill="none" strokeWidth="1" d="m0,15 26-15 26,15v30l-26,15-26-15z M26,60v30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#trust-honeycomb)" />
        </svg>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center text-center gap-2 border-b border-hive-border/40 pb-6 mb-12 max-w-xl mx-auto">
          <span className="text-[10px] font-bold text-hive-amber tracking-widest uppercase">
            HIVE ASSURANCE
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold font-serif text-hive-dark">
            Why Customers Trust Hive
          </h2>
          <p className="text-sm text-hive-text-muted mt-1 leading-relaxed">
            A premium boutique shopping experience backed by transparency and service quality.
          </p>
        </div>

        {/* 4 Cards Grid - 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trustItems.map((item, idx) => (
            <TrustCard
              key={idx}
              title={item.title}
              description={item.description}
              icon={item.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
