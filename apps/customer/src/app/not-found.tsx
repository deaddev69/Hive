import React from "react";
import Link from "next/link";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { ShoppingBag, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <CatalogLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-slate-900">
        <div className="max-w-md w-full text-center space-y-6 bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl font-bold font-serif">
            404
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
              Page Not Found
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              The item or page you are looking for is no longer available or may have moved.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-12 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" /> Browse Catalog
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back Home
            </Link>
          </div>
        </div>
      </div>
    </CatalogLayout>
  );
}
