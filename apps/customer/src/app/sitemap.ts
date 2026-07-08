import { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.hivenow.in";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.warn("NEXT_PUBLIC_CONVEX_URL is not set. Sitemap generation will fallback to static pages.");
    return [
      { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
      { url: `${baseUrl}/become-seller`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
      { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    ];
  }

  const client = new ConvexHttpClient(convexUrl);

  let products: any[] = [];
  let categories: any[] = [];

  try {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      client.query(api.products.getActiveProducts, {}),
      client.query(api.categories.getCategories, { onlyActive: true }),
    ]);
    products = fetchedProducts || [];
    categories = fetchedCategories || [];
  } catch (error) {
    console.error("Failed to query Convex for dynamic sitemap generation:", error);
  }

  // 1. Static base pages
  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${baseUrl}/become-seller`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
  ];

  // 2. Dynamic Categories pages
  const categoryPages = categories.map((cat) => ({
    url: `${baseUrl}/products?category=${cat.slug}`,
    lastModified: new Date(cat.updatedAt || cat._creationTime || Date.now()),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // 3. Dynamic Product detail pages
  const productPages = products.map((prod) => ({
    url: `${baseUrl}/products/${prod.slug}`,
    lastModified: new Date(prod.updatedAt || prod._creationTime || Date.now()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
