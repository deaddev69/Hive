import { ResolvedCollection, ResolvedProduct } from "../content/types";

export class CollectionService {
  /**
   * Reads a collection and returns the Product IDs it needs (the shopping list).
   *
   * Deliberately fetches every product mapped to the collection, not just the block's display
   * cap: downstream filtering (out of stock, out of delivery range) can drop some of them, and
   * without the full membership fetched here there'd be nothing left for the block to fall back
   * on. hydrateCollection applies the same "fetch all, cap at display time" approach.
   */
  static async getCollectionRequirements(
    ctx: any,
    collectionId: string
  ): Promise<string[]> {
    if (!collectionId) return [];

    const collectionRaw = await ctx.db.get(collectionId as any);
    if (!collectionRaw || collectionRaw.status !== "published") return [];

    const mappings = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q: any) => q.eq("collectionId", collectionId))
      .collect();

    return mappings.map((m: any) => m.productId.toString());
  }

  /**
   * Hydrates a collection document into a ResolvedCollection DTO, attaching the fetched products.
   */
  static async hydrateCollection(
    ctx: any,
    collectionId: string,
    resolvedProductsMap: Map<string, ResolvedProduct>
  ): Promise<Omit<ResolvedCollection, 'products'> & { productIds: string[] } | null> {
    if (!collectionId) return null;

    const collectionRaw = await ctx.db.get(collectionId as any);
    if (!collectionRaw || collectionRaw.status !== "published") return null;

    const mappings = await ctx.db
      .query("collectionProducts")
      .withIndex("by_collection_sort", (q: any) => q.eq("collectionId", collectionId))
      .collect();

    const requiredProductIds = mappings.map((m: any) => m.productId.toString());

    return {
      id: collectionRaw._id.toString(),
      name: collectionRaw.name,
      slug: collectionRaw.slug,
      description: collectionRaw.description,
      productIds: requiredProductIds, // Store IDs temporarily to let BlockService map the actual objects
    };
  }
}
