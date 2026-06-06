import { ProductCardData } from "@/lib/mockProducts";
import { ProductDetail } from "@/lib/mockProductDetails";

/**
 * Infers product category based on name contents
 */
export function getCategory(name: string): string {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes("saree")) return "saree";
  if (lowercaseName.includes("lehenga")) return "lehenga";
  if (lowercaseName.includes("kurti") || lowercaseName.includes("anarkali")) return "kurti";
  if (lowercaseName.includes("suit") || lowercaseName.includes("palazzo")) return "suit";
  if (lowercaseName.includes("co-ord")) return "co-ord";
  if (lowercaseName.includes("dress") || lowercaseName.includes("midi") || lowercaseName.includes("maxi")) return "dress";
  return "other";
}

/**
 * Matches same category first, then same occasion, then same price range
 */
export function getRelatedProducts(
  currentProduct: ProductDetail,
  allProducts: ProductCardData[]
): ProductCardData[] {
  if (!currentProduct || !allProducts) return [];

  const currentCategory = getCategory(currentProduct.name);

  // Filter out the active product itself
  const filtered = allProducts.filter((p) => p.id !== currentProduct.id);

  // Calculate scores for similarity matches
  const scored = filtered.map((p) => {
    let score = 0;

    // 1. Match same category first (Highest weight)
    const pCategory = getCategory(p.name);
    if (pCategory === currentCategory) {
      score += 100;
    }

    // 2. Then match same occasion
    if (p.occasion && currentProduct.occasionTags.includes(p.occasion)) {
      score += 50;
    }

    // 3. Then match same price range (within 30% range of active price)
    const priceDiff = Math.abs(p.price - currentProduct.price);
    const threshold = currentProduct.price * 0.3;
    if (priceDiff <= threshold) {
      score += 25;
    }

    // Fine-tune tie-breaker using product ratings
    if (p.rating) {
      score += p.rating * 2;
    }

    return { product: p, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return the top 4 matched recommendations
  return scored.map((item) => item.product).slice(0, 4);
}
