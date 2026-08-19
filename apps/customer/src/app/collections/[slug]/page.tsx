import React from "react";
import { Metadata } from "next";
import { CollectionPageClient } from "./CollectionPageClient";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${title} | Hive`,
    description: `Shop the ${title} collection. Hand-picked pieces from verified local boutiques, delivered same-day.`,
  };
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  return (
    <CatalogLayout>
      <CollectionPageClient slug={params.slug} />
    </CatalogLayout>
  );
}
