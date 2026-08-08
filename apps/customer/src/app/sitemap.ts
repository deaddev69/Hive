import { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { KOCHI_LOCATIONS } from "@/lib/locations";
import { getAllBlogs } from "../data/blogs";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  // 1. Static base pages
  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/become-seller`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
  ];

  // 2. Dynamic Locations pages
  const locationPages = Object.keys(KOCHI_LOCATIONS).map((slug) => ({
    url: `${baseUrl}/locations/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // 3. Static Blog Articles fallback
  const staticBlogs = getAllBlogs();
  const staticBlogPages = staticBlogs.map((b) => ({
    url: `${baseUrl}/blog/${b.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  if (!convexUrl) {
    console.warn("NEXT_PUBLIC_CONVEX_URL is not set. Sitemap generation will fallback to static pages.");
    return [...staticPages, ...locationPages, ...staticBlogPages];
  }

  const client = new ConvexHttpClient(convexUrl);

  let products: any[] = [];
  let categories: any[] = [];
  let blogPosts: any[] = [];

  try {
    const [fetchedProducts, fetchedCategories, fetchedBlogs] = await Promise.all([
      client.query(api.products.getActiveProducts, {}),
      client.query(api.categories.getCategories, { onlyActive: true }),
      client.query(api.blogs.getPublishedPosts, {}),
    ]);
    products = fetchedProducts || [];
    categories = fetchedCategories || [];
    blogPosts = fetchedBlogs || [];
  } catch (error) {
    console.error("Failed to query Convex for dynamic sitemap generation:", error);
  }

  // 4. Dynamic Categories pages
  const categoryPages = categories.map((cat) => ({
    url: `${baseUrl}/products/${cat.slug}`,
    lastModified: new Date(cat.updatedAt || cat._creationTime || Date.now()),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // 5. Dynamic Product detail pages
  const productPages = products.map((prod) => ({
    url: `${baseUrl}/products/${prod.slug}`,
    lastModified: new Date(prod.updatedAt || prod._creationTime || Date.now()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 6. Dynamic Convex Blog detail pages
  const existingBlogSlugs = new Set(blogPosts.map((p) => p.slug));
  const dynamicBlogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt || post._creationTime || Date.now()),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Filter static blogs that aren't overwritten in Convex
  const uniqueStaticBlogPages = staticBlogPages.filter(
    (sb) => !existingBlogSlugs.has(sb.url.replace(`${baseUrl}/blog/`, ""))
  );

  return [
    ...staticPages,
    ...locationPages,
    ...categoryPages,
    ...productPages,
    ...dynamicBlogPages,
    ...uniqueStaticBlogPages,
  ];
}

