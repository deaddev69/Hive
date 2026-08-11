"use client";

import React from "react";
import { Zap, Sparkles, Headphones, ShieldCheck } from "lucide-react";

const trustPillars = [
  {
    icon: Zap,
    title: "90-Minute Fast Delivery",
    subtitle: "Fresh designer styles delivered to your door in under 90 minutes",
    badge: "HYPERLOCAL",
  },
  {
    icon: Sparkles,
    title: "Curated Designer Fashion",
    subtitle: "Exclusive collections from verified independent labels & designers",
    badge: "EXCLUSIVE",
  },
  {
    icon: Headphones,
    title: "Direct Boutique Support",
    subtitle: "Dedicated assistance & order updates for every single outfit",
    badge: "ASSISTANCE",
  },
  {
    icon: ShieldCheck,
    title: "100% Safe Payments",
    subtitle: "Seamless checkout with UPI, Cards, NetBanking & Cash on Delivery",
    badge: "SECURE",
  },
];

export const TrustStrip: React.FC = () => {
  return (
    <section className="relative overflow-hidden w-full bg-gradient-to-b from-[#FFFDF9] via-[#FAF5EC] to-[#FFFDF9] py-6 sm:py-8 md:py-10 border-y border-amber-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Subtle Minimalist Luxury Header */}
        <div className="flex flex-col items-center justify-center text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase mb-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
            <span>The Hive Promise</span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-bold text-hive-dark tracking-tight">
            Why Kochi Loves Shopping on Hive
          </h2>
        </div>

        {/* 4 Pillars Grid (2x2 on Mobile, 4-col on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {trustPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col p-3.5 sm:p-4 rounded-2xl bg-white/80 backdrop-blur-xs border border-amber-200/60 shadow-2xs hover:shadow-sm hover:border-amber-400/60 transition-all duration-300 text-left"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform duration-300">
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase text-amber-700/80 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-serif font-bold text-hive-dark leading-snug mb-1 group-hover:text-amber-900 transition-colors">
                  {item.title}
                </h3>

                <p className="text-[10px] sm:text-[11.5px] text-stone-600 leading-relaxed line-clamp-2">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
