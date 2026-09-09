import { Id } from "../../_generated/dataModel";
import { getPublicUrl } from "../../media/api";
import { getBoutiqueStatus } from "../../shared/boutiqueStatus";
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

    const validProducts = products.filter((p) => {
      if (!p) return false;
      if (p.active === false) return false;
      if (p.approvalStatus && p.approvalStatus !== "approved") return false;
      // An admin has pulled this product from sale. cart.ts already refuses to add one, so
      // without this it could reach the homepage and then fail at the bag.
      if (p.adminHidden === true) return false;

      const stockBySize = p.stockBySize || {};
      const totalStock = Object.values(stockBySize).reduce((acc: number, count: any) => acc + (count || 0), 0);
      if (totalStock <= 0) return false;

      return true;
    }) as any[];

    // Extract unique boutique IDs
    const boutiqueIds = Array.from(new Set(validProducts.map((p) => p.boutiqueId)));

    // Batch fetch boutiques
    const boutiques = await Promise.all(
      boutiqueIds.map((id) => ctx.db.get(id))
    );
    const boutiqueMap = new Map(boutiques.filter(Boolean).map((b: any) => [b._id.toString(), b]));

    // Seller eligibility, which this path did not check at all.
    //
    // The catalogue has always applied these; the homepage never did, so a boutique that was
    // suspended, put itself on vacation, paused orders or hit its capacity limit kept its
    // products on the homepage while the same products were correctly hidden from Shop. Nothing
    // downstream caught it either: OperationsService only measures distance.
    //
    // PAUSED is the only status excluded, matching the catalogue. A boutique that is merely shut
    // for the evening still appears — it will take the order tomorrow, and hiding it would empty
    // the homepage every night.
    //
    // One timestamp for the whole pass, so two products from the same boutique cannot disagree
    // about whether it is open.
    const now = Date.now();
    const eligibleProducts = validProducts.filter((product) => {
      const boutique = boutiqueMap.get(product.boutiqueId.toString());
      if (!boutique) return false;
      if ((boutique as any).status !== "APPROVED") return false;
      return getBoutiqueStatus(boutique as any, now).type !== "PAUSED";
    });

    // Resolve Image URLs in batch
    const resolvedProducts = await Promise.all(
      eligibleProducts.map(async (product): Promise<ResolvedProduct> => {
        const boutique = boutiqueMap.get(product.boutiqueId.toString());
        
        let imageUrl = "";
        const primaryImageId = product.images?.[0];
        
        if (primaryImageId) {
          if (typeof primaryImageId === "object" && primaryImageId.objectKey) {
            // "card", not "pdp": this path only ever feeds homepage product
            // rails, which render through ProductCard. enrichProducts in
            // products.ts still uses "pdp" because its output feeds both the
            // grid and the PDP gallery from one field.
            imageUrl = getPublicUrl(primaryImageId, "card") || "";
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

        const price = product.price || 0;
        const compareAtPrice = product.compareAtPrice;

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
          categoryId: product.categoryId ? product.categoryId.toString() : undefined,
          rating: product.averageRating,
          reviewCount: product.reviewCount,
          // Carried so OperationsService can resolve an accurate delivery promise downstream.
          sameDayEligible: product.sameDayEligible,
          createdAt: product._creationTime || product.createdAt || Date.now(),
        };
      })
    );

    return resolvedProducts;
  }
}
