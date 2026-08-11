import { ProductCardData } from "@/lib/mockProducts";
import { calculateDisplayPricing } from "@/lib/pricing";

export function mapDbProduct(p: any): ProductCardData & {
  sizes: string[];
  stockBySize: Record<string, number>;
  boutiqueId?: string;
  boutique?: any;
  discountPercent?: number;
} {
  const { price, compareAtPrice, discountPercent } = calculateDisplayPricing(p);

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    boutiqueName: p.boutiqueName || "Unknown Boutique",
    boutiqueId: p.boutiqueId,
    boutique: p.boutique,
    imageUrl: p.imageUrl || p.imageUrls?.[0] || "",
    price,
    compareAtPrice,
    discountPercent: discountPercent > 0 ? discountPercent : undefined,
    rating: 4.8,
    reviewCount: 12,
    sizes: p.sizes || [],
    stockBySize: p.stockBySize || {},
  };
}
