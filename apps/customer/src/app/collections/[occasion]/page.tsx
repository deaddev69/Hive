import { notFound } from "next/navigation";
import { mockCollections, getCollectionBySlug } from "@/lib/mockCollections";
import { OccasionPageClient } from "./OccasionPageClient";

interface OccasionPageProps {
  params: Promise<{ occasion: string }>;
}

export async function generateMetadata({ params }: OccasionPageProps) {
  const { occasion } = await params;
  const collection = getCollectionBySlug(occasion);
  if (!collection) return {};
  return {
    title: `${collection.title} — Hive by TailorBee`,
    description: collection.longDescription,
  };
}

export async function generateStaticParams() {
  return mockCollections.map((c) => ({ occasion: c.slug }));
}

export default async function OccasionPage({ params }: OccasionPageProps) {
  const { occasion } = await params;
  const collection = getCollectionBySlug(occasion);

  if (!collection) {
    notFound();
  }

  return <OccasionPageClient collection={collection} />;
}
