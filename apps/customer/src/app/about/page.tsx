import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seo";
import {
  Sparkles,
  ShoppingBag,
  Truck,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Hive | Kochi's Premier Hyperlocal Fashion Marketplace",
  description:
    "Learn about Hive, Kochi's hyperlocal boutique aggregator operated by Beelyn LLP. Connecting fashion lovers with independent local designers for same-day 1-2 hour delivery.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "About Hive | Hyperlocal Fashion Delivery in Kochi",
    description:
      "Connecting local fashion boutiques across Kochi and Ernakulam with buyers via quick delivery, PWA, and AI-assisted cataloging.",
    url: `${SITE_URL}/about`,
    siteName: "Hive",
    type: "website",
    images: [`${SITE_URL}/icon-512x512.png`],
  },
};

export default function AboutPage() {
  return (
    <CatalogLayout>
      <OrganizationSchema />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "About Hive", url: "/about" },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-slate-900">
        {/* Header */}
        <div className="space-y-4 mb-12 pb-8 border-b border-slate-200">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> About Hive
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight leading-tight">
            Connecting Kochi&apos;s Independent Boutiques with Discerning Shoppers
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
            Hive is a hyperlocal fashion aggregator and quick-commerce platform based in Kochi, Kerala. Operated by Beelyn LLP, Hive empowers local fashion designers, independent boutiques, and tailor studios to reach customers with same-day, 1–2 hour doorstep delivery.
          </p>
        </div>

        {/* Core Mission & Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900">
              Instant 1–2 Hour Delivery
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Skip multi-day courier waits. Browse curated collections from nearby showrooms in Kakkanad, Panampilly Nagar, Edappally, and MG Road and receive outfits at your door in hours.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900">
              Verified Local Boutiques
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every boutique on Hive is hand-verified for authentic fabrics, artisanal craftsmanship, transparent pricing, and regional design excellence.
            </p>
          </div>
        </div>

        {/* Corporate & Entity Details for GEO / AI Citation */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 mb-12 shadow-sm space-y-4">
          <h2 className="text-xl font-serif font-bold text-slate-900">
            Company & Operational Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Legal Entity</p>
              <p>BEELYN LLP (LLPIN: ACS-4901)</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Registered Office</p>
              <p>55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam, Kerala – 682016, India</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Primary Contact</p>
              <p>support@hivenow.in | +91 73560 19103</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Service Coverage</p>
              <p>Kochi & Ernakulam District, Kerala</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-serif font-bold">Discover Local Fashion Now</h3>
            <p className="text-sm text-slate-300 mt-1 max-w-md">
              Browse live showroom collections from Kochi&apos;s top designers.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-md shrink-0"
          >
            <ShoppingBag className="w-4 h-4" /> Shop Live Collections
          </Link>
        </div>
      </div>
    </CatalogLayout>
  );
}
