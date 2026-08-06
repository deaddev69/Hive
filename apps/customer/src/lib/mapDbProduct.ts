import { ProductCardData } from "@/lib/mockProducts";

export function mapDbProduct(p: any): ProductCardData & {
  sizes: string[];
  stockBySize: Record<string, number>;
  boutiqueId?: string;
  boutique?: any;
  discountPercent?: number;
} {
  let rawPrice = p.price || 0;
  let rawCompare = p.compareAtPrice;
  rawPrice = rawPrice ? rawPrice / 100 : 0;
  if (rawCompare) rawCompare = rawCompare / 100;

  const hasDiscount =
    p.discountPrice !== undefined &&
    p.discountPrice !== null &&
    p.discountPrice < p.price;
    
  let discountPrice = hasDiscount ? p.discountPrice! / 100 : undefined;
  let price = hasDiscount && discountPrice ? discountPrice : rawPrice;
  const compareAtPrice = hasDiscount ? rawPrice : undefined;
  
  const discountPercent = hasDiscount && compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) 
    : 0;

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
