"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Star,
  Search,
  MoveUp,
  MoveDown,
  Layers,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  Calendar,
  Upload,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatCurrency, toast } from "@hive/utils";

export default function AdminHomepageMerchandisingPage() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "collections" | "metadata">("campaigns");
  const [uploadingImage, setUploadingImage] = useState(false);

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
  const heroCampaigns = useQuery(api.homepageAdmin.getAllHeroCampaigns);
  const collections = useQuery(api.homepageAdmin.getAllHomepageCollections);

  // Mutations
  const toggleCampaign = useMutation(api.homepageAdmin.toggleCampaignPublished);
  const deleteCampaign = useMutation(api.homepageAdmin.deleteHeroCampaign);
  const seedStarter = useMutation(api.homepageAdmin.seedDefaultHomepageData);

  // Campaign Form State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignSubtitle, setCampaignSubtitle] = useState("");
  const [campaignImageUrl, setCampaignImageUrl] = useState("");
  const [campaignCtaText, setCampaignCtaText] = useState("Explore Drop");
  const [campaignCtaUrl, setCampaignCtaUrl] = useState("/shop");
  const [campaignPriority, setCampaignPriority] = useState(10);
  const createCampaign = useMutation(api.homepageAdmin.createHeroCampaign);

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
  const deleteCol = useMutation(api.homepageAdmin.deleteCollection);
  const createCol = useMutation(api.homepageAdmin.createCollection);

  // New Collection Modal State
  const [showColModal, setShowColModal] = useState(false);
  const [colTitle, setColTitle] = useState("");
  const [colSubtitle, setColSubtitle] = useState("");
  const [colEmoji, setColEmoji] = useState("✨");
  const [colType, setColType] = useState<"mood" | "occasion" | "trending" | "going_out" | "seasonal">("mood");

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle || !campaignImageUrl) {
      toast.error("Please fill in campaign title and image URL!");
      return;
    }
    const now = Date.now();
    await createCampaign({
      title: campaignTitle,
      subtitle: campaignSubtitle,
      imageUrl: campaignImageUrl,
      ctaText: campaignCtaText,
      ctaUrl: campaignCtaUrl,
      priority: campaignPriority,
      startDate: now - 1000,
      endDate: now + 365 * 24 * 60 * 60 * 1000, // 1 year
      isPublished: true,
    });
    toast.success("Hero Campaign created successfully!");
    setShowCampaignModal(false);
    setCampaignTitle("");
    setCampaignSubtitle("");
    setCampaignImageUrl("");
  };

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
      slug,
      type: colType,
      sortOrder: (collections?.length || 0) + 1,
      isPublished: true,
    });
    toast.success("Collection created successfully!");
    setShowColModal(false);
    setColTitle("");
    setColSubtitle("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 space-y-6 text-slate-900 dark:text-zinc-100 select-none">
      
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Merchandising CMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Homepage v2 Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Curate hero campaigns, mood collections, and occasion edits without touching code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await seedStarter();
              toast.success("Starter campaigns & collections seeded successfully!");
            }}
            className="px-4 py-2.5 bg-slate-900 dark:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Seed Starter Content</span>
          </button>

          {activeTab === "campaigns" && (
            <button
              type="button"
              onClick={() => setShowCampaignModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
          )}
          {activeTab === "collections" && (
            <button
              type="button"
              onClick={() => setShowColModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Collection</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "campaigns"
              ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 font-extrabold"
              : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Hero Campaigns ({heroCampaigns?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "collections"
              ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 font-extrabold"
              : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Curated Collections ({collections?.length || 0})</span>
        </button>
      </div>

      {/* ── Tab 1: Hero Campaigns ───────────────────────────────────────────── */}
      {activeTab === "campaigns" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {heroCampaigns?.map((camp: any) => (
            <div
              key={camp._id}
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs space-y-3 p-4 flex flex-col justify-between"
            >
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800">
                <Image src={camp.imageUrl} alt={camp.title} fill className="object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      camp.isPublished ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {camp.isPublished ? "Live" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {camp.title}
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    Priority: {camp.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                  {camp.subtitle}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => toggleCampaign({ id: camp._id, isPublished: !camp.isPublished })}
                  className="p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
                >
                  {camp.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteCampaign({ id: camp._id });
                    toast.success("Campaign deleted");
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 2: Curated Collections & Product Merchandiser ──────────────── */}
      {activeTab === "collections" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Collection List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Select Collection to Merchandize
            </h2>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {collections?.map((col: any) => (
                <div
                  key={col._id}
                  onClick={() => setSelectedCollectionId(col._id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCollectionId === col._id
                      ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{col.emoji || "✨"}</span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold truncate">{col.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                        {col.type} • {col.productCount} items
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCol({ id: col._id });
                      toast.success("Collection deleted");
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Visual Product Merchandiser */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xs">
            {selectedCollection ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                      {selectedCollection.type} Collection
                    </span>
                    <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                      Merchandizing: {selectedCollection.title}
                    </h2>
                  </div>

                  {/* Catalog Search & Add Bar */}
                  <div className="relative w-64">
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
                          className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-amber-500 cursor-pointer flex items-center gap-2"
                        >
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                            <Image src={p.imageUrl || "/placeholder.png"} alt={p.name} fill className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 truncate">{p.name}</h4>
                            <span className="text-[10px] font-semibold text-slate-400">{formatCurrency(p.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collection Items Grid with Pinning & Removal */}
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Curated Collection Items ({collectionProducts?.length || 0})
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
                            <Image src={item.imageUrl || "/placeholder.png"} alt={item.name} fill className="object-cover" />
                            {item.isPinned && (
                              <div className="absolute top-1 left-1 px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-md uppercase flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-slate-950" />
                                <span>PINNED #1</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</h4>
                            <p className="text-[10px] text-slate-400">{formatCurrency(item.price)}</p>
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
                    <div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-2">
                      <p className="text-xs font-semibold text-slate-500">No products added to this collection yet.</p>
                      <p className="text-[11px] text-slate-400">Use the search bar above to search catalog items and add them.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto stroke-1" />
                <p className="text-xs font-semibold">Select a collection on the left to start merchandising.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── New Campaign Modal ──────────────────────────────────────────────── */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCampaign}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Hero Campaign</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Monsoon Handloom Edit '26"
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={campaignSubtitle}
                  onChange={(e) => setCampaignSubtitle(e.target.value)}
                  placeholder="e.g. Breathable Kerala linens & hand-dyed organzas"
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Campaign Banner Image (Cloudflare R2)
                </label>
                <div className="flex gap-2 items-center mb-1.5">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl transition">
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingImage ? "Uploading to R2..." : "Upload Image to Cloudflare R2"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleFileUploadToR2(file);
                          if (url) setCampaignImageUrl(url);
                        }
                      }}
                    />
                  </label>
                </div>
                <input
                  type="url"
                  required
                  value={campaignImageUrl}
                  onChange={(e) => setCampaignImageUrl(e.target.value)}
                  placeholder="Or paste external image URL..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={campaignCtaText}
                    onChange={(e) => setCampaignCtaText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Priority</label>
                  <input
                    type="number"
                    value={campaignPriority}
                    onChange={(e) => setCampaignPriority(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs"
              >
                Save Campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── New Collection Modal ────────────────────────────────────────────── */}
      {showColModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCollection}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Collection</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="e.g. Feeling Cute"
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Type</label>
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
