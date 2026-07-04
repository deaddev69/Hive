import { ProductCardData } from "@/lib/mockProducts";

export function mapDbProduct(p: any): ProductCardData & {
  sizes: string[];
  stockBySize: Record<string, number>;
  boutiqueId?: string;
  boutique?: any;
} {
  const hasDiscount =
    p.discountPrice !== undefined &&
    p.discountPrice !== null &&
    p.discountPrice < p.price;
  const price = hasDiscount ? p.discountPrice! : p.price;
  const compareAtPrice = hasDiscount ? p.price : undefined;
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
    rating: 4.8,
    reviewCount: 12,
    sizes: p.sizes || [],
    stockBySize: p.stockBySize || {},
  };
}
