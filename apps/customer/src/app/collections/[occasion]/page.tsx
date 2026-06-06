import { notFound } from "next/navigation";
import { mockCollections, getCollectionDetails } from "@/lib/mockCollections";
import { OccasionPageClient } from "./OccasionPageClient";

interface OccasionPageProps {
  params: Promise<{ occasion: string }>;
}

export async function generateMetadata({ params }: OccasionPageProps) {
  const { occasion } = await params;
  const details = getCollectionDetails(occasion);
  if (!details) return {};
  return {
    title: `${details.title} Collection — Hive by TailorBee`,
    description: details.editorialCopy,
  };
}

export async function generateStaticParams() {
  return mockCollections.map((c) => ({ occasion: c.slug }));
}

export default async function OccasionPage({ params }: OccasionPageProps) {
  const { occasion } = await params;
  const details = getCollectionDetails(occasion);

  if (!details) {
    notFound();
  }

  return <OccasionPageClient details={details} />;
}
