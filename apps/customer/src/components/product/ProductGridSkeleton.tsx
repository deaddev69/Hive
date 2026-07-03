import React from "react";

export const ProductGridSkeleton: React.FC = () => {
  const skeletons = Array.from({ length: 8 });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 w-full">
      {skeletons.map((_, idx) => (
        <div
          key={idx}
          className="w-full bg-white border border-black/[0.06] rounded-xl p-3 flex flex-col gap-2.5 animate-pulse"
        >
          {/* Aspect 4:5 Image Skeleton */}
          <div className="relative w-full aspect-[4/5] rounded-t-xl bg-slate-100 dark:bg-slate-800" />

          {/* Details Skeleton */}
          <div className="flex flex-col gap-4 flex-1 justify-between">
            <div className="flex flex-col gap-3">
              {/* Category / Collection Tag Skeleton */}
              <div className="h-2.5 bg-slate-150 dark:bg-slate-750 w-1/3 rounded-full" />
              {/* Product Name Skeleton */}
              <div className="flex flex-col gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 w-full rounded-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 w-5/6 rounded-full" />
              </div>
              {/* Merchant Trust Layer Skeleton */}
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="h-3 bg-slate-150 dark:bg-slate-750 w-2/5 rounded-full" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 w-1/4 rounded-full" />
              </div>
            </div>

            {/* Price & Delivery Skeleton */}
            <div className="flex flex-col gap-3.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="h-6 bg-slate-200 dark:bg-slate-750 w-1/3 rounded-full" />
              <div className="h-3 bg-slate-150 dark:bg-slate-750 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
