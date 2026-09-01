import { ResolvedExperience, ResolvedProduct } from "./types";
import { ExperienceService } from "./ExperienceService";
import { BlockService } from "./BlockService";
import { CatalogService } from "../catalog/CatalogService";
import { OperationsService } from "../operations/OperationsService";
import { MerchandisingService } from "../merchandising/MerchandisingService";

export class ContentService {
  /**
   * The entry point for the Content API.
   * Strictly enforces One-Way dependency (Experience -> Block -> Collection -> Catalog).
   * Strictly enforces the "Shopping List" pattern to prevent N+1 queries.
   */
  static async getExperience(
    ctx: any,
    slug: string,
    userContext?: { lat?: number; lng?: number; city?: string; userId?: string }
  ): Promise<ResolvedExperience | null> {
    
    // 1. Fetch Top-Level Entities (Raw)
    const rawData = await ExperienceService.getRawExperienceAndBlocks(ctx, slug);
    if (!rawData) return null;
    const { experienceRaw, blocksRaw } = rawData;

    // 2. Generate Shopping List (Product IDs)
    const { productIds: requiredProductIds, activePool, categoryPools } = await BlockService.getBlockRequirements(ctx, blocksRaw, userContext);

    // 3. ONE Batch Query (Catalog Service)
    let catalogProducts = await CatalogService.fetchProductsByIds(ctx, requiredProductIds);

    // 4. Enrich with Operations (Distance, ETA)
    catalogProducts = await OperationsService.enrichWithDeliveryLogistics(ctx, catalogProducts, userContext);

    // 5. Enrich with Merchandising (Ranking, Badges, HiveScore)
    catalogProducts = MerchandisingService.enrichWithMerchandising(catalogProducts);

    // Map for O(1) lookup during hydration
    const resolvedProductsMap = new Map<string, ResolvedProduct>(
      catalogProducts.map((p) => [p.id, p])
    );

    // 6. Hydrate Blocks (which recursively hydrates Collections)
    const hydratedBlocks = await BlockService.hydrateBlocks(ctx, blocksRaw, resolvedProductsMap, activePool, categoryPools, userContext);

    // 7. Return Final DTO
    return {
      id: experienceRaw._id.toString(),
      name: experienceRaw.name,
      slug: experienceRaw.slug,
      seoTitle: experienceRaw.seoTitle,
      seoDescription: experienceRaw.seoDescription,
      blocks: hydratedBlocks,
    };
  }
}
