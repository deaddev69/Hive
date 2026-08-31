import { ResolvedBlock, ResolvedProduct } from "./types";
import { CollectionService } from "../merchandising/CollectionService";
import { getPublicUrl } from "../../media/api";

/**
 * Resolves a banner image field that may be a string URL or an ImageAsset object.
 */
async function resolveBannerImage(ctx: any, imageField: any): Promise<string> {
  if (!imageField) return "";
  if (typeof imageField === "object" && imageField.objectKey) {
    return getPublicUrl(imageField, "pdp") || "";
  }
  if (typeof imageField === "string" && imageField.startsWith("http")) {
    return imageField.replace("https://cdn.hivenow.in/cdn-cgi/image/format=auto/banner_images/", "https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/banner_images/");
  }
  if (typeof imageField === "string") {
    try {
      const url = await ctx.storage.getUrl(imageField);
      return url || imageField;
    } catch {
      return imageField;
    }
  }
  return "";
}

/**
 * Resolves category image fields to public CDN URLs.
 */
async function resolveCategoryImage(ctx: any, cat: any) {
  let imageUrl = cat.imageUrl || null;
  if (cat.imageStorageId) {
    if (typeof cat.imageStorageId === "object" && cat.imageStorageId.objectKey) {
      imageUrl = getPublicUrl(cat.imageStorageId as any);
    } else if (typeof cat.imageStorageId === "string" && cat.imageStorageId.startsWith("http")) {
      imageUrl = cat.imageStorageId;
    } else if (typeof cat.imageStorageId === "string") {
      try {
        imageUrl = await ctx.storage.getUrl(cat.imageStorageId as any);
      } catch {
        imageUrl = cat.imageStorageId;
      }
    }
  }
  let homepageImageUrl = cat.homepageImage || null;
  if (cat.homepageImage && !cat.homepageImage.startsWith("http")) {
    try {
      homepageImageUrl = await ctx.storage.getUrl(cat.homepageImage as any);
    } catch {
      homepageImageUrl = cat.homepageImage;
    }
  }
  return {
    ...cat,
    imageUrl: imageUrl || homepageImageUrl || "",
    homepageImageUrl: homepageImageUrl || imageUrl || "",
  };
}

// Auto-sourced blocks (premiumCuration fallback, recommended, newArrivals) all draw from the
// same "top active products" pool. We over-fetch relative to what's actually displayed so that
// OperationsService's delivery-radius filter (which runs after this) still has enough candidates
// left to fill the block, instead of every such block collapsing to whatever tiny handful of
// products happen to survive a `take(20)`/`take(40)` head-slice.
const FALLBACK_POOL_MULTIPLIER = 5;
const FALLBACK_POOL_MIN = 60;
const FALLBACK_POOL_MAX = 150;

function poolSizeFor(maxProducts: number | undefined, defaultMax: number): number {
  const target = maxProducts || defaultMax;
  return Math.min(FALLBACK_POOL_MAX, Math.max(FALLBACK_POOL_MIN, target * FALLBACK_POOL_MULTIPLIER));
}

export class BlockService {
  /**
   * Scans a list of raw blocks and returns all Product IDs required across all blocks, plus a
   * cache of the "top active products" pools fetched along the way (keyed by pool size) so
   * hydrateBlocks doesn't have to re-run the same query a second time.
   */
  static async getBlockRequirements(
    ctx: any,
    blocksRaw: any[],
    userContext?: { userId?: string }
  ): Promise<{ productIds: string[]; activePoolCache: Map<number, any[]> }> {
    const requiredProductIds: string[] = [];
    const activePoolCache = new Map<number, any[]>();

    const getActivePool = async (size: number) => {
      const cached = activePoolCache.get(size);
      if (cached) return cached;
      const pool = (await ctx.db
        .query("products")
        .withIndex("by_active", (q: any) => q.eq("active", true))
        .order("desc")
        .take(size))
        .filter((p: any) => !p.approvalStatus || p.approvalStatus === "approved");
      activePoolCache.set(size, pool);
      return pool;
    };

    for (const block of blocksRaw) {
      if ((block.blockType === "collection" || block.blockType === "premiumCuration") && block.config?.collectionId) {
        // Pull every product mapped to the collection (not just the display cap) so that if some
        // get filtered out later (out of delivery range, out of stock), others further down the
        // merchandiser's ordering can still fill the block instead of leaving it empty.
        const pIds = await CollectionService.getCollectionRequirements(ctx, block.config.collectionId);
        requiredProductIds.push(...pIds);
      } else if (block.blockType === "premiumCuration" || (block.blockType === "collection" && block.renderer === "premiumGrid")) {
        const pool = await getActivePool(poolSizeFor(block.config?.maxProducts, 6));
        requiredProductIds.push(...pool.map((p: any) => p._id.toString()));
      } else if (block.blockType === "recentlyViewed" && userContext?.userId) {
        const history = await ctx.db
          .query("recentlyViewed")
          .withIndex("by_user_viewed", (q: any) => q.eq("userId", userContext.userId))
          .order("desc")
          .take(12);
        requiredProductIds.push(...history.map((h: any) => h.productId.toString()));
      } else if (block.blockType === "recommended") {
        const pool = await getActivePool(poolSizeFor(block.config?.maxProducts, 12));
        requiredProductIds.push(...pool.map((p: any) => p._id.toString()));
      } else if (block.blockType === "newArrivals") {
        const pool = await getActivePool(poolSizeFor(block.config?.maxProducts, 8));
        requiredProductIds.push(...pool.map((p: any) => p._id.toString()));
      }
    }

    return { productIds: Array.from(new Set(requiredProductIds)), activePoolCache };
  }

  /**
   * Hydrates raw blocks into ResolvedBlock DTOs. Applies a shared "already used" set across
   * blocks so the same product can't be independently selected into multiple sections on the
   * same page load.
   */
  static async hydrateBlocks(
    ctx: any,
    blocksRaw: any[],
    resolvedProductsMap: Map<string, ResolvedProduct>,
    activePoolCache: Map<number, any[]>,
    userContext?: { userId?: string }
  ): Promise<ResolvedBlock[]> {
    const resolvedBlocks: ResolvedBlock[] = [];
    const usedProductIds = new Set<string>();

    // Curated collections are iterated first in page (sortOrder) order, so they naturally win
    // contested products over generic auto-sourced pools further down the page.
    const takeUnused = (products: ResolvedProduct[], max: number): ResolvedProduct[] => {
      const picked: ResolvedProduct[] = [];
      for (const p of products) {
        if (picked.length >= max) break;
        if (usedProductIds.has(p.id)) continue;
        picked.push(p);
      }
      for (const p of picked) usedProductIds.add(p.id);
      return picked;
    };

    for (const block of blocksRaw) {
      const data: any = {};

      if ((block.blockType === "collection" || block.blockType === "premiumCuration") && block.config?.collectionId) {
        const hydratedCol = await CollectionService.hydrateCollection(ctx, block.config.collectionId, resolvedProductsMap);
        if (hydratedCol) {
          // Resolve the FULL merchandiser-ordered list to survivors first, then cap to the
          // display limit — not the other way around. Slicing to maxProducts before checking
          // which IDs actually survived catalog/serviceability filtering is what let a single
          // out-of-range product collapse an otherwise well-stocked collection down to nothing.
          const survivors = hydratedCol.productIds
            .map((id) => resolvedProductsMap.get(id))
            .filter(Boolean) as ResolvedProduct[];
          const matchedProducts = takeUnused(survivors, block.config.maxProducts || 12);

          data.collection = {
            id: hydratedCol.id,
            name: hydratedCol.name,
            slug: hydratedCol.slug,
            description: hydratedCol.description,
          };
          data.products = matchedProducts;
        }
        if (block.config?.bgImage || block.config?.desktopImage) {
          data.bgImage = await resolveBannerImage(ctx, block.config.bgImage || block.config.desktopImage);
        }
      } else if (block.blockType === "premiumCuration" || (block.blockType === "collection" && block.renderer === "premiumGrid")) {
        const pool = activePoolCache.get(poolSizeFor(block.config?.maxProducts, 6)) || [];
        const candidates = (pool
          .map((p: any) => resolvedProductsMap.get(p._id.toString()))
          .filter(Boolean) as ResolvedProduct[])
          .sort((a, b) => (b.hiveScore ?? 0) - (a.hiveScore ?? 0));
        data.products = takeUnused(candidates, block.config?.maxProducts || 6);

        if (block.config?.bgImage || block.config?.desktopImage) {
          data.bgImage = await resolveBannerImage(ctx, block.config.bgImage || block.config.desktopImage);
        }
      } else if (block.blockType === "recentlyViewed" && userContext?.userId) {
        const history = await ctx.db
          .query("recentlyViewed")
          .withIndex("by_user_viewed", (q: any) => q.eq("userId", userContext.userId))
          .order("desc")
          .take(12);

        const matchedProducts = history
          .map((h: any) => resolvedProductsMap.get(h.productId.toString()))
          .filter(Boolean) as ResolvedProduct[];

        data.products = takeUnused(matchedProducts, block.config?.maxProducts || 12);
      } else if (block.blockType === "recommended") {
        const pool = activePoolCache.get(poolSizeFor(block.config?.maxProducts, 12)) || [];
        const candidates = (pool
          .map((p: any) => resolvedProductsMap.get(p._id.toString()))
          .filter(Boolean) as ResolvedProduct[])
          .sort((a, b) => (b.hiveScore ?? 0) - (a.hiveScore ?? 0));
        data.products = takeUnused(candidates, block.config?.maxProducts || 12);
      } else if (block.blockType === "newArrivals") {
        const pool = activePoolCache.get(poolSizeFor(block.config?.maxProducts, 8)) || [];
        const candidates = (pool
          .map((p: any) => resolvedProductsMap.get(p._id.toString()))
          .filter(Boolean) as ResolvedProduct[])
          .sort((a, b) => (b.hiveScore ?? 0) - (a.hiveScore ?? 0));
        data.products = takeUnused(candidates, block.config?.maxProducts || 8);
      } else if (block.blockType === "hero") {
        // Hero block always pulls the global carousel banners from the banners table
        const activeBanners = await ctx.db
          .query("banners")
          .withIndex("by_active_and_sortOrder", (q: any) => q.eq("active", true))
          .collect();

        // Sort by sortOrder
        const validBanners = activeBanners.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

        data.banners = await Promise.all(
          validBanners.map(async (banner: any) => {
            return {
              _id: banner._id.toString(),
              title: banner.title || "",
              desktopImage: await resolveBannerImage(ctx, banner.desktopImageUrl) || "",
              mobileImage: await resolveBannerImage(ctx, banner.mobileImageUrl || banner.desktopImageUrl) || "",
              targetUrl: banner.ctaLink || "/products",
            };
          })
        );
      } else if (block.blockType === "banner") {
        // A. Direct image configured on the block itself (from Experience Studio)
        if (block.config?.desktopImage || block.config?.mobileImage || block.config?.bannerImage || block.config?.imageUrl) {
          const desktopImage = await resolveBannerImage(ctx, block.config.desktopImage || block.config.mobileImage || block.config.bannerImage || block.config.imageUrl);
          const mobileImage = await resolveBannerImage(ctx, block.config.mobileImage || block.config.desktopImage || block.config.bannerImage || block.config.imageUrl);
          data.banners = [{
            _id: block._id.toString(),
            desktopImage,
            mobileImage,
            targetUrl: block.config.targetUrl || "/collections",
            title: block.title || "",
          }];
        } else if (block.config?.bannerId) {
          const banner = await ctx.db.get(block.config.bannerId);
          if (banner) {
            data.banners = [{
              ...banner,
              desktopImage: await resolveBannerImage(ctx, (banner as any).desktopImageUrl || (banner as any).desktopImage) || "",
              mobileImage: await resolveBannerImage(ctx, (banner as any).mobileImageUrl || (banner as any).mobileImage) || "",
              targetUrl: (banner as any).ctaLink || (banner as any).targetUrl || "/collections",
            }];
          }
        }
      } else if (block.blockType === "category") {
        const rawCategories = await ctx.db
          .query("categories")
          .withIndex("by_active_and_sortOrder", (q: any) => q.eq("active", true))
          .collect();
        const activeCategories = rawCategories.filter((c: any) => c.showOnHomepage);
        data.categories = await Promise.all(activeCategories.map((c: any) => resolveCategoryImage(ctx, c)));
      }

      resolvedBlocks.push({
        id: block._id.toString(),
        blockKey: block.blockKey,
        blockType: block.blockType,
        title: block.title,
        subtitle: block.subtitle,
        renderer: block.renderer,
        config: block.config,
        data,
      });
    }

    return resolvedBlocks;
  }
}
