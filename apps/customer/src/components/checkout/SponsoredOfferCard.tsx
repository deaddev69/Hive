"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SponsoredOfferCardProps {
  promotion?: {
    _id: string;
    name: string;
    type?: string;
    ownerType?: "hive" | "partner";
    badge?: string;
    title: string;
    subtitle?: string;
    ctaText: string;
    ctaLink?: string;
    brandName?: string;
    creativeUrl?: string;
    aspectRatio?: "1:1" | "3:4" | "4:5" | "16:9";
  };
}

export const SponsoredOfferCard: React.FC<SponsoredOfferCardProps> = ({
  promotion,
}) => {
  if (!promotion) return null;

  // Resolve badge cleanly according to ownerType
  const resolvedBadge = (() => {
    if (promotion.badge) {
      return promotion.badge;
    }
    if (promotion.ownerType === "hive") {
      return "Featured on Hive";
    }
    return promotion.brandName
      ? `Sponsored · ${promotion.brandName}`
      : "Sponsored";
  })();

  const title = promotion.title;
  const subtitle = promotion.subtitle;
  const ctaLink = promotion.ctaLink || "/products";
  const brandName = promotion.brandName;
  const creativeUrl = promotion.creativeUrl;

  // Sanitize CTA text to ensure exactly one arrow is displayed
  const cleanCtaText = (promotion.ctaText || "Shop Now")
    .replace(/\s*(?:→|->|>)\s*$/, "")
    .trim();

  return (
    <div className="relative w-full rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs overflow-hidden flex items-center justify-between gap-3 sm:gap-4 group">
      {/* Left Column: Promotion Copy & Action */}
      <div className="flex-1 min-w-0 pr-1 space-y-1">
        <span className="text-[10px] font-semibold tracking-wider text-stone-400 uppercase block">
          {resolvedBadge}
        </span>

        <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-tight">
          {title}
        </h3>

        {subtitle && (
          <p className="text-xs text-stone-500 font-medium">
            {subtitle}
          </p>
        )}

        <div className="pt-2">
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-stone-300/90 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <span>{cleanCtaText}</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Right Column: Brand Creative with Framing */}
      {creativeUrl ? (
        <div className="relative w-28 h-28 sm:w-32 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60 flex items-center justify-center">
          <Image
            src={creativeUrl}
            alt={brandName || title}
            fill
            className="object-cover object-center group-hover:scale-103 transition-transform duration-300"
            sizes="128px"
            unoptimized
          />

          {brandName && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4 text-center">
              <p className="text-[9px] font-bold text-white uppercase tracking-wider truncate">
                {brandName}
              </p>
            </div>
          )}
        </div>
      ) : brandName ? (
        <div className="relative w-28 h-28 sm:w-32 sm:h-28 rounded-xl bg-stone-50 shrink-0 border border-stone-200/60 flex flex-col items-center justify-center p-2 text-center">
          <span className="text-xs font-bold text-stone-700 tracking-tight">{brandName}</span>
        </div>
      ) : null}
    </div>
  );
};

