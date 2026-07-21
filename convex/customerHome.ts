import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getPublicUrl } from "./media/api";
import { v } from "convex/values";
import { enrichProducts } from "./products";
import { haversineKm } from "./lib/serviceability";

export const getCustomerHomeData = query({
  args: {
    city: v.optional(v.string()),
    userLat: v.optional(v.number()),
    userLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const bannersPromise = (async () => {
      const bannersRaw = await ctx.db
        .query("banners")
        .withIndex("by_active_and_sortOrder", (q) => q.eq("active", true))
        .collect();

      return await Promise.all(
        bannersRaw.slice(0, 10).map(async (b) => {
          let desktopImageUrl = "";
          if (b.desktopImageUrl) {
            if (typeof b.desktopImageUrl === "object") {
              desktopImageUrl = getPublicUrl(b.desktopImageUrl as any) || "";
            } else if (typeof b.desktopImageUrl === "string" && b.desktopImageUrl.startsWith("http")) {
              desktopImageUrl = b.desktopImageUrl;
            } else if (typeof b.desktopImageUrl === "string") {
              desktopImageUrl = (await ctx.storage.getUrl(b.desktopImageUrl as any)) || b.desktopImageUrl;
            }
          }
          let mobileImageUrl = "";
          if (b.mobileImageUrl) {
            if (typeof b.mobileImageUrl === "object") {
              mobileImageUrl = getPublicUrl(b.mobileImageUrl as any) || "";
            } else if (typeof b.mobileImageUrl === "string" && b.mobileImageUrl.startsWith("http")) {
              mobileImageUrl = b.mobileImageUrl;
            } else if (typeof b.mobileImageUrl === "string") {
              mobileImageUrl = (await ctx.storage.getUrl(b.mobileImageUrl as any)) || b.mobileImageUrl;
            }
          }
          return {
            _id: b._id,
            title: b.title,
            subtitle: b.subtitle,
            desktopImageUrl: desktopImageUrl || "",
            mobileImageUrl: mobileImageUrl || desktopImageUrl || "",
            ctaText: b.ctaText,
            ctaLink: b.ctaLink,
            targetType: "category",
            targetValue: "all",
          };
        })
      );
    })();

    // 2. Fetch active homepage configuration (Promise 2)
    const configPromise = (async () => {
      const config = await ctx.db.query("homepageConfig").first();
      if (config) return config;
      return {
        activeHeroBannerIds: [],
        featuredCategoryIds: [],
        featuredBoutiqueIds: [],
        enableOccasionSection: true,
        enableMostLovedSection: true,
        trendingSectionTitle: "Trending Near You",
        enableTrendingSection: true,
        updatedAt: now,
      };
    })();

    // 3. Fetch active approved boutiques (Promise 3)
    const boutiquesPromise = (async () => {
      const list = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .collect();

      const filtered = list.filter(
        (b) =>
          !b.boutiqueName.startsWith("Chaos Test Boutique") &&
          !b.boutiqueName.startsWith("Mock Boutique") &&
          b.isTestData !== true
      );

      // Take first 20 approved boutiques
      const boutiquesSubset = filtered.slice(0, 20);

      return await Promise.all(
        boutiquesSubset.map(async (b) => {
          let logoUrl = b.logoUrl;
          if (logoUrl && typeof logoUrl === "string" && !logoUrl.startsWith("http")) {
            logoUrl = (await ctx.storage.getUrl(logoUrl as any)) || logoUrl;
          }
          let bannerUrl = b.bannerUrl;
          if (bannerUrl && typeof bannerUrl === "string" && !bannerUrl.startsWith("http")) {
            bannerUrl = (await ctx.storage.getUrl(bannerUrl as any)) || bannerUrl;
          }

          let tier: "Bronze" | "Silver" | "Gold" | "Elite" = "Bronze";
          if (b.merchantTier) tier = b.merchantTier;

          return {
            _id: b._id,
            boutiqueName: b.boutiqueName,
            name: b.boutiqueName,
            description: b.description || "Designer Boutique",
            slug: b.slug || b.boutiqueName.toLowerCase().replace(/\s+/g, "-"),
            logoUrl,
            bannerUrl,
            city: b.addressDetails?.city || "Kochi",
            addressDetails: {
              city: b.addressDetails?.city || "Kochi",
              lat: b.latitude,
              lng: b.longitude,
            },
            latitude: b.latitude,
            longitude: b.longitude,
            deliveryRadiusKm: b.deliveryRadiusKm,
            hiveScore: b.hiveScore || 96,
            totalOrders: b.totalOrders || 12,
            merchantType: b.merchantType || "women_fashion",
            status: b.status,
            merchantTier: tier,
            trustTier: tier,
            averagePrepTime: b.averagePrepTime ?? 30,
            activeApprovedProductCount: b.activeApprovedProductCount ?? 0,
          };
        })
      );
    })();

    // 4. Fetch active categories (Promise 4)
    const categoriesPromise = (async () => {
      const categoriesList = await ctx.db
        .query("categories")
        .withIndex("by_active_and_sortOrder", (q) => q.eq("active", true))
        .collect();

      const categoriesSubset = categoriesList.slice(0, 30);

      return await Promise.all(
        categoriesSubset.map(async (cat) => {
          let imageUrl = cat.imageUrl || "";
          if (cat.imageStorageId) {
            if (typeof cat.imageStorageId === "object") {
              imageUrl = getPublicUrl(cat.imageStorageId as any) || imageUrl;
            } else if (typeof cat.imageStorageId === "string" && cat.imageStorageId.startsWith("http")) {
              imageUrl = cat.imageStorageId;
            } else {
              imageUrl = (await ctx.storage.getUrl(cat.imageStorageId as any)) || imageUrl;
            }
          }
          let homepageImageUrl = cat.homepageImage || "";
          if (homepageImageUrl && !homepageImageUrl.startsWith("http")) {
            homepageImageUrl = (await ctx.storage.getUrl(homepageImageUrl as any)) || homepageImageUrl;
          }
          return {
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            imageUrl,
            homepageImageUrl,
            homepageOrder: cat.homepageOrder,
            parentId: cat.parentId,
            showOnHomepage: cat.showOnHomepage,
            sortOrder: cat.sortOrder,
            active: cat.active,
          };
        })
      );
    })();

    // Execute the promises to have base info
    const [banners, config, boutiques, categories] = await Promise.all([
      bannersPromise,
      configPromise,
      boutiquesPromise,
      categoriesPromise,
    ]);

    const approvedBoutiqueIds = new Set(boutiques.map((b) => b._id.toString()));

    // 5. Concurrent database queries
    const [activeProductsRaw, performances, newArrivalsRaw] = await Promise.all([
      ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("active", true))
        .take(150),
      ctx.db
        .query("productPerformance")
        .withIndex("by_salesRevenue")
        .order("desc")
        .take(50),
      ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("active", true))
        .order("desc")
        .take(50),
    ]);

    // Filter and enrich active products
    let activeProductsFiltered = activeProductsRaw
      .filter((p) => approvedBoutiqueIds.has(p.boutiqueId.toString()) && p.adminHidden !== true && (!p.approvalStatus || p.approvalStatus === "approved"));
    let enrichedProducts = await enrichProducts(ctx, activeProductsFiltered, false);

    // Filter and enrich new arrivals
    let newArrivalsFiltered = newArrivalsRaw
      .filter((p) => approvedBoutiqueIds.has(p.boutiqueId.toString()) && p.adminHidden !== true && (!p.approvalStatus || p.approvalStatus === "approved"));
    const newArrivals = await enrichProducts(ctx, newArrivalsFiltered.slice(0, 12), false);

    // Apply hyperlocal distance/ETA calculation if coordinates are provided
    if (args.userLat !== undefined && args.userLng !== undefined) {
      const startLat = Math.round(args.userLat * 1000) / 1000;
      const startLng = Math.round(args.userLng * 1000) / 1000;

      const cachedDistances = await ctx.db
        .query("cachedRoadDistances")
        .withIndex("by_start_end", (q) => q.eq("startLat", startLat).eq("startLng", startLng))
        .collect();

      const cacheMap = new Map<string, { distanceKm: number; durationMin: number }>();
      for (const cd of cachedDistances) {
        const key = `${cd.endLat.toFixed(6)},${cd.endLng.toFixed(6)}`;
        cacheMap.set(key, { distanceKm: cd.distanceKm, durationMin: cd.durationMin });
      }

      const scoredProducts = enrichedProducts
        .map((p) => {
          const bLat = p.boutique?.latitude;
          const bLng = p.boutique?.longitude;
          if (bLat === undefined || bLng === undefined) return null;

          const cacheKey = `${bLat.toFixed(6)},${bLng.toFixed(6)}`;
          const cached = cacheMap.get(cacheKey);

          let distanceKm = 0;
          let durationMin = 0;
          if (cached) {
            distanceKm = cached.distanceKm;
            durationMin = cached.durationMin;
          } else {
            distanceKm = haversineKm(args.userLat!, args.userLng!, bLat, bLng);
            durationMin = (distanceKm / 25) * 60;
          }

          const effectiveRadius = p.boutique?.deliveryRadiusKm ?? 15;
          if (distanceKm > effectiveRadius) return null;

          const prepTime = p.boutique?.prepTimeMinutes ?? 30;
          const eta = durationMin + prepTime;

          let etaScore = 0;
          if (eta <= 45) etaScore = 100;
          else if (eta <= 90) etaScore = 85;
          else if (eta <= 120) etaScore = 60;
          else if (eta <= 180) etaScore = 30;
          else etaScore = 0;

          let distanceScore = 100;
          if (distanceKm > 1.0) {
            distanceScore = Math.max(0, Math.min(100, 100 - ((distanceKm - 1.0) / (15.0 - 1.0)) * 100));
          }

          const fulfillmentScore = 100; // placeholder
          const sameDaySla = p.sameDayEligible ? 100 : 0;
          const popularityScore = p.featured ? 100 : 0;

          const hiveScore = Math.round(
            0.35 * etaScore +
            0.25 * distanceScore +
            0.20 * fulfillmentScore +
            0.10 * sameDaySla +
            0.10 * popularityScore
          );

          return {
            product: {
              ...p,
              estimatedDistanceKm: distanceKm,
              estimatedDurationMin: durationMin,
              estimatedEtaMinutes: Math.round(eta),
              hiveScore,
            },
            score: hiveScore,
          };
        })
        .filter(Boolean) as { product: any; score: number }[];

      scoredProducts.sort((a, b) => b.score - a.score);
      enrichedProducts = scoredProducts.map((sp) => sp.product);
    }

    const products = enrichedProducts.slice(0, 40);

    // 6. Fetch most loved products
    const sortedPerformances = [...performances].sort((a, b) => b.salesRevenue - a.salesRevenue);

    const mostLovedProductIds = sortedPerformances.map((p) => p.productId);
    let mostLovedRaw = (
      await Promise.all(mostLovedProductIds.slice(0, 50).map((pid) => ctx.db.get(pid)))
    ).filter(
      (prod) =>
        prod &&
        prod.active &&
        !prod.adminHidden &&
        (!prod.approvalStatus || prod.approvalStatus === "approved") &&
        approvedBoutiqueIds.has(prod.boutiqueId.toString())
    ) as any[];

    if (args.userLat !== undefined && args.userLng !== undefined) {
      mostLovedRaw = mostLovedRaw.filter((p) => {
        const b = boutiques.find((btq) => btq._id.toString() === p.boutiqueId.toString());
        if (!b || b.latitude === undefined || b.longitude === undefined) return false;
        const dist = haversineKm(args.userLat!, args.userLng!, b.latitude, b.longitude);
        return dist <= b.deliveryRadiusKm;
      });
    }

    // Fallback backfill if mostLovedRaw is empty
    if (mostLovedRaw.length === 0) {
      mostLovedRaw = activeProductsFiltered.slice(0, 12);
    }

    const enrichedMostLoved = await enrichProducts(ctx, mostLovedRaw.slice(0, 12), false);

    return {
      banners,
      config,
      products,
      boutiques,
      categories,
      mostLoved: enrichedMostLoved,
      newArrivals,
    };
  },
});
