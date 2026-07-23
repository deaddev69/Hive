import { Metadata } from "next";
import { getCategoryContent } from "./content/categoryContent";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hivenow.in";

type MetadataProps = {
  title: string;
  absoluteTitle?: boolean;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
};

export function constructMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  image = "/og-image.jpg",
  noindex = false,
}: MetadataProps): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: !noindex,
      follow: !noindex,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Hive",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@HiveDelivery",
    },
  };
}

export function getHomeMetadata(): Metadata {
  return constructMetadata({
    title: "Instant Clothes Delivery in Kochi (1-2 Hours) | Hive",
    absoluteTitle: true,
    description: "Need instant clothes delivery in Kochi? Shop local stores online and get clothes, dresses, and outfits delivered to your door in 1-2 hours across Ernakulam.",
    path: "/",
  });
}

export function getProductsMetadata(): Metadata {
  return constructMetadata({
    title: "Shop Premium Fashion in Ernakulam",
    description: "Discover the latest premium fashion collections from Ernakulam's top local boutiques with same-day delivery.",
    path: "/products",
  });
}

export function getCategoryMetadata(category: string): Metadata {
  const content = getCategoryContent(category);
  const title = content ? content.seoTitle : `${category.charAt(0).toUpperCase() + category.slice(1)}'s Fashion in Ernakulam`;
  const description = content ? content.metaDescription : `Shop premium ${category.toLowerCase()}'s clothing from Ernakulam boutiques with same-day delivery on Hive.`;
  
  return constructMetadata({
    title,
    description,
    path: `/products/${category.toLowerCase()}`,
  });
}

export function getSellerMetadata(): Metadata {
  return constructMetadata({
    title: "Sell Your Boutique on Hive | Ernakulam's Premier Platform",
    description: "Join Hive as a boutique partner. Reach thousands of local customers in Ernakulam with our seamless delivery network.",
    path: "/become-seller",
  });
}

export function getContactMetadata(): Metadata {
  return constructMetadata({
    title: "Contact Hive | Premium Fashion Delivery in Ernakulam",
    description: "Get in touch with the Hive team. We're here to support customers and boutique partners across Ernakulam.",
    path: "/contact",
  });
}
