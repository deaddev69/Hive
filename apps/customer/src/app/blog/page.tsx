import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { getAllBlogs } from "../../data/blogs";
import { BookOpen, Clock, ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | Hive - Kochi’s Hyperlocal Fashion Marketplace",
  description: "Explore practical fashion guides, saree draping tips, Kerala climate styling advice, and hyperlocal boutique shopping guides tailored for Kochi.",
  keywords: ["Kochi fashion blog", "Kerala boutique styling", "cotton kurtis guide", "saree draping tips", "hyperlocal marketplace Kerala"],
  openGraph: {
    title: "Hive Fashion & Styling Blog | Kochi's Local Showroom Guide",
    description: "Expert advice on shopping local showrooms online, choosing breathable fabrics for Kerala weather, and finding exact fits right from Kochi boutiques.",
    url: "https://hivenow.in/blog",
    siteName: "Hive Marketplace",
    type: "website"
  }
};

export default function BlogDirectoryPage() {
  const blogs = getAllBlogs();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="max-w-6xl mx-auto mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Topical Authority & Style Guides
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif font-black text-slate-900 tracking-tight">
          The Hive Fashion & Lifestyle Journal
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal">
          Expert styling tips, Kerala weather fabric guides, and inside looks at how hyperlocal same-day delivery connects you with Kochi&apos;s finest independent boutiques.
        </p>
      </div>

      {/* Blogs Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogs.map((post) => (
          <article
            key={post.id}
            className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-amber-400/60 transition-all duration-300"
          >
            {/* Top Category Badge & Read Time */}
            <div className="p-6 pb-4 flex items-center justify-between gap-3 border-b border-slate-100">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                {post.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-600 mb-2">
                  {post.publishedAt} • By {post.author.name}
                </div>
                <h2 className="text-xl font-serif font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                  <Link href={`/blog/${post.slug}`} className="focus:outline-none">
                    {post.h1Title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors"
                >
                  Read Full Guide
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <BookOpen className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Strategy Banner Footer */}
      <div className="max-w-6xl mx-auto mt-20 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
            100-Topic Strategy Roadmap
          </span>
          <h3 className="text-2xl font-serif font-bold mt-3">
            Looking for Saree Guides, Men&apos;s Styling, or Kochi Boutique Directories?
          </h3>
          <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
            We are actively publishing our complete 100-article topical roadmap to help Kerala fashion lovers discover breathable outfits, care rules, and local neighborhood boutiques.
          </p>
        </div>
        <Link
          href="/"
          className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg hover:shadow-amber-400/20 whitespace-nowrap"
        >
          Explore Live Showrooms
        </Link>
      </div>
    </div>
  );
}
