import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seo";
import {
  Clock,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Zap,
  MapPin,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Hive | Fashion Shouldn't Have to Wait",
  description:
    "Hive is Kochi's first fashion platform built for 90-minute delivery. Discover fashion from brands, designers, and labels across Kochi & Ernakulam.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "About Hive | Fashion Shouldn't Have to Wait",
    description:
      "Kochi's first fashion platform built for 90-minute delivery. Discover curated brands and designers delivered to your door today.",
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 text-stone-900 text-left">
        {/* ── 1. HERO / HOOK ── */}
        <header className="space-y-6 mb-16 pb-12 border-b border-stone-200/80">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] font-bold uppercase tracking-widest shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>About Hive</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight text-stone-950 leading-[1.12]">
              Fashion shouldn&apos;t have to wait.
            </h1>
            
            <div className="pt-2 text-base sm:text-xl font-medium text-stone-600 space-y-1">
              <p>Your plans don&apos;t.</p>
              <p>Your mood doesn&apos;t.</p>
              <p className="text-stone-950 font-bold">So why should your outfit?</p>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-4">
            <p className="text-base sm:text-lg text-stone-800 font-semibold leading-relaxed">
              Hive is Kochi&apos;s first fashion platform built for 90-minute delivery.
            </p>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Discover fashion from brands, designers and labels across Kochi and Ernakulam. Find the pieces you actually want, order them in a few taps, and have them at your door in around 90 minutes.
            </p>
            <p className="text-sm sm:text-base text-stone-950 font-bold pt-1">
              No waiting days for your outfit. Just find it. Love it. Hive it.
            </p>
          </div>
        </header>

        {/* ── 2. NOT JUST ANOTHER FASHION APP ── */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
              Curated Selection
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950 tracking-tight">
              Not just another fashion app.
            </h2>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
            <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
              There are plenty of places to shop fashion online.
            </p>
            <p className="text-stone-950 text-base sm:text-lg font-serif font-bold leading-snug">
              But finding something great and actually getting it today?
              <span className="block text-amber-800 font-sans font-medium text-sm sm:text-base pt-1">
                That&apos;s where Hive comes in.
              </span>
            </p>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              We bring together brands, designers and fashion names you won&apos;t find on the usual fashion apps, all in one place.
            </p>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              From that kurti you&apos;ve been looking for to a last-minute outfit, a new pair of jeans, sneakers, a bag or the perfect accessories.
            </p>
            <div className="pt-2 border-t border-stone-100 flex items-center gap-2 text-stone-950 font-bold text-sm sm:text-base">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>If you want it now, Hive is for you.</span>
            </div>
          </div>
        </section>

        {/* ── 3. 90 MINUTES. THAT'S THE DIFFERENCE. ── */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2 text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
              How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950 tracking-tight">
              90 MINUTES. THAT&apos;S THE DIFFERENCE.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-6 space-y-2 hover:border-stone-300 transition-all">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                01
              </div>
              <h3 className="text-lg font-serif font-bold text-stone-950 pt-1">
                Browse.
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Find something you love.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-6 space-y-2 hover:border-stone-300 transition-all">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                02
              </div>
              <h3 className="text-lg font-serif font-bold text-stone-950 pt-1">
                Order.
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Pick your size. Check out.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 space-y-2 hover:border-amber-300 transition-all">
              <div className="w-8 h-8 rounded-xl bg-amber-700 text-white flex items-center justify-center text-xs font-mono font-bold">
                03
              </div>
              <h3 className="text-lg font-serif font-bold text-stone-950 pt-1">
                Hive.
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed">
                Get it at your doorstep in around 90 minutes.
              </p>
            </div>
          </div>

          <div className="bg-stone-950 text-white rounded-2xl py-4 px-6 text-center text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Fashion shopping, without the multi-day wait.</span>
          </div>
        </section>

        {/* ── 4. MADE FOR KOCHI ── */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
              Homegrown Roots
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950 tracking-tight">
              Made for Kochi. Made for how you shop now.
            </h2>
          </div>

          <div className="bg-stone-50/80 border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-4">
            <p className="text-base sm:text-lg text-stone-900 font-serif font-bold">
              Kochi has incredible fashion talent.
            </p>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Independent designers. New labels. Homegrown names. Brands with their own style.
            </p>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              We wanted to bring all of that together in one fashion destination and make it as easy to shop as the big fashion platforms, but much, much faster.
            </p>
            <div className="pt-3 border-t border-stone-200/60">
              <p className="text-sm sm:text-base text-stone-900 font-semibold">
                So we built Hive.
              </p>
              <p className="text-base sm:text-lg text-stone-950 font-serif font-black tracking-tight pt-1 text-amber-900">
                The first. The fastest. And made for Kochi.
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. “I NEED IT TODAY” MOMENTS ── */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
              Instant Fulfillment
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950 tracking-tight">
              Fashion for the “I need it today” moments.
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              "Last-minute plans",
              "A dinner tonight",
              "A birthday tomorrow",
              "A sudden change of plans",
            ].map((moment, i) => (
              <div
                key={i}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 text-center text-xs font-semibold text-stone-800 shadow-2xs flex items-center justify-center min-h-[72px]"
              >
                {moment}
              </div>
            ))}
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 sm:p-6 text-center space-y-2">
            <p className="text-xs uppercase tracking-widest text-stone-400 font-bold">Or simply...</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-stone-950">“I want this.”</p>
            <p className="text-xs sm:text-sm text-stone-600 pt-1">
              You shouldn&apos;t have to wait three days for it.
            </p>
            <p className="text-base sm:text-lg font-bold text-amber-700">
              Hive it.
            </p>
          </div>
        </section>

        {/* ── 6. WHAT YOU'LL FIND ON HIVE ── */}
        <section className="mb-16 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
              Product Categories
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950 tracking-tight">
              What you&apos;ll find on Hive
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Women's Fashion */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 space-y-2 shadow-2xs">
              <h3 className="text-base font-serif font-bold text-stone-950">
                Women&apos;s Fashion
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Kurtis · Dresses · Sarees · Tops · Ethnic Wear · Western Wear
              </p>
            </div>

            {/* Men's Fashion */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 space-y-2 shadow-2xs">
              <h3 className="text-base font-serif font-bold text-stone-950">
                Men&apos;s Fashion
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Shirts · T-Shirts · Jeans · Trousers · Streetwear · Ethnic Wear
              </p>
            </div>

            {/* More to wear */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-6 space-y-2 shadow-2xs">
              <h3 className="text-base font-serif font-bold text-stone-950">
                More to wear
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Footwear · Bags · Jewellery · Accessories · And more
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-center">
            <p className="text-xs sm:text-sm font-semibold text-amber-950">
              All available across Kochi &amp; Ernakulam, with delivery in around 90 minutes.
            </p>
          </div>
        </section>

        {/* ── 7. THE COMPANY BEHIND HIVE ── */}
        <section className="mb-16 pt-10 border-t border-stone-200 space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">
              Corporate &amp; Operational Info
            </span>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              The company behind Hive
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Hive is operated by Beelyn LLP, based in Ernakulam, Kerala.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-600">
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Building2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Registered Office</span>
              </div>
              <p className="leading-relaxed text-stone-600">
                55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam, Kerala – 682016, India
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <span>Contact</span>
              </div>
              <p className="leading-relaxed text-stone-600">
                <a href="mailto:support@hivenow.in" className="underline hover:text-stone-900">support@hivenow.in</a>
                <br />
                <a href="tel:+917356019103" className="underline hover:text-stone-900">+91 73560 19103</a>
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-900">
                <MapPin className="w-3.5 h-3.5 text-stone-500" />
                <span>Service Area</span>
              </div>
              <p className="leading-relaxed text-stone-600">
                Kochi &amp; Ernakulam District, Kerala
              </p>
            </div>
          </div>
        </section>

        {/* ── 8. FINAL CTA ── */}
        <div className="bg-stone-950 text-white rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm text-left">
          <div className="space-y-1.5">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Your next outfit is closer than you think.
            </h3>
            <p className="text-sm text-stone-400 font-medium">
              Shop fashion. Get it in 90 minutes.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition-all shadow-md shrink-0 active:scale-[0.98] cursor-pointer"
          >
            <span>Shop Hive</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </CatalogLayout>
  );
}
