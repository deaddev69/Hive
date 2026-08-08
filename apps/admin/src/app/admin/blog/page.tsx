"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Send,
  FileText,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function AdminBlogManagementPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const posts = useQuery(api.blogs.getAllPostsAdmin, {
    status: statusFilter,
    search: searchQuery,
  });

  const publishMutation = useMutation(api.blogs.publishPost);
  const unpublishMutation = useMutation(api.blogs.unpublishPost);
  const deleteMutation = useMutation(api.blogs.deletePost);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleTogglePublish = async (id: Id<"blogPosts">, currentStatus: "draft" | "published") => {
    setTogglingId(id);
    try {
      if (currentStatus === "published") {
        await unpublishMutation({ id });
      } else {
        await publishMutation({ id });
      }
    } catch (err) {
      console.error("Toggle publish error:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: Id<"blogPosts">, title: string) => {
    if (confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      try {
        await deleteMutation({ id });
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const totalCount = posts?.length ?? 0;
  const publishedCount = posts?.filter((p: any) => p.status === "published").length ?? 0;
  const draftCount = posts?.filter((p: any) => p.status === "draft").length ?? 0;

  if (posts === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-500 font-medium">Loading blog articles...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Native Blogging Engine
          </div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">
            Blog Articles & SEO Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Publish SEO-rich showroom guides, fabric care tips, and styling articles with instant HTML delivery to Googlebot and automated JSON-LD schema markup.
          </p>
        </div>

        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-md hover:shadow-amber-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Compose New Article
        </Link>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-slate-900">{totalCount}</div>
            <div className="text-xs text-slate-500 font-medium">Total Articles In Database</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-slate-900">{publishedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Live on hivenow.in/blog</div>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-800 border border-amber-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-slate-900">{draftCount}</div>
            <div className="text-xs text-slate-500 font-medium">Drafts in Progress</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Articles
          </button>
          <button
            onClick={() => setStatusFilter("published")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "published"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "draft"
                ? "bg-white text-amber-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Drafts
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, slug, or keywords..."
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Blog Posts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {posts === undefined ? (
          <div className="flex items-center justify-center p-16 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-xs">Loading articles from Convex...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-slate-800">No Articles Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              {searchQuery
                ? "No blog posts match your search query."
                : "Start publishing search-optimized articles directly into your stack."}
            </p>
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create First Article
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Article</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Read Time</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {posts.map((post: any) => (
                  <tr key={post._id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Article & Slug */}
                    <td className="py-4 px-6 max-w-md">
                      <div className="flex items-start gap-3">
                        {post.coverImageUrl ? (
                          <img
                            src={post.coverImageUrl}
                            alt={post.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/blog/${post._id}`}
                            className="font-serif font-bold text-slate-900 hover:text-amber-600 transition-colors line-clamp-1 text-sm"
                          >
                            {post.title}
                          </Link>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            /{post.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {post.category || "General"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(post._id, post.status)}
                        disabled={togglingId === post._id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          post.status === "published"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                        }`}
                        title="Click to toggle status"
                      >
                        {togglingId === post._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              post.status === "published" ? "bg-emerald-600" : "bg-amber-600"
                            }`}
                          />
                        )}
                        {post.status}
                      </button>
                    </td>

                    {/* Read Time */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{post.readTime || "5 min"}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Draft"}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {post.status === "published" && (
                          <a
                            href={`https://hivenow.in/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View live on website"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <Link
                          href={`/admin/blog/${post._id}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit article"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(post._id, post.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
