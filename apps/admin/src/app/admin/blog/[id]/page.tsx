"use client";

import React, { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { BlogForm } from "@/components/blog/BlogForm";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditBlogPostPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const postId = unwrappedParams.id as Id<"blogPosts">;

  const post = useQuery(api.blogs.getPostByIdAdmin, {
    id: postId,
  });

  if (post === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs font-medium">Loading article data from Convex...</span>
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-slate-800">Article Not Found</h2>
        <p className="text-xs text-slate-500">
          This article may have been deleted or the ID is invalid.
        </p>
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Articles Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10">
      <BlogForm
        isEditing={true}
        initialData={{
          _id: post._id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          excerpt: post.excerpt,
          status: post.status,
          category: post.category || "Platform Guides",
          readTime: post.readTime || "5 min read",
          authorName: post.authorName || "Hive Editorial Team",
          seoTitle: post.seoTitle || post.title,
          metaDescription: post.metaDescription || post.excerpt,
          primaryKeyword: post.primaryKeyword,
          secondaryKeywords: post.secondaryKeywords || [],
          actionableTips: post.actionableTips || [],
          faqs: post.faqs || [],
          publishedAt: post.publishedAt,
        }}
      />
    </div>
  );
}
