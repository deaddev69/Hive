"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useLocation } from "@/context/LocationContext";
import { toQueryCoords } from "@/lib/distance";
import { ExperienceBlockRenderer } from "@/components/home/ExperienceBlockRenderer";
import { Sparkles, LayoutGrid } from "lucide-react";

export function ExperiencePageClient({ slug }: { slug: string }) {
  const { latitude, longitude, city } = useLocation();

  const experienceBlocks = useQuery(api.customerHome.resolveExperiencePayload, {
    slug,
    city: city || undefined,
    ...toQueryCoords(latitude, longitude),
  });

  if (experienceBlocks === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-hive-dark">
        <Sparkles className="w-8 h-8 text-hive-amber animate-spin" />
        <p className="font-serif italic text-lg text-hive-text-muted animate-pulse">
          Loading experience...
        </p>
      </div>
    );
  }

  if (experienceBlocks === null || experienceBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-hive-dark">
        <LayoutGrid className="w-12 h-12 text-slate-300" />
        <h2 className="font-serif text-2xl font-bold">Experience Not Found</h2>
        <p className="text-slate-500 max-w-md text-center">
          We couldn't find the editorial experience you're looking for. It may have been unpublished or removed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {experienceBlocks.map((block) => (
        <ExperienceBlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
