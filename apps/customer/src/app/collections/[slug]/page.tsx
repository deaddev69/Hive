import React from "react";
import { Metadata } from "next";
import { CollectionPageClient } from "./CollectionPageClient";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { SITE_URL } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const canonicalUrl = `${SITE_URL}/collections/${slug}`;
  const description = `Shop the ${title} collection. Hand-picked pieces from verified local boutiques in Kochi, delivered same-day.`;

  return {
    title: `${title} | Hive`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} | Hive`,
      description,
      url: canonicalUrl,
      siteName: "Hive",
      type: "website",
      images: [`${SITE_URL}/icon-512x512.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Hive`,
      description,
      images: [`${SITE_URL}/icon-512x512.png`],
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  return (
    <CatalogLayout>
      <CollectionPageClient slug={slug} />
    </CatalogLayout>
  );
}
