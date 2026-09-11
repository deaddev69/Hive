// convex/about.ts
// Queries and mutations for the customer About page and Partner Brand showcase.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { getPublicUrl } from "./media/api";
import { Doc } from "./_generated/dataModel";

export interface ShowcaseBrand {
  _id: string;
  name: string;
  slug: string;
  visualUrl?: string;
  logoUrl?: string;
  area: string;
  city: string;
  category: string;
}

function enrichBrand(b: Doc<"boutiques">): ShowcaseBrand {
  const visualUrl = b.bannerUrl
    ? getPublicUrl(b.bannerUrl as any, "card")
    : b.logoUrl
    ? getPublicUrl(b.logoUrl as any, "card")
    : undefined;

  const logoUrl = b.logoUrl
    ? getPublicUrl(b.logoUrl as any, "thumbnail")
    : undefined;

  const categoryMap: Record<string, string> = {
    women_fashion: "Women's Fashion",
    mens_fashion: "Men's Fashion",
    footwear: "Footwear & Shoes",
    handbags: "Handbags & Bags",
    bags: "Handbags & Bags",
    fragrance: "Fragrance & Scents",
    jewellery: "Jewellery & Accessories",
    multi_brand: "Curated Designer Label",
    multi_category: "Fashion & Lifestyle",
  };

  const rawCat = b.merchantType || b.storeCategory || "";
  const category = categoryMap[rawCat] || "Independent Fashion Label";

  return {
    _id: b._id,
    name: b.boutiqueName,
    slug: b.slug || b._id,
    visualUrl: visualUrl || undefined,
    logoUrl: logoUrl || undefined,
    area: b.area || b.city || "Kochi",
    city: b.city || "Kochi",
    category,
  };
}

function isBoutiqueEligible(b: Doc<"boutiques"> | null): b is Doc<"boutiques"> {
  if (!b) return false;
  if (b.status !== "APPROVED") return false;
  if (b.isTestData === true) return false;
  if (b.boutiqueName.startsWith("Chaos Test") || b.boutiqueName.startsWith("Mock")) return false;
  return true;
}

/**
 * Public query for the Customer About Page Partner Brand Showcase Marquee.
 *
 * Tri-state semantics:
 * 1. aboutPartnerBoutiqueIds === undefined: Initial/unconfigured state.
 *    Falls back to active approved partner brands, sorted deterministically.
 * 2. aboutPartnerBoutiqueIds === []: Explicitly empty state.
 *    Admin deliberately cleared the showcase. Returns empty list (no fallback).
 * 3. aboutPartnerBoutiqueIds === [id1, id2, ...]: Curated list.
 *    Renders strictly these brands in the exact admin-specified order,
 *    re-validating every ID against current eligibility so that suspended
 *    or deleted brands never leak into customer UI.
 */
export const getPartnerShowcase = query({
  args: {},
  handler: async (ctx): Promise<{ brands: ShowcaseBrand[]; isExplicitlyEmpty: boolean }> => {
    const config = await ctx.db.query("homepageConfig").first();
    const curatedIds = config?.aboutPartnerBoutiqueIds;

    // State 2: Explicitly curated empty
    if (Array.isArray(curatedIds) && curatedIds.length === 0) {
      return { brands: [], isExplicitlyEmpty: true };
    }

    // State 3: Curated ordered list
    if (Array.isArray(curatedIds) && curatedIds.length > 0) {
      const docs = await Promise.all(curatedIds.map((id) => ctx.db.get(id)));
      const validBrands: ShowcaseBrand[] = [];

      for (const doc of docs) {
        if (isBoutiqueEligible(doc)) {
          validBrands.push(enrichBrand(doc));
        }
      }

      return { brands: validBrands, isExplicitlyEmpty: false };
    }

    // State 1: Fallback (unconfigured / undefined)
    // Deterministic sort by createdAt desc, with _id as tie-breaker
    const allApproved = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

    const eligible = allApproved
      .filter(isBoutiqueEligible)
      .sort((a, b) => {
        const diff = (b.createdAt || 0) - (a.createdAt || 0);
        if (diff !== 0) return diff;
        return a._id.localeCompare(b._id);
      })
      .slice(0, 12);

    return {
      brands: eligible.map(enrichBrand),
      isExplicitlyEmpty: false,
    };
  },
});

/**
 * Admin query to get all approved partner brands alongside current showcase configuration.
 */
export const getAdminPartnerShowcase = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const config = await ctx.db.query("homepageConfig").first();
    const selectedIds = config?.aboutPartnerBoutiqueIds;

    const allApproved = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

    const eligible = allApproved.filter(isBoutiqueEligible);
    const enrichedList = eligible.map(enrichBrand);

    return {
      allBrands: enrichedList,
      selectedIds: selectedIds ?? null, // null if undefined
    };
  },
});

/**
 * Admin mutation to update the curated Partner Brands on the About Page.
 */
export const updatePartnerShowcase = mutation({
  args: {
    boutiqueIds: v.optional(v.array(v.id("boutiques"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const config = await ctx.db.query("homepageConfig").first();
    const now = Date.now();

    if (config) {
      await ctx.db.patch(config._id, {
        aboutPartnerBoutiqueIds: args.boutiqueIds,
        updatedAt: now,
      });
      return { success: true, count: args.boutiqueIds?.length ?? 0, isFallback: args.boutiqueIds === undefined };
    } else {
      await ctx.db.insert("homepageConfig", {
        activeHeroBannerIds: [],
        featuredCategoryIds: [],
        featuredBoutiqueIds: [],
        aboutPartnerBoutiqueIds: args.boutiqueIds,
        enableOccasionSection: true,
        enableMostLovedSection: true,
        trendingSectionTitle: "Trending Near You",
        enableTrendingSection: true,
        updatedAt: now,
      });
      return { success: true, count: args.boutiqueIds?.length ?? 0, isFallback: args.boutiqueIds === undefined };
    }
  },
});
