import { Metadata } from "next";
import { getCategoryContent } from "./content/categoryContent";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.hivenow.in";

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
  image = "/icon-512x512.png",
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
    title: "Shop Fashion in Kochi & Ernakulam | Delivered in 90 Minutes | Hive",
    absoluteTitle: true,
    description: "Discover fashion from brands, designers and fashion stores across Kochi & Ernakulam. Shop kurtis, dresses, shirts, jeans, footwear, accessories and more, delivered in 90 minutes.",
    path: "/",
  });
}

export function getProductsMetadata(): Metadata {
  return constructMetadata({
    title: "Shop Fashion in Kochi & Ernakulam | Kurtis, Dresses, Jeans & More",
    description: "Browse kurtis, dresses, shirts, jeans, footwear, sarees and accessories from top fashion stores in Kochi and Ernakulam. Delivered in 90 minutes.",
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
    title: "Partner with Hive | List Your Fashion Boutique in Kochi & Ernakulam",
    description: "Are you a boutique owner in Kochi or Ernakulam? Join Hive to reach thousands of fashion shoppers with 90-minute delivery. Grow your boutique online with Hive.",
    path: "/become-seller",
  });
}

export function getContactMetadata(): Metadata {
  return constructMetadata({
    title: "Contact Hive | Fashion Delivery Support in Kochi & Ernakulam",
    description: "Get in touch with the Hive team. We're here to support customers and boutique partners across Kochi and Ernakulam, Kerala.",
    path: "/contact",
  });
}
