"use client";

import React, { useState } from "react";
// Using native <img> for R2 CDN images (bypasses Vercel image proxy)
import {
  Sparkles,
  Plus,
  Trash2,
  Star,
  Search,
  Layers,
  Upload,
  Loader2,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatCurrency, toast } from "@hive/utils";

export default function AdminHomepageMerchandisingPage() {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<"draft" | "published">("draft");
  const [isPublishing, setIsPublishing] = useState(false);

  const handleFileUploadToR2 = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload file to R2");
      }

      toast.success("Image saved to Cloudflare R2!");
      return data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Queries
  const collections = useQuery(api.homepageAdmin.getAllHomepageCollections);
  const blocks = useQuery(api.homepageAdmin.getAllHomepageBlocks, { status: previewStatus });
  const livePreviewBlocks = useQuery(api.homepage.getActiveHomepageBlocks, { status: previewStatus });

  // Mutations
  const seedStarter = useMutation(api.homepageAdmin.seedDefaultHomepageData);
  const deleteCol = useMutation(api.homepageAdmin.deleteCollection);
  const createCol = useMutation(api.homepageAdmin.createCollection);
  const publishBlocks = useMutation(api.homepageAdmin.publishDraftBlocks);
  const updateBlock = useMutation(api.homepageAdmin.updateHomepageBlock);
  const duplicateColMutation = useMutation(api.homepageAdmin.duplicateCollection);
  const duplicateCampaignMutation = useMutation(api.homepageAdmin.duplicateCampaign);

  const handlePublishLive = async () => {
    try {
      setIsPublishing(true);
      const count = await publishBlocks({});
      toast.success(`Published ${count} homepage blocks live to production! 🚀`);
    } catch (err: any) {
      toast.error("Failed to publish blocks: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Operational Filters & Preview Controls
  const [filterTab, setFilterTab] = useState<"all" | "editorial" | "automated" | "seasonal" | "draft" | "archived">("all");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "iphone" | "android">("iphone");
  const [personaPreview, setPersonaPreview] = useState<"guest" | "logged_in">("guest");

  // Collection Selection & Merchandising State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const catalogSearchResults = useQuery(
    api.homepageAdmin.searchCatalogProducts,
    { query: productSearchQuery, limit: 12 }
  );

  const selectedCollection = collections?.find((c: any) => c._id === selectedCollectionId);
  const collectionProducts = useQuery(
    api.homepage.getCollectionProducts,
    selectedCollectionId ? { collectionId: selectedCollectionId as any } : "skip"
  );

  const addProduct = useMutation(api.homepageAdmin.addProductToCollection);
  const removeProduct = useMutation(api.homepageAdmin.removeProductFromCollection);
  const togglePin = useMutation(api.homepageAdmin.togglePinProduct);

  // New Collection Modal State
  const [showColModal, setShowColModal] = useState(false);
  const [colTitle, setColTitle] = useState("");
  const [colSubtitle, setColSubtitle] = useState("");
  const [colEmoji, setColEmoji] = useState("✨");
  const [colImageUrl, setColImageUrl] = useState("");
  const [colType, setColType] = useState<"mood" | "occasion" | "trending" | "going_out" | "seasonal">("mood");

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle) {
      toast.error("Please enter collection title!");
      return;
    }
    const slug = colTitle.toLowerCase().replace(/\s+/g, "-");
    await createCol({
      title: colTitle,
      subtitle: colSubtitle || undefined,
      emoji: colEmoji || undefined,
      imageUrl: colImageUrl || undefined,
      slug,
      type: colType,
      sortOrder: (collections?.length || 0) + 1,
      isPublished: true,
    });
    toast.success("Collection created successfully!");
    setShowColModal(false);
    setColTitle("");
    setColSubtitle("");
    setColImageUrl("");
  };

  const filteredCollections = collections?.filter((c: any) => {
    if (filterTab === "all") return true;
    if (filterTab === "editorial") return c.type === "mood" || c.type === "going_out";
    if (filterTab === "automated") return c.type === "trending";
    if (filterTab === "seasonal") return c.type === "seasonal";
    if (filterTab === "draft") return !c.isPublished;
    if (filterTab === "archived") return c.isPublished === false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 space-y-6 text-slate-900 dark:text-zinc-100 select-none">
      
      {/* ── Top Header & Operational Quick Actions ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Operational Merchandising Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Experiences & Content Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Curate collections, schedule marketing campaigns, and render dynamic customer experiences across PWA & push channels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Collection</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewStatus(previewStatus === "draft" ? "published" : "draft")}
            className={`px-3.5 py-2.5 font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer border ${
              previewStatus === "draft"
                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
            }`}
          >
            <span>Status: {previewStatus.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={handlePublishLive}
            disabled={isPublishing}
            className="px-4 py-2.5 bg-slate-900 dark:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 border border-slate-700"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            <span>Publish Live</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await seedStarter();
              toast.success("Hive Essentials collections & blocks imported successfully!");
            }}
            className="px-3.5 py-2.5 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition border border-zinc-700/60 cursor-pointer"
          >
            <span>Import Hive Essentials</span>
          </button>
        </div>
      </div>

      {/* ── Operational Status Filter Tabs & Persona Toolbar ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {(["all", "editorial", "automated", "seasonal", "draft"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl capitalize transition cursor-pointer ${
                filterTab === tab
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60">
            <button
              type="button"
              onClick={() => setDevicePreview("iphone")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${devicePreview === "iphone" ? "bg-amber-500/20 text-amber-400" : "hover:text-white"}`}
            >
              iPhone
            </button>
            <button
              type="button"
              onClick={() => setDevicePreview("desktop")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${devicePreview === "desktop" ? "bg-amber-500/20 text-amber-400" : "hover:text-white"}`}
            >
              Desktop
            </button>
          </div>

          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60">
            <button
              type="button"
              onClick={() => setPersonaPreview("guest")}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${personaPreview === "guest" ? "bg-emerald-500/20 text-emerald-400" : "hover:text-white"}`}
            >
              Guest
            </button>
            <button
              type="button"
              onClick={() => setPersonaPreview("logged_in")}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${personaPreview === "logged_in" ? "bg-emerald-500/20 text-emerald-400" : "hover:text-white"}`}
            >
              Logged In
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Merchandising Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Collection List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Collections ({collections?.length || 0})
            </h2>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              Click to Merchandize
            </span>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredCollections?.map((col: any) => (
              <div
                key={col._id}
                onClick={() => setSelectedCollectionId(col._id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedCollectionId === col._id
                    ? "bg-amber-500/10 border-amber-500 shadow-xs"
                    : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 relative flex items-center justify-center text-lg font-bold">
                    {col.imageUrl ? (
                      <img src={col.imageUrl} alt={col.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span>{col.emoji || "✨"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {col.title}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500">
                        {col.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {col.productCount || 0} items curated
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCol({ id: col._id });
                    if (selectedCollectionId === col._id) setSelectedCollectionId(null);
                    toast.success("Collection deleted");
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {(!collections || collections.length === 0) && (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-2">
                <Layers className="w-6 h-6 mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No collections created yet.</p>
                <p className="text-[11px] text-slate-400">Click "Seed Starter Collections" above or create a new collection.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Product Merchandiser */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xs min-h-[500px]">
          {selectedCollection ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                    {selectedCollection.type} Collection
                  </span>
                  <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                    Merchandizing: {selectedCollection.title}
                  </h2>
                </div>

                {/* Catalog Search & Add Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search catalog to add..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Catalog Search Overlay Results */}
              {productSearchQuery.trim().length > 0 && (
                <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl space-y-2 border border-slate-200 dark:border-zinc-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Catalog Search Results (Click to Add)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {catalogSearchResults?.map((p: any) => (
                      <div
                        key={p._id}
                        onClick={async () => {
                          await addProduct({ collectionId: selectedCollection._id, productId: p._id });
                          toast.success(`Added ${p.name} to collection`);
                        }}
                        className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-amber-500 cursor-pointer flex items-center gap-3"
                      >
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-100">
                          <img src={p.imageUrl || "https://placehold.co/400x400/png?text=No+Image"} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 line-clamp-1">{p.name}</h4>
                          <span className="text-[11px] font-semibold text-slate-500">{formatCurrency(p.priceMin || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collection Items Grid with Pinning & Removal */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Curated Items ({collectionProducts?.length || 0})
                </h3>

                {collectionProducts && collectionProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {collectionProducts.map((item: any) => (
                      <div
                        key={item._id}
                        className={`relative bg-slate-50 dark:bg-zinc-800/80 p-2.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                          item.isPinned ? "border-amber-500 shadow-xs" : "border-slate-200 dark:border-zinc-800"
                        }`}
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                          <img src={item.imageUrl || "https://placehold.co/400x400/png?text=No+Image"} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                          {item.isPinned && (
                            <div className="absolute top-1 left-1 px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-md uppercase flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-slate-950" />
                              <span>PINNED #1</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</h4>
                          <p className="text-[10px] text-slate-400">{formatCurrency(item.priceMin || 0)}</p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-zinc-700">
                          <button
                            type="button"
                            onClick={() => togglePin({ collectionId: selectedCollection._id, productId: item._id })}
                            className={`p-1 rounded-lg transition ${
                              item.isPinned ? "text-amber-500 bg-amber-500/10" : "text-slate-400 hover:text-amber-500"
                            }`}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProduct({ collectionId: selectedCollection._id, productId: item._id })}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">No products added to this collection yet.</p>
                    <p className="text-[11px] text-slate-400">Use the search bar above to search catalog items and add them.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-400 space-y-2 flex flex-col items-center justify-center min-h-[400px]">
              <Layers className="w-10 h-10 stroke-1 text-amber-500/60" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200">No Collection Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a collection on the left sidebar to add products, pin featured items to slot #1, or reorder curation.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── New Collection Modal with Cloudflare R2 Upload ────────────────── */}
      {showColModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCollection}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Curated Collection</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Collection Title</label>
                <input
                  type="text"
                  required
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="e.g. Feeling Cute"
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={colSubtitle}
                  onChange={(e) => setColSubtitle(e.target.value)}
                  placeholder="e.g. Curated aesthetic outfits"
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              {/* R2 Image Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Collection Cover Image (Cloudflare R2)
                </label>
                <div className="flex gap-2 items-center mb-1.5">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl transition">
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingImage ? "Uploading to R2..." : "Upload Cover Image to R2"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUploadToR2(file);
                          if (url) setColImageUrl(url);
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="url"
                  value={colImageUrl}
                  onChange={(e) => setColImageUrl(e.target.value)}
                  placeholder="Or paste external image URL..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Collection Type</label>
                  <select
                    value={colType}
                    onChange={(e) => setColType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold"
                  >
                    <option value="mood">Mood</option>
                    <option value="occasion">Occasion</option>
                    <option value="trending">Trending</option>
                    <option value="going_out">Going Out</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={colEmoji}
                    onChange={(e) => setColEmoji(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowColModal(false)}
                className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs"
              >
                Create Collection
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
