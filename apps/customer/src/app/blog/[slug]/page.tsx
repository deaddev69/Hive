import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogBySlug, getAllBlogs } from "../../../data/blogs";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Clock, Calendar, User, CheckCircle2, HelpCircle, ShoppingBag, Share2 } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const blogs = getAllBlogs();
  return blogs.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);

  if (!blog) {
    return {
      title: "Article Not Found | Hive Blog",
      description: "The requested blog article could not be found."
    };
  }

  return {
    title: blog.seoTitle,
    description: blog.metaDescription,
    keywords: [blog.primaryKeyword, ...blog.secondaryKeywords],
    openGraph: {
      title: blog.metaTitle,
      description: blog.metaDescription,
      url: `https://hivenow.in/blog/${blog.slug}`,
      siteName: "Hive Marketplace",
      type: "article",
      publishedTime: blog.publishedAt,
      authors: [blog.author.name]
    },
    twitter: {
      card: "summary_large_image",
      title: blog.metaTitle,
      description: blog.metaDescription
    }
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Inject Structured Schema Markup (JSON-LD) for Google SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blog.schemaMarkup) }}
      />

      <article className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Top Navigation & Header */}
        <div className="p-8 sm:p-12 pb-8 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Journal Directory
            </Link>
            <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
              {blog.category}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-slate-900 tracking-tight leading-tight">
            {blog.h1Title}
          </h1>

          <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-700">{blog.author.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{blog.publishedAt}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{blog.readTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Markdown Article Body */}
        <div className="p-8 sm:p-12 prose prose-slate max-w-none prose-headings:font-serif prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-p:leading-relaxed prose-p:text-slate-700 prose-li:text-slate-700">
          <ReactMarkdown>{blog.content}</ReactMarkdown>
        </div>

        {/* Actionable Tips Section */}
        {blog.actionableTips && blog.actionableTips.length > 0 && (
          <div className="mx-8 sm:mx-12 my-8 p-6 sm:p-8 rounded-3xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center gap-2.5 text-amber-900 font-serif font-bold text-lg mb-4">
              <CheckCircle2 className="w-6 h-6 text-amber-600" />
              Actionable Tips for Online Boutique Shoppers
            </div>
            <ul className="space-y-3.5 pl-2">
              {blog.actionableTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-amber-950 font-medium leading-relaxed">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactive FAQ Section */}
        {blog.faqs && blog.faqs.length > 0 && (
          <div className="p-8 sm:p-12 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5 font-serif font-bold text-2xl text-slate-900 mb-6">
              <HelpCircle className="w-6 h-6 text-amber-600" />
              Frequently Asked Questions (FAQs)
            </div>
            <div className="space-y-4">
              {blog.faqs.map((faq, index) => (
                <details
                  key={index}
                  className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm transition-all duration-200 open:border-amber-400 open:shadow-md"
                >
                  <summary className="font-bold text-slate-900 text-base cursor-pointer list-none flex items-center justify-between select-none pr-2">
                    <span>{faq.question}</span>
                    <span className="w-6 h-6 rounded-full bg-slate-100 group-open:bg-amber-100 text-slate-600 group-open:text-amber-800 flex items-center justify-center text-xs font-black transition-colors shrink-0">
                      ?
                    </span>
                  </summary>
                  <p className="mt-3.5 text-sm text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Hyperlocal Conversion Banner (CTA) */}
        <div className="p-8 sm:p-12 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
              Ready to Upgrade Your Wardrobe?
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-black mt-3">
              Explore Kochi&apos;s Top Independent Showrooms Today
            </h3>
            <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
              Don&apos;t wait days for your next favorite outfit. Browse live collections from verified local boutiques and get same-day courier delivery to your doorstep.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg hover:shadow-amber-400/20 shrink-0"
          >
            <ShoppingBag className="w-4 h-4" /> Shop Live Boutiques
          </Link>
        </div>
      </article>
    </div>
  );
}
