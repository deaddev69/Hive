import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seo";
import { PartnerShowcaseSection } from "@/components/about/PartnerShowcaseSection";
import {
  Clock,
  ArrowRight,
  Zap,
  MapPin,
  Mail,
  Phone,
  Building2,
  Sparkles,
  ShieldCheck,
  Compass,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Hive | Fashion Shouldn't Have to Wait",
  description:
    "Hive is Kochi's premier fashion platform built for 90-minute delivery. Discover fashion from independent brands, designers, and labels across Kochi & Ernakulam.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "About Hive | Fashion Shouldn't Have to Wait",
    description:
      "Kochi's first fashion platform built for 90-minute delivery. Discover curated designer brands and labels delivered to your doorstep today.",
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

      <div className="w-full bg-[#FAF8F5] text-neutral-900 selection:bg-amber-200 selection:text-neutral-900">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 text-left">
          
          {/* ── 1. EDITORIAL HERO ── */}
          <header className="max-w-4xl space-y-8 mb-20 md:mb-28">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/5 border border-neutral-900/10 text-neutral-800 text-xs font-mono font-semibold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Kochi&apos;s 90-Minute Fashion Destination</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold tracking-tight text-neutral-950 leading-[1.05]">
                Fashion shouldn&apos;t have to wait.
              </h1>

              <div className="text-lg sm:text-2xl font-serif italic text-neutral-600 space-y-1">
                <p>Your plans don&apos;t.</p>
                <p>Your mood doesn&apos;t.</p>
                <p className="text-neutral-950 font-sans not-italic font-bold text-xl sm:text-2xl pt-1">
                  So why should your outfit?
                </p>
              </div>
            </div>

            <div className="border-l-2 border-neutral-950 pl-6 sm:pl-8 py-2 space-y-4">
              <p className="text-lg sm:text-xl text-neutral-900 font-semibold leading-snug">
                Hive is Kochi&apos;s first fashion platform engineered for 90-minute delivery.
              </p>
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl">
                Discover exceptional fashion from independent brands, designers, and homegrown labels across Kochi and Ernakulam. Find the pieces you actually want, place your order in seconds, and have them at your door in around 90 minutes.
              </p>
              <p className="text-base sm:text-lg text-neutral-950 font-bold pt-1">
                No waiting days for shipping. Just find it. Love it. Hive it.
              </p>
            </div>
          </header>

          {/* ── 2. PHILOSOPHY & ROOTS ── */}
          <section className="mb-20 md:mb-28 grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-16 items-start">
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700 block">
                The Philosophy
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950 tracking-tight leading-tight">
                Made for Kochi. Made for how you dress today.
              </h2>
            </div>

            <div className="lg:col-span-7 space-y-5 text-base sm:text-lg text-neutral-600 leading-relaxed">
              <p>
                Kochi has always been a city of quiet style and discerning taste. From vibrant independent design houses in Panampilly Nagar to contemporary fashion studios across Fort Kochi and Edappally, local creative energy is thriving.
              </p>
              <p>
                Yet shopping local fashion traditionally meant spending hours navigating traffic or settling for generic e-commerce platforms that take four to five days to deliver ordinary mass-market apparel.
              </p>
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-neutral-200 shadow-sm space-y-2 text-neutral-900">
                <p className="font-serif font-bold text-xl">We asked a simple question:</p>
                <p className="text-base text-neutral-700">
                  Why can groceries arrive in 15 minutes, while an outfit you need for tonight takes three business days?
                </p>
                <p className="text-sm font-semibold text-amber-700 pt-2">
                  Hive bridges that divide — uniting the city&apos;s best designers with direct courier dispatch.
                </p>
              </div>
            </div>
          </section>

          {/* ── 3. MISSION & VISION ── */}
          <section className="mb-20 md:mb-28 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700">
                Purpose &amp; Direction
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                Our Mission &amp; Vision
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Mission Card */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Compass className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">
                    Our Mission
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-neutral-950">
                    To make local designer fashion instantaneously accessible.
                  </h3>
                  <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
                    We connect shoppers with the finest local fashion creators, transforming the city into a living, breathing showroom where quality garments reach customers in 90 minutes or less.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center gap-2 text-xs font-semibold text-neutral-800 font-mono">
                  <span>01</span>
                  <span>/</span>
                  <span className="uppercase tracking-wider">Speed &amp; Discovery</span>
                </div>
              </div>

              {/* Vision Card */}
              <div className="bg-neutral-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-300">
                    Our Vision
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-white">
                    To build India&apos;s most agile fashion ecosystem.
                  </h3>
                  <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                    We envision a future where independent fashion creators thrive without being held back by national logistics, giving local design identity the modern commerce infrastructure it deserves.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-stone-400 font-mono">
                  <span>02</span>
                  <span>/</span>
                  <span className="uppercase tracking-wider">Ecosystem Empowerment</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── 4. CORE VALUES ── */}
          <section className="mb-20 md:mb-28 space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700">
                The Standards We Uphold
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                Core Values
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Clock className="w-5 h-5 text-neutral-800" />
                </div>
                <h3 className="text-lg font-bold text-neutral-950">90-Minute Delivery</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Speed isn&apos;t a gimmick — it&apos;s our core commitment. We orchestrate direct dispatch routes across Kochi so your wardrobe updates when you need it.
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Sparkles className="w-5 h-5 text-neutral-800" />
                </div>
                <h3 className="text-lg font-bold text-neutral-950">Curated Designer Curation</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  We hand-pick partner brands and independent labels known for authentic craftsmanship, distinct aesthetics, and quality fabrics.
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <ShieldCheck className="w-5 h-5 text-neutral-800" />
                </div>
                <h3 className="text-lg font-bold text-neutral-950">Direct Studio Origin</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Every order originates straight from the brand&apos;s studio floor or official store in Kochi, ensuring brand-verified pieces and zero third-party repackaging.
                </p>
              </div>
            </div>
          </section>

          {/* ── 5. PARTNER SHOWCASE SECTION (MARQUEE) ── */}
          <PartnerShowcaseSection />

          {/* ── 6. EDITORIAL 01 → 02 → 03 PROCESS ── */}
          <section className="mb-20 md:mb-28 space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                The 90-Minute Rhythm
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 01 */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-7 space-y-4 shadow-sm">
                <span className="text-3xl font-mono font-bold text-amber-700">01</span>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-neutral-950">Browse Curated Labels</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Explore designer collections, festive edit drops, and everyday essentials from Kochi&apos;s leading fashion creators.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-7 space-y-4 shadow-sm">
                <span className="text-3xl font-mono font-bold text-amber-700">02</span>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-neutral-950">Order in Seconds</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Select your exact size, confirm your delivery address, and check out seamlessly via secure UPI, card, or cash on delivery.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="bg-neutral-900 text-white rounded-2xl p-7 space-y-4 shadow-lg">
                <span className="text-3xl font-mono font-bold text-amber-400">03</span>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-white">Hive to Your Door</h3>
                  <p className="text-sm text-stone-300 leading-relaxed">
                    A dedicated courier picks up your package straight from the brand and delivers it directly to your doorstep in around 90 minutes.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── 7. “I NEED IT TODAY” MOMENTS ── */}
          <section className="mb-20 md:mb-28 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700">
                Real Life Timing
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                Fashion for the moments you can&apos;t plan weeks ahead.
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                "Last-minute dinner invites",
                "Spontaneous weekend getaways",
                "Festive functions tonight",
                "Impending celebration tomorrow",
              ].map((moment, i) => (
                <div
                  key={i}
                  className="bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-5 text-center text-xs sm:text-sm font-semibold text-neutral-800 flex items-center justify-center min-h-[80px] shadow-sm"
                >
                  {moment}
                </div>
              ))}
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-neutral-500 font-mono font-bold">Or simply</p>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                “I love this outfit and want to wear it today.”
              </p>
              <p className="text-sm text-neutral-600 max-w-md mx-auto">
                Fashion is an emotion. You shouldn&apos;t have to wait days for excitement to arrive.
              </p>
            </div>
          </section>

          {/* ── 8. CURATED CATEGORIES ── */}
          <section className="mb-20 md:mb-28 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700">
                Catalog Spectrum
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-950">
                What You&apos;ll Find on Hive
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 space-y-2 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-950">Women&apos;s Collections</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Kurtis · Designer Dresses · Festive Sarees · Linen Shirts · Co-ord Sets · Handcrafted Jewellery
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 space-y-2 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-950">Men&apos;s Collections</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Tailored Shirts · Heavyweight Tees · Linen Trousers · Streetwear · Ethnic Kurtas
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 space-y-2 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-950">Footwear &amp; Accents</h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Leather Footwear · Everyday Totes · Statement Clutches · Minimal Fragrances · Artisan Accessories
                </p>
              </div>
            </div>
          </section>

          {/* ── 9. COMPANY PROVENANCE & TRANSPARENCY ── */}
          <section className="mb-20 md:mb-28 pt-12 border-t border-neutral-200 space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-amber-700">
                Corporate Transparency
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-950">
                The Company Behind Hive
              </h2>
              <p className="text-sm text-neutral-600">
                Hive is operated and managed by Beelyn LLP, based in Kochi, Kerala.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-600">
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-neutral-950">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>Registered Office</span>
                </div>
                <p className="leading-relaxed text-neutral-600">
                  55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam, Kerala – 682016, India
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-neutral-950">
                  <Mail className="w-4 h-4 text-amber-700" />
                  <span>Direct Communication</span>
                </div>
                <p className="leading-relaxed text-neutral-600">
                  <a href="mailto:support@hivenow.in" className="underline hover:text-neutral-950">
                    support@hivenow.in
                  </a>
                  <br />
                  <a href="tel:+917356019103" className="underline hover:text-neutral-950">
                    +91 73560 19103
                  </a>
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-neutral-950">
                  <MapPin className="w-4 h-4 text-amber-700" />
                  <span>Operations Zone</span>
                </div>
                <p className="leading-relaxed text-neutral-600">
                  Kochi &amp; Ernakulam District, Kerala
                  <br />
                  Direct 90-minute courier dispatch radius.
                </p>
              </div>
            </div>
          </section>

          {/* ── 10. FINAL INVITATION CTA ── */}
          <div className="bg-neutral-950 text-white rounded-3xl p-8 sm:p-14 flex flex-col sm:flex-row items-center justify-between gap-8 text-left shadow-2xl relative overflow-hidden">
            <div className="space-y-3 z-10">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                Your next outfit is closer than you think.
              </h3>
              <p className="text-sm sm:text-base text-stone-300 font-medium max-w-lg">
                Discover independent designer collections in Kochi. Get your order in around 90 minutes.
              </p>
            </div>

            <Link
              href="/products"
              className="z-10 inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white hover:bg-stone-100 text-neutral-950 font-bold text-sm transition-all shadow-lg shrink-0 active:scale-[0.98] cursor-pointer"
            >
              <span>Explore The Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </main>
      </div>
    </CatalogLayout>
  );
}
