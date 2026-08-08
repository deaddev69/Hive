"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { TipTapEditor } from "./TipTapEditor";
import {
  Sparkles,
  Upload,
  Globe,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  ArrowLeft,
  Eye,
  Save,
  Send,
  Loader2,
  Image as ImageIcon,
  Clock,
  Layers,
  Search,
} from "lucide-react";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

interface BlogFormData {
  _id?: Id<"blogPosts">;
  title: string;
  slug: string;
  content: string;
  coverImageUrl?: string;
  excerpt: string;
  status: "draft" | "published";
  category: string;
  readTime: string;
  authorName: string;
  seoTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  actionableTips: string[];
  faqs: FAQItem[];
  publishedAt?: number;
}

interface BlogFormProps {
  initialData?: BlogFormData;
  isEditing?: boolean;
}

const CATEGORIES = [
  "Platform Guides",
  "Women's Fashion",
  "Men's Styling",
  "Sarees & Traditional",
  "Kochi Guides",
  "Fabric & Care",
  "Hyperlocal Shopping",
];

export function BlogForm({ initialData, isEditing = false }: BlogFormProps) {
  const router = useRouter();

  const createPostMutation = useMutation(api.blogs.createPost);
  const updatePostMutation = useMutation(api.blogs.updatePost);
  const deletePostMutation = useMutation(api.blogs.deletePost);

  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(initialData?.slug));
  const [content, setContent] = useState(initialData?.content || "<p>Write your article here...</p>");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [status, setStatus] = useState<"draft" | "published">(initialData?.status || "draft");
  const [category, setCategory] = useState(initialData?.category || "Platform Guides");
  const [readTime, setReadTime] = useState(initialData?.readTime || "5 min read");
  const [authorName, setAuthorName] = useState(initialData?.authorName || "Hive Editorial Team");
  const [primaryKeyword, setPrimaryKeyword] = useState(initialData?.primaryKeyword || "");
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState(
    initialData?.secondaryKeywords?.join(", ") || ""
  );
  const [actionableTips, setActionableTips] = useState<string[]>(
    initialData?.actionableTips || []
  );
  const [newTip, setNewTip] = useState("");
  const [faqs, setFaqs] = useState<FAQItem[]>(initialData?.faqs || []);
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Automatically derive slug from title if not manually customized
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  // Auto-calculate reading time based on word count
  const calculateReadTime = useCallback(() => {
    const plainText = content.replace(/<[^>]+>/g, " ");
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    setReadTime(`${minutes} min read`);
  }, [content]);

  // Cover image upload to secured Cloudflare R2 endpoint
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload cover image to Cloudflare R2.");
      }

      setCoverImageUrl(data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload cover image.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Add tip
  const handleAddTip = () => {
    if (newTip.trim()) {
      setActionableTips([...actionableTips, newTip.trim()]);
      setNewTip("");
    }
  };

  const handleRemoveTip = (index: number) => {
    setActionableTips(actionableTips.filter((_, i) => i !== index));
  };

  // Add FAQ
  const handleAddFaq = () => {
    if (newFaqQ.trim() && newFaqA.trim()) {
      setFaqs([...faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }]);
      setNewFaqQ("");
      setNewFaqA("");
    }
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  // Save or Publish post
  const handleSave = async (targetStatus: "draft" | "published") => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter an article title.");
      return;
    }

    if (!slug.trim()) {
      setErrorMessage("Please provide a valid URL slug.");
      return;
    }

    if (!excerpt.trim()) {
      setErrorMessage("Please provide a short excerpt / SEO description.");
      return;
    }

    if (!content.trim() || content === "<p></p>") {
      setErrorMessage("Article content cannot be empty.");
      return;
    }

    setIsSaving(true);
    const parsedSecondaryKeywords = secondaryKeywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      if (isEditing && initialData?._id) {
        await updatePostMutation({
          id: initialData._id,
          title: title.trim(),
          slug: slug.trim(),
          content,
          coverImageUrl: coverImageUrl || undefined,
          excerpt: excerpt.trim(),
          status: targetStatus,
          category,
          readTime,
          authorName: authorName.trim(),
          seoTitle: title.trim(),
          metaDescription: excerpt.trim(),
          primaryKeyword: primaryKeyword.trim() || undefined,
          secondaryKeywords: parsedSecondaryKeywords.length > 0 ? parsedSecondaryKeywords : undefined,
          actionableTips: actionableTips.length > 0 ? actionableTips : undefined,
          faqs: faqs.length > 0 ? faqs : undefined,
        });

        setStatus(targetStatus);
        setSuccessMessage(
          targetStatus === "published"
            ? "Article published live to customer app!"
            : "Draft saved successfully."
        );
      } else {
        const newId = await createPostMutation({
          title: title.trim(),
          slug: slug.trim(),
          content,
          coverImageUrl: coverImageUrl || undefined,
          excerpt: excerpt.trim(),
          status: targetStatus,
          category,
          readTime,
          authorName: authorName.trim(),
          seoTitle: title.trim(),
          metaDescription: excerpt.trim(),
          primaryKeyword: primaryKeyword.trim() || undefined,
          secondaryKeywords: parsedSecondaryKeywords.length > 0 ? parsedSecondaryKeywords : undefined,
          actionableTips: actionableTips.length > 0 ? actionableTips : undefined,
          faqs: faqs.length > 0 ? faqs : undefined,
        });

        setSuccessMessage("Article created successfully!");
        router.push(`/admin/blog/${newId}`);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "Failed to save blog post. Please check fields and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?._id) return;
    setIsSaving(true);
    try {
      await deletePostMutation({ id: initialData._id });
      router.push("/admin/blog");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete post.");
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/blog"
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-black text-slate-900">
                {isEditing ? "Edit Article" : "Compose New Article"}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  status === "published"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Native Next.js / Convex SEO Engine • Instant HTML Delivery to Googlebot
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEditing && slug && (
            <a
              href={`https://hivenow.in/blog/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Live
            </a>
          )}

          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm hover:shadow-amber-500/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {status === "published" ? "Update & Keep Live" : "Publish to Web"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Article Content & WYSIWYG */}
        <div className="lg:col-span-2 space-y-6">
          {/* Article Title Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Article Title (H1) <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g., Top 10 Breathable Cotton Salwar Sets for Kochi Weather"
                className="w-full text-lg sm:text-xl font-serif font-bold text-slate-900 px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            {/* URL Slug Generator */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                URL Slug <span className="text-amber-500">*</span>
              </label>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus-within:border-amber-500 focus-within:bg-white transition-colors">
                <span className="text-slate-400 font-mono select-none">https://hivenow.in/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  placeholder="top-10-salwar-sets-kochi"
                  className="flex-1 bg-transparent font-mono font-medium text-slate-800 focus:outline-none pl-1"
                />
              </div>
            </div>

            {/* Excerpt / Meta Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Article Excerpt & Meta Description <span className="text-amber-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    excerpt.length >= 120 && excerpt.length <= 160
                      ? "text-emerald-600 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {excerpt.length} / 160 chars
                </span>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                placeholder="A concise summary of the article for Google search snippets (130-160 characters recommended)..."
                className="w-full text-xs text-slate-800 px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all resize-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* TipTap Rich Text Editor Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Article Body (TipTap WYSIWYG + Cloudflare R2 Images)
              </label>
              <button
                type="button"
                onClick={calculateReadTime}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700"
              >
                <Clock className="w-3 h-3" /> Auto-calculate read time
              </button>
            </div>

            <TipTapEditor
              content={content}
              onChange={(html) => setContent(html)}
              placeholder="Start drafting your comprehensive boutique guide or style breakdown..."
            />
          </div>

          {/* Actionable Tips Callout Section */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-serif font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
              Actionable Tips for Shoppers (Highlighted Callout Box)
            </div>
            <p className="text-xs text-slate-500">
              Add practical tips that display prominently inside a styled Kerala boutique callout card.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTip();
                  }
                }}
                placeholder="e.g., Always check boutique sizing measurements before selecting same-day courier"
                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddTip}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {actionableTips.length > 0 && (
              <div className="space-y-2 pt-2">
                {actionableTips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-950 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                      <span>{tip}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTip(index)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive FAQs Accordion Builder */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-serif font-bold text-base">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              Frequently Asked Questions (JSON-LD FAQ Schema)
            </div>
            <p className="text-xs text-slate-500">
              Questions added here are rendered in interactive accordions and structured as FAQ schema for rich search results.
            </p>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <input
                type="text"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="Question (e.g., Do you offer same-day trial returns?)"
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
              />
              <textarea
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                rows={2}
                placeholder="Answer..."
                className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 resize-none"
              />
              <button
                type="button"
                onClick={handleAddFaq}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add FAQ Item
              </button>
            </div>

            {faqs.length > 0 && (
              <div className="space-y-2 pt-2">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{faq.question}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(index)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Metadata, Cover Image, & Live Google SERP Card */}
        <div className="space-y-6">
          {/* Cover Image Upload Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Featured Cover Image (Cloudflare R2)
            </label>

            {coverImageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 group aspect-video bg-slate-100">
                <img
                  src={coverImageUrl}
                  alt="Article Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md hover:bg-slate-100">
                    Replace
                    <input
                      type="file"
                      onChange={handleCoverUpload}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl bg-slate-50/50 cursor-pointer transition-colors group text-center">
                <div className="p-3 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-amber-500 mb-3 transition-colors">
                  {isUploadingCover ? (
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {isUploadingCover ? "Uploading to Cloudflare R2..." : "Click or drag cover image"}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">JPEG, PNG, WEBP up to 5MB</span>
                <input
                  type="file"
                  onChange={handleCoverUpload}
                  disabled={isUploadingCover}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </label>
            )}

            {coverImageUrl && (
              <div className="text-[11px] text-slate-400 font-mono truncate">
                R2 URL: {coverImageUrl}
              </div>
            )}
          </div>

          {/* Publishing & Taxonomy Settings */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Publishing & Categorization
            </h3>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Read Time & Author */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Read Time
                </label>
                <input
                  type="text"
                  value={readTime}
                  onChange={(e) => setReadTime(e.target.value)}
                  placeholder="5 min read"
                  className="w-full text-xs font-medium text-slate-800 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Author Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Hive Editorial Team"
                  className="w-full text-xs font-medium text-slate-800 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Primary Target Keyword
              </label>
              <input
                type="text"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                placeholder="e.g., kochi boutique shopping guide"
                className="w-full text-xs text-slate-800 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Secondary Keywords (Comma-separated)
              </label>
              <input
                type="text"
                value={secondaryKeywordsInput}
                onChange={(e) => setSecondaryKeywordsInput(e.target.value)}
                placeholder="cotton kurtis, kerala weather fashion, saree draping"
                className="w-full text-xs text-slate-800 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Google SERP Real-Time Live Preview */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Search className="w-4 h-4 text-amber-500" />
              Google SERP Live Preview
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <Globe className="w-3 h-3 text-slate-400" />
                <span className="truncate">https://hivenow.in › blog › {slug || "your-slug"}</span>
              </div>
              <div className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer line-clamp-2 leading-snug">
                {title ? `${title} | Hive` : "Article Title Preview | Hive"}
              </div>
              <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {excerpt || "Your article excerpt and meta description will appear here on Google search result cards."}
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete */}
          {isEditing && (
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-700">
                Delete Article
              </h3>
              <p className="text-xs text-red-600 leading-relaxed">
                Permanently deletes this article from the database and stops indexing on search engines.
              </p>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors"
                >
                  Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
