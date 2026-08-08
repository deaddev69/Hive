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

export class BlockService {
  /**
   * Scans a list of raw blocks and returns all Product IDs required across all blocks.
   * This handles extracting requirements from Collections, recently viewed, trending, etc.
   */
  static async getBlockRequirements(
    ctx: any,
    blocksRaw: any[],
    userContext?: { userId?: string }
  ): Promise<string[]> {
    const requiredProductIds: string[] = [];

    for (const block of blocksRaw) {
      if ((block.blockType === "collection" || block.blockType === "premiumCuration") && block.config?.collectionId) {
        const pIds = await CollectionService.getCollectionRequirements(
          ctx,
          block.config.collectionId,
          block.config.maxProducts || 12
        );
        requiredProductIds.push(...pIds);
      } else if (block.blockType === "recentlyViewed" && userContext?.userId) {
        const history = await ctx.db
          .query("recentlyViewed")
          .withIndex("by_user_viewed", (q: any) => q.eq("userId", userContext.userId))
          .order("desc")
          .take(12);
        requiredProductIds.push(...history.map((h: any) => h.productId.toString()));
      } else if (block.blockType === "recommended") {
        const recommended = (await ctx.db
          .query("products")
          .withIndex("by_active", (q: any) => q.eq("active", true))
          .order("desc")
          .take(40))
          .filter((p: any) => !p.approvalStatus || p.approvalStatus === "approved")
          .slice(0, 12);
        requiredProductIds.push(...recommended.map((p: any) => p._id.toString()));
      } else if (block.blockType === "newArrivals") {
        const newArrivals = (await ctx.db
          .query("products")
          .withIndex("by_active", (q: any) => q.eq("active", true))
          .order("desc")
          .take(40))
          .filter((p: any) => !p.approvalStatus || p.approvalStatus === "approved")
          .slice(0, block.config?.maxProducts || 12);
        requiredProductIds.push(...newArrivals.map((p: any) => p._id.toString()));
      }
    }

    return Array.from(new Set(requiredProductIds));
  }

  /**
   * Hydrates raw blocks into ResolvedBlock DTOs.
   */
  static async hydrateBlocks(
    ctx: any,
    blocksRaw: any[],
    resolvedProductsMap: Map<string, ResolvedProduct>,
    userContext?: { userId?: string }
  ): Promise<ResolvedBlock[]> {
    const resolvedBlocks: ResolvedBlock[] = [];

    for (const block of blocksRaw) {
      const data: any = {};

      if ((block.blockType === "collection" || block.blockType === "premiumCuration") && block.config?.collectionId) {
        const hydratedCol = await CollectionService.hydrateCollection(ctx, block.config.collectionId, resolvedProductsMap);
        if (hydratedCol) {
          const matchedProducts = hydratedCol.productIds
            .slice(0, block.config.maxProducts || 12)
            .map((id) => resolvedProductsMap.get(id))
            .filter(Boolean) as ResolvedProduct[];

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
      } else if (block.blockType === "recentlyViewed" && userContext?.userId) {
        const history = await ctx.db
          .query("recentlyViewed")
          .withIndex("by_user_viewed", (q: any) => q.eq("userId", userContext.userId))
          .order("desc")
          .take(12);
        
        const matchedProducts = history
          .map((h: any) => resolvedProductsMap.get(h.productId.toString()))
          .filter(Boolean) as ResolvedProduct[];
          
        data.products = matchedProducts;
      } else if (block.blockType === "recommended") {
        // Simple algorithmic fallback: newest products
        const products = Array.from(resolvedProductsMap.values());
        // Sort by newest, maybe add some randomization or use featured flag
        const recommendedProducts = products
          .sort((a, b) => ((b as any).createdAt || 0) - ((a as any).createdAt || 0))
          .slice(0, block.config?.maxProducts || 12);
          
        data.products = recommendedProducts;
      } else if (block.blockType === "newArrivals") {
        const products = Array.from(resolvedProductsMap.values());
        const newArrivalProducts = products
          .sort((a, b) => ((b as any).createdAt || 0) - ((a as any).createdAt || 0))
          .slice(0, block.config?.maxProducts || 12);
          
        data.products = newArrivalProducts;
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
          .collect();
        const activeCategories = rawCategories.filter((c: any) => c.active && c.showOnHomepage);
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
