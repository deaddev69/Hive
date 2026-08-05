import React from "react";
import { Metadata } from "next";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { CollectionsIndexClient } from "./CollectionsIndexClient";

export const metadata: Metadata = {
  title: "Curated Edits — Hive by TailorBee",
  description: "Browse curated boutique fashion edits for every occasion. Delivered same-day in Kochi.",
};

export default function CollectionsPage() {
  return (
    <CatalogLayout>
      <CollectionsIndexClient />
    </CatalogLayout>
  );
}
