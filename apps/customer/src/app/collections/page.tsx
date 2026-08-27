import React from "react";
import { Metadata } from "next";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CollectionsIndexClient } from "./CollectionsIndexClient";

import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Curated Edits — Hive",
  description: "Browse curated boutique fashion edits for every occasion in Kochi. Delivered same-day.",
  alternates: {
    canonical: `${SITE_URL}/collections`,
  },
  openGraph: {
    title: "Curated Edits — Hive",
    description: "Browse curated boutique fashion edits for every occasion in Kochi. Delivered same-day.",
    url: `${SITE_URL}/collections`,
    siteName: "Hive",
    type: "website",
    images: [`${SITE_URL}/icon-512x512.png`],
  },
};

export default function CollectionsPage() {
  return (
    <CatalogLayout>
      <CollectionsIndexClient />
    </CatalogLayout>
  );
}
