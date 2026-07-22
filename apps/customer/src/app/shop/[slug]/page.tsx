"use client";

import React, { useEffect } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Loader2, MapPin, CheckCircle, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductCardData } from "@/lib/mockProducts";
import { useLocation } from "@/context/LocationContext";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { mapDbProduct } from "@/lib/mapDbProduct";

// Helper to map DB product → ProductCardData


export default function BoutiqueStorefrontPage() {
  const params = useParams() as { slug: string };
  const router = useRouter();
  const { latitude: userLat, longitude: userLng } = useLocation();

  // Fetch the boutique's public profile
  const boutique = useQuery(api.boutiques.getBoutiquePublicProfile, { slug: params.slug });
  
  // Once we have the boutique ID, fetch all of their active products
  const productsResult = useQuery(api.products.getActiveProducts, 
    boutique ? { boutiqueId: boutique._id } : "skip"
  );

  useEffect(() => {
    if (boutique) {
      document.title = `${boutique.boutiqueName} — Hive by TailorBee`;
    }
  }, [boutique]);

  if (boutique === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-stone-500 font-bold">Loading storefront...</p>
      </div>
    );
  }

  // Suspended, rejected, or invalid slug returns null
  if (boutique === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <h1 className="text-2xl font-bold text-stone-800">Shop Not Available</h1>
        <p className="text-stone-600 max-w-md">
          This shop isn't currently available. They may be temporarily closed or updating their storefront.
        </p>
      </div>
    );
  }

  const products = productsResult ? productsResult.map(mapDbProduct) : [];

  return (
    <CatalogLayout
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Boutiques", href: "/products" },
        { label: boutique.boutiqueName },
      ]}
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full py-8 flex flex-col gap-6">
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors self-start cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        {/* Sleek Minimal Boutique Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div className="flex items-center gap-4">
            {boutique.logoUrl ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-stone-200 shadow-sm flex-shrink-0 bg-white">
                <Image
                  src={boutique.logoUrl}
                  alt={`${boutique.boutiqueName} logo`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full border border-stone-200 shadow-sm bg-stone-100 flex items-center justify-center text-xl font-serif text-stone-700 flex-shrink-0 select-none">
                {boutique.boutiqueName.charAt(0)}
              </div>
            )}
            
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-serif font-semibold text-stone-900 leading-tight">
                  {boutique.boutiqueName}
                </h1>
              </div>
              <p className="text-xs text-stone-500 max-w-xl font-medium tracking-wide">
                {boutique.city || "Kochi"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
              {products.length} {products.length === 1 ? "Product" : "Products"}
            </span>
          </div>
        </div>


        {/* Product Grid */}
        <div className="w-full">
          <ProductGrid 
            products={products}
            selectedOccasion="all"
            isLoading={productsResult === undefined}
          />
        </div>
      </div>
    </CatalogLayout>
  );
}
