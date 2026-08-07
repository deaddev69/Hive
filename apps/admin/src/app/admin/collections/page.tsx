"use client";

import React, { Suspense } from "react";
import AdminHomepageMerchandisingPage from "../homepage/page";
import { Loader2 } from "lucide-react";

function CollectionsPageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
      <p className="text-sm text-hive-text-muted font-medium">Loading Collections Merchandising Studio...</p>
    </div>
  );
}

export default function AdminCollectionsPage() {
  return (
    <Suspense fallback={<CollectionsPageFallback />}>
      <AdminHomepageMerchandisingPage />
    </Suspense>
  );
}
