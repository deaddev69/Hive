import { Id } from "../../_generated/dataModel";
import { getPublicUrl } from "../../media/api";
import { ResolvedProduct } from "../content/types";

export class CatalogService {
  /**
   * Fetches products in a single batch query and maps them strictly to ResolvedProduct DTOs.
   * This is purely Catalog logic. No operational (ETA) or merchandising (ranking/badges) logic here.
   */
  static async fetchProductsByIds(ctx: any, productIds: string[]): Promise<ResolvedProduct[]> {
    if (productIds.length === 0) return [];

    // Deduplicate IDs
    const uniqueIds = Array.from(new Set(productIds)) as Id<"products">[];

    // Batch fetch products
    const products = await Promise.all(
      uniqueIds.map((id) => ctx.db.get(id))
    );

    const validProducts = products.filter(Boolean) as any[];

    // Extract unique boutique IDs
    const boutiqueIds = Array.from(new Set(validProducts.map((p) => p.boutiqueId)));

    // Batch fetch boutiques
    const boutiques = await Promise.all(
      boutiqueIds.map((id) => ctx.db.get(id))
    );
    const boutiqueMap = new Map(boutiques.filter(Boolean).map((b: any) => [b._id.toString(), b]));

    // Resolve Image URLs in batch
    const resolvedProducts = await Promise.all(
      validProducts.map(async (product): Promise<ResolvedProduct> => {
        const boutique = boutiqueMap.get(product.boutiqueId.toString());
        
        let imageUrl = "";
        const primaryImageId = product.images?.[0];
        
        if (primaryImageId) {
          if (typeof primaryImageId === "object" && primaryImageId.objectKey) {
            imageUrl = getPublicUrl(primaryImageId, "pdp") || "";
          } else if (typeof primaryImageId === "string" && primaryImageId.startsWith("http")) {
            imageUrl = primaryImageId;
          } else {
            try {
              const url = await ctx.storage.getUrl(primaryImageId);
              imageUrl = url || "";
            } catch {
              imageUrl = primaryImageId as string;
            }
          }
        }

        const rawPrice = product.price || 0;
        const price = rawPrice >= 10000 ? Math.round(rawPrice / 100) : rawPrice;
        const rawCompare = product.compareAtPrice;
        const compareAtPrice = rawCompare && rawCompare >= 10000 ? Math.round(rawCompare / 100) : rawCompare;

        return {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          price,
          compareAtPrice,
          imageUrl,
          boutiqueId: product.boutiqueId.toString(),
          boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
          boutiqueSlug: boutique?.slug || boutique?.boutiqueName?.toLowerCase().replace(/\s+/g, "-") || "unknown",
        };
      })
    );

    return resolvedProducts;
  }
}
