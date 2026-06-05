import React from "react";

export const ProductGridSkeleton: React.FC = () => {
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 w-full">
      {skeletons.map((_, idx) => (
        <div
          key={idx}
          className="w-full bg-white border border-hive-border/40 rounded-[24px] p-3 flex flex-col gap-4 animate-pulse"
        >
          {/* Aspect 3:4 Image Skeleton */}
          <div className="relative w-full aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-slate-800" />

          {/* Details Skeleton */}
          <div className="px-1.5 py-2 flex flex-col gap-3 flex-1 justify-between">
            <div className="flex flex-col gap-2.5">
              {/* Boutique Name Skeleton */}
              <div className="h-2.5 bg-slate-150 dark:bg-slate-750 w-2/5 rounded-full" />
              {/* Product Name Skeleton */}
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 w-full rounded-full" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 w-4/5 rounded-full" />
              </div>
              {/* Rating/Badge Row Skeleton */}
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 w-1/4 rounded-full mt-1" />
            </div>

            {/* Price Skeleton */}
            <div className="h-5 bg-slate-200 dark:bg-slate-750 w-1/3 rounded-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
};
