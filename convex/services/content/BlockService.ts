import { ResolvedBlock, ResolvedProduct } from "./types";
import { CollectionService } from "../merchandising/CollectionService";

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
      if (block.blockType === "collection" && block.config?.collectionId) {
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
      }
      // Add other dynamic logic here if block requires direct product resolution
    }

    return Array.from(new Set(requiredProductIds));
  }

  /**
   * Hydrates raw blocks into ResolvedBlock DTOs.
   */
  static async hydrateBlocks(
    ctx: any,
    blocksRaw: any[],
    resolvedProductsMap: Map<string, ResolvedProduct>
  ): Promise<ResolvedBlock[]> {
    const resolvedBlocks: ResolvedBlock[] = [];

    for (const block of blocksRaw) {
      const data: any = {};

      if (block.blockType === "collection" && block.config?.collectionId) {
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
      } else if (block.blockType === "hero" || block.blockType === "banner") {
        if (block.config?.bannerId) {
          const banner = await ctx.db.get(block.config.bannerId);
          if (banner) {
            data.banners = [banner];
          }
        } else {
          // Hydrate all active banners for a carousel if no specific ID provided
          const banners = await ctx.db
            .query("editorialBanners")
            .withIndex("by_status_sort", (q: any) => q.eq("status", "published"))
            .take(5);
          data.banners = banners;
        }
      } else if (block.blockType === "category") {
        const categories = await ctx.db
          .query("categories")
          // We can just fetch them normally and filter, as the index might have changed
          .collect();
        data.categories = categories.filter((c: any) => c.active && c.showOnHomepage);
      }

      resolvedBlocks.push({
        id: block._id.toString(),
        blockKey: block.blockKey,
        blockType: block.blockType,
        title: block.title,
        subtitle: block.subtitle,
        renderer: block.renderer,
        data,
      });
    }

    return resolvedBlocks;
  }
}
