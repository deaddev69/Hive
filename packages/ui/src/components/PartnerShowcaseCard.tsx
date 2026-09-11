"use client";

import React from "react";
import { cn } from "../utils/cn";
import { MapPin } from "lucide-react";

export interface ShowcaseBrandData {
  _id: string;
  name: string;
  slug: string;
  visualUrl?: string;
  logoUrl?: string;
  area: string;
  city: string;
  category: string;
}

export interface PartnerShowcaseCardProps {
  brand: ShowcaseBrandData;
  className?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

/**
 * PartnerShowcaseCard
 *
 * Shared luxury brand card component used identically in:
 * 1. Customer About Page Marquee
 * 2. Admin Partner Showcase Live Preview
 *
 * Customer terminology strictly enforced: Never mentions "boutique".
 */
export const PartnerShowcaseCard: React.FC<PartnerShowcaseCardProps> = ({
  brand,
  className = "",
  action,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative w-60 sm:w-64 aspect-[3/4] shrink-0 select-none overflow-hidden rounded-2xl sm:rounded-3xl bg-hive-dark border border-white/10 shadow-md hover:shadow-xl transition-all duration-300",
        onClick ? "cursor-pointer" : "",
        className
      )}
    >
      {/* Background Visual */}
      {brand.visualUrl ? (
        <img
          src={brand.visualUrl}
          alt={brand.name}
          loading="lazy"
          className="h-full w-full object-cover grayscale contrast-[1.05] brightness-95 group-hover:grayscale-0 group-hover:scale-105 group-hover:brightness-100 transition-all duration-500 ease-out"
        />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center bg-hive-dark p-6 text-center">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="w-16 h-16 rounded-full object-cover border border-white/20 shadow-lg mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-hive-gold font-serif text-2xl font-bold mb-3">
              {brand.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs uppercase tracking-widest text-hive-gold/70 font-semibold">
            Partner Brand
          </span>
        </div>
      )}

      {/* Luxury Vignette Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-300" />

      {/* Top Action / Badge Slot */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white/90 tracking-wide uppercase">
          <MapPin className="w-2.5 h-2.5 text-hive-gold" />
          <span className="truncate max-w-[120px]">{brand.area || brand.city || "Kochi"}</span>
        </span>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Bottom Brand Identity */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex flex-col gap-1 z-10 text-left">
        <span className="text-[10.5px] uppercase tracking-widest text-hive-gold/90 font-bold">
          {brand.category}
        </span>
        <h3 className="text-base sm:text-lg font-serif font-bold text-hive-cream tracking-tight leading-snug group-hover:text-hive-gold transition-colors truncate">
          {brand.name}
        </h3>
        <p className="text-[11px] text-hive-cream/70 font-medium truncate flex items-center gap-1.5">
          <span>{brand.city || "Kochi"}</span>
          <span>•</span>
          <span className="text-hive-gold/90 group-hover:underline">View Collection &rarr;</span>
        </p>
      </div>
    </div>
  );
};
