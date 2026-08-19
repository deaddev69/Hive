import React from "react";
import { Metadata } from "next";
import { ExperiencePageClient } from "./ExperiencePageClient";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${title} | Hive`,
    description: `Explore the ${title} editorial experience. Discover collections, trends, and stories from Hive.`,
  };
}

export default function ExperiencePage({ params }: { params: { slug: string } }) {
  return (
    <div className="w-full bg-[#FAF9F6]">
      <ExperiencePageClient slug={params.slug} />
    </div>
  );
}
