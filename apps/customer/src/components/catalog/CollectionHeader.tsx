import React from "react";
import { CollectionDetails } from "@/lib/mockCollections";

interface CollectionHeaderProps {
  details: CollectionDetails;
  resultCount: number;
}

export const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  details,
  resultCount,
}) => {
  return (
    <div
      id="collection-grid"
      className="w-full border-b border-hive-border/50 bg-white/80 backdrop-blur-sm"
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 w-full py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Accent dot */}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: details.accentColor }}
          />
          <h2 className="text-base md:text-lg font-serif font-extrabold text-hive-dark">
            {details.title}{" "}
            <span className="font-sans text-sm font-semibold text-hive-text-muted">
              Collection
            </span>
          </h2>
        </div>

        <span className="text-xs text-hive-text-muted font-semibold">
          {resultCount} {resultCount === 1 ? "product" : "products"}
        </span>
      </div>
    </div>
  );
};
