"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
// Deployment trigger comment (Attempt 4)
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
  Edit,
  Eye,
  EyeOff,
  Filter,
  Check,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Grid,
  Store,
  ShoppingBag,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  X,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatCurrency, toast } from "@hive/utils";
import { ExperienceStudio } from "./ExperienceStudio";

export default function AdminHomepageMerchandisingPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

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

  // View Mode: 'experiences' | 'collections'
  const [viewMode, setViewMode] = useState<"experiences" | "collections">("experiences");

  // Queries
  const experiences = useQuery(api.homepageAdmin.getExperiences);
  const homepageExp = experiences?.find((e: any) => e.slug === "homepage");
  const collections = useQuery(api.homepageAdmin.getAllHomepageCollections);
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });
  const boutiques = useQuery(api.boutiques.getApprovedBoutiques);
  const blocks = useQuery(api.homepageAdmin.getExperienceBlocks, homepageExp ? { experienceId: homepageExp._id, status: previewStatus } : "skip");

  // Mutations
  const seedStarter = useMutation(api.homepageAdmin.seedDefaultHomepageData);
  const deleteCol = useMutation(api.homepageAdmin.deleteCollection);
  const createCol = useMutation(api.homepageAdmin.createCollection);
  const publishBlocks = useMutation(api.homepageAdmin.publishExperienceBlocks);
  const updateBlock = useMutation(api.homepageAdmin.updateExperienceBlock);
  const duplicateColMutation = useMutation(api.homepageAdmin.duplicateCollection);
  const duplicateCampaignMutation = useMutation(api.homepageAdmin.duplicateCampaign);

  const handlePublishLive = async () => {
    try {
      if (!homepageExp) throw new Error("Homepage experience not found");
      setIsPublishing(true);
      const count = await publishBlocks({ experienceId: homepageExp._id });
      toast.success(`Published ${count} homepage blocks live to production! 🚀`);
    } catch (err: any) {
      toast.error("Failed to publish blocks: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Operational Filters & Preview Controls
  const [filterTab, setFilterTab] = useState<"all" | "published" | "hidden" | "manual" | "rule">("all");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "iphone" | "android">("iphone");
  const [personaPreview, setPersonaPreview] = useState<"guest" | "logged_in">("guest");

  // Collection Selection & Merchandising State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Visual Product Catalog Picker Modal State
  const [showCatalogPickerModal, setShowCatalogPickerModal] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState("all");
  const [pickerBoutique, setPickerBoutique] = useState("all");
  const [selectedProductIdsToAdd, setSelectedProductIdsToAdd] = useState<Set<string>>(new Set());
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [showAutoFillMenu, setShowAutoFillMenu] = useState(false);

  const catalogSearchResults = useQuery(
    api.homepageAdmin.searchCatalogProducts,
    { query: productSearchQuery, limit: 12, collectionId: selectedCollectionId ?? undefined }
  );

  const pickerProducts = useQuery(
    api.homepageAdmin.getCatalogProductsForMerchandising,
    showCatalogPickerModal && selectedCollectionId
      ? {
        query: pickerSearchQuery || undefined,
        categoryId: pickerCategory !== "all" ? pickerCategory : undefined,
        boutiqueId: pickerBoutique !== "all" ? pickerBoutique : undefined,
        collectionId: selectedCollectionId,
        limit: 120,
      }
      : "skip"
  );

  const selectedCollection = collections?.find((c: any) => c._id === selectedCollectionId);
  const collectionProducts = useQuery(
    api.homepage.getCollectionProducts,
    selectedCollectionId ? { collectionId: selectedCollectionId as any } : "skip"
  );

  const addProduct = useMutation(api.homepageAdmin.addProductToCollection);
  const addProductsBatch = useMutation(api.homepageAdmin.addProductsToCollectionBatch);
  const autoPopulate = useMutation(api.homepageAdmin.autoPopulateCollection);
  const removeProduct = useMutation(api.homepageAdmin.removeProductFromCollection);
  const togglePin = useMutation(api.homepageAdmin.togglePinProduct);
  const reorderProducts = useMutation(api.homepageAdmin.reorderCollectionProducts);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIdsToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleBatchAddProducts = async () => {
    if (!selectedCollectionId || selectedProductIdsToAdd.size === 0) return;
    try {
      setIsAddingBatch(true);
      const count = await addProductsBatch({
        collectionId: selectedCollectionId,
        productIds: Array.from(selectedProductIdsToAdd) as any[],
      });
      toast.success(`Added ${count} products to ${selectedCollection?.title || "collection"}!`);
      setSelectedProductIdsToAdd(new Set());
      setShowCatalogPickerModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add products");
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleAutoFillAction = async (mode: "category" | "boutique" | "new_arrivals" | "best_sellers", targetId?: string) => {
    if (!selectedCollectionId) return;
    try {
      setShowAutoFillMenu(false);
      const count = await autoPopulate({
        collectionId: selectedCollectionId,
        mode,
        targetId,
        limit: 12,
      });
      toast.success(`Auto-populated ${count} products into collection!`);
    } catch (err: any) {
      toast.error(err.message || "Auto-populate failed");
    }
  };

  const handleMoveItem = async (currentIndex: number, direction: "up" | "down") => {
    if (!collectionProducts || !selectedCollectionId) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= collectionProducts.length) return;

    const reordered = [...collectionProducts];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await reorderProducts({
        collectionId: selectedCollectionId,
        orderedProductIds: reordered.map((p: any) => p._id),
      });
    } catch (err: any) {
      toast.error("Failed to reorder: " + err.message);
    }
  };

  // New Collection Modal State
  const [showColModal, setShowColModal] = useState(false);
  const [colTitle, setColTitle] = useState("");
  const [colSubtitle, setColSubtitle] = useState("");
  const [colImageUrl, setColImageUrl] = useState("");

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colTitle) {
      toast.error("Please enter collection title!");
      return;
    }
    const slug = colTitle.toLowerCase().replace(/\s+/g, "-");
    await createCol({
      name: colTitle,
      description: colSubtitle || undefined,
      coverImage: colImageUrl || undefined,
      slug,
      sourceMode: "MANUAL",
      status: "published",
    });
    toast.success("Collection created successfully!");
    setShowColModal(false);
    setColTitle("");
    setColSubtitle("");
    setColImageUrl("");
  };

  const [showEditColModal, setShowEditColModal] = useState(false);
  const updateCol = useMutation(api.homepageAdmin.updateCollection);

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionId) return;
    try {
      await updateCol({
        id: selectedCollectionId as any,
        name: colTitle,
        description: colSubtitle || undefined,
        coverImage: colImageUrl || undefined,
      });
      toast.success("Collection updated successfully!");
      setShowEditColModal(false);
      setColTitle("");
      setColSubtitle("");
      setColImageUrl("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredCollections = collections?.filter((c: any) => {
    if (filterTab === "all") return true;
    if (filterTab === "published") return c.status === "published";
    if (filterTab === "hidden") return c.status !== "published";
    if (filterTab === "manual") return c.sourceMode === "MANUAL";
    if (filterTab === "rule") return c.sourceMode === "RULE";
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
            Curate collections, schedule marketing campaigns, and render dynamic customer experiences.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setViewMode("experiences")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === "experiences"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            Experience Studio
          </button>
          <button
            onClick={() => setViewMode("collections")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === "collections"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            Collections Merchandising
          </button>
        </div>
      </div>

      {viewMode === "experiences" ? (
        <ExperienceStudio />
      ) : (
        <>
          {/* ── Operational Status Filter Tabs & Persona Toolbar ──────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {(["all", "published", "hidden", "manual", "rule"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl capitalize transition cursor-pointer ${filterTab === tab
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
                  onClick={() => setDevicePreview("android")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${devicePreview !== "iphone" && devicePreview !== "desktop" ? "bg-amber-500 text-slate-900" : "hover:text-white"}`}
                >
                  Merchandize
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview("iphone")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${devicePreview === "iphone" ? "bg-amber-500/20 text-amber-400" : "hover:text-white"}`}
                >
                  Preview: iPhone
                </button>
                <button
                  type="button"
                  onClick={() => setDevicePreview("desktop")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${devicePreview === "desktop" ? "bg-amber-500/20 text-amber-400" : "hover:text-white"}`}
                >
                  Preview: Desktop
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full hidden sm:inline-block">
                    Click to Merchandize
                  </span>
                  <button
                    onClick={() => setShowColModal(true)}
                    className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
                    title="Create New Collection"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {filteredCollections?.map((col: any) => (
                  <div
                    key={col._id}
                    onClick={() => setSelectedCollectionId(col._id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${selectedCollectionId === col._id
                        ? "bg-amber-500/10 border-amber-500 shadow-xs"
                        : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 relative flex items-center justify-center text-lg font-bold">
                        {col.coverImage ? (
                          <img src={col.coverImage} alt={col.name || col.title || "Collection"} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-300"><Layers className="w-5 h-5" /></span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {col.name || col.title || "Untitled Collection"}
                          </span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const newStatus = col.status === "published" ? "draft" : "published";
                              await updateCol({ id: col._id, status: newStatus });
                              toast.success(
                                newStatus === "published"
                                  ? `"${col.name || col.title}" is now PUBLISHED and visible on Customer UI`
                                  : `"${col.name || col.title}" is now HIDDEN from Customer UI`
                              );
                            }}
                            title={col.status === "published" ? "Click to Hide from Customer UI" : "Click to Publish to Customer UI"}
                            className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full cursor-pointer transition select-none ${col.status === "published"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20"
                              }`}
                          >
                            {col.status === "published" ? (
                              <>
                                <Eye className="w-2.5 h-2.5" /> PUBLISHED
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-2.5 h-2.5" /> HIDDEN
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
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
                        {selectedCollection.sourceMode} Collection
                      </span>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                          {(devicePreview === "iphone" || devicePreview === "desktop") ? "Customer Preview: " : "Merchandizing: "} {selectedCollection.title}
                        </h2>
                        <button
                          onClick={() => {
                            setColTitle(selectedCollection.title || "");
                            setColSubtitle(selectedCollection.subtitle || "");
                            setColImageUrl(selectedCollection.coverImage || "");
                            setShowEditColModal(true);
                          }}
                          className="p-1 hover:text-amber-500 text-slate-400 bg-slate-100 dark:bg-zinc-800 rounded transition cursor-pointer"
                          title="Edit Collection"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Catalog Merchandising Toolbar */}
                    {(devicePreview !== "iphone" && devicePreview !== "desktop") && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Visual Catalog Picker Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductIdsToAdd(new Set());
                            setShowCatalogPickerModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>Browse Catalog Picker</span>
                        </button>

                        {/* Smart Auto-Fill Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowAutoFillMenu(!showAutoFillMenu)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Smart Auto-Fill</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {showAutoFillMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowAutoFillMenu(false)} />
                              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-50 text-left font-sans text-xs">
                                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Instant 1-Click Auto Fill
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAutoFillAction("new_arrivals")}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Fill New Arrivals (Top 12)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAutoFillAction("best_sellers")}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200"
                                >
                                  <Star className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Fill Best Sellers (Top 12)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAutoFillAction("category", "kurtis")}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200"
                                >
                                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Fill Kurtis (Top 12)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAutoFillAction("category", "sarees")}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200"
                                >
                                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Fill Sarees (Top 12)</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Quick Search Bar */}
                        <div className="relative w-full sm:w-56">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Quick search..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PREVIEW MODE UI */}
                  {(devicePreview === "iphone" || devicePreview === "desktop") ? (
                    <div className={`mx-auto bg-slate-100 dark:bg-black rounded-3xl overflow-hidden border border-slate-200 dark:border-zinc-800 ${devicePreview === "iphone" ? "w-full max-w-[390px] shadow-2xl h-[700px] overflow-y-auto" : "w-full min-h-[500px]"}`}>
                      <div className="p-4 sm:p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">{selectedCollection.title}</h2>
                            {selectedCollection.subtitle && <p className="text-xs text-slate-500 mt-1">{selectedCollection.subtitle}</p>}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-full shadow-xs bg-white dark:bg-zinc-900 cursor-pointer">
                            View All
                          </span>
                        </div>

                        {collectionProducts && collectionProducts.length > 0 ? (
                          <div className={`grid gap-4 ${devicePreview === "iphone" ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-5"}`}>
                            {collectionProducts.map((item: any) => (
                              <div key={item._id} className="group cursor-pointer space-y-3">
                                <div className={`relative bg-slate-200 dark:bg-zinc-900 rounded-2xl overflow-hidden ${devicePreview === "iphone" ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
                                  <img src={item.imageUrl || "https://placehold.co/400x500/png?text=No+Image"} alt={item.name} className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                                  <button className="absolute top-2 right-2 p-1.5 bg-white/50 backdrop-blur-md rounded-full text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Star className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</h3>
                                  <p className="text-xs text-slate-500">{item.boutique?.name || item.boutiqueName || "Boutique"}</p>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">{formatCurrency(item.price || 0)}</span>
                                    {item.compareAtPrice && <span className="text-xs text-slate-400 line-through">{formatCurrency(item.compareAtPrice)}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center space-y-2">
                            <p className="text-sm font-semibold text-slate-500">Collection is empty.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* MERCHANDIZING MODE UI */}
                      {/* Quick Search Overlay Results */}
                      {productSearchQuery.trim().length > 0 && (
                        <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl space-y-2 border border-slate-200 dark:border-zinc-700">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Catalog Quick Search (Click to Add)
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
                                  <span className="text-[11px] font-semibold text-slate-500">{formatCurrency(p.price || 0)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Collection Items Grid with Pinning, Reordering & Removal */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Curated Items ({collectionProducts?.length || 0})
                          </h3>
                          {collectionProducts && collectionProducts.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              Use arrows to arrange order or star to pin #1
                            </span>
                          )}
                        </div>

                        {collectionProducts && collectionProducts.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {collectionProducts.map((item: any, idx: number) => (
                              <div
                                key={item._id}
                                className={`relative bg-slate-50 dark:bg-zinc-800/80 p-2.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${item.isPinned ? "border-amber-500 shadow-xs" : "border-slate-200 dark:border-zinc-800"
                                  }`}
                              >
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                                  <img src={item.imageUrl || "https://placehold.co/400x400/png?text=No+Image"} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                                  <div className="absolute top-1 left-1 flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold rounded-md">
                                      #{idx + 1}
                                    </span>
                                    {item.isPinned && (
                                      <div className="px-1.5 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-md uppercase flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5 fill-slate-950" />
                                        <span>PINNED</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</h4>
                                  <p className="text-[10px] text-slate-400">{formatCurrency(item.price || 0)}</p>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-zinc-700">
                                  {/* Reorder Arrows */}
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveItem(idx, "up")}
                                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                                      title="Move Left / Earlier"
                                    >
                                      <ArrowUp className="w-3 h-3 -rotate-90" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === collectionProducts.length - 1}
                                      onClick={() => handleMoveItem(idx, "down")}
                                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                                      title="Move Right / Later"
                                    >
                                      <ArrowDown className="w-3 h-3 -rotate-90" />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => togglePin({ collectionId: selectedCollection._id, productId: item._id })}
                                      className={`p-1 rounded-lg transition cursor-pointer ${item.isPinned ? "text-amber-500 bg-amber-500/10" : "text-slate-400 hover:text-amber-500"
                                        }`}
                                      title={item.isPinned ? "Unpin item" : "Pin to position #1"}
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeProduct({ collectionId: selectedCollection._id, productId: item._id })}
                                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                                      title="Remove from collection"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-3">
                            <ShoppingBag className="w-8 h-8 mx-auto text-amber-500/60" />
                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">No products in this collection yet.</p>
                            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                              Click "Browse Catalog Picker" or "Smart Auto-Fill" above to add fashion products with multi-select.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductIdsToAdd(new Set());
                                setShowCatalogPickerModal(true);
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Grid className="w-3.5 h-3.5" />
                              <span>Open Product Picker</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

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
          {/* ── Edit Collection Modal with Cloudflare R2 Upload ────────────────── */}
          {showEditColModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <form
                onSubmit={handleUpdateCollection}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Collection</h3>
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
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditColModal(false)}
                    className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* ── Visual Catalog Product Picker Modal ──────────────────────────── */}
          {showCatalogPickerModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">
                      Visual Merchandising Studio
                    </span>
                    <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                      Add Products to "{selectedCollection?.title || "Collection"}"
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCatalogPickerModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900 shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by name, category, fabric..."
                        value={pickerSearchQuery}
                        onChange={(e) => setPickerSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    {/* Boutique Store Filter */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Store className="w-4 h-4 text-slate-400 shrink-0" />
                      <select
                        value={pickerBoutique}
                        onChange={(e) => setPickerBoutique(e.target.value)}
                        className="py-2 px-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
                      >
                        <option value="all">All Boutiques / Stores</option>
                        {boutiques?.map((b: any) => (
                          <option key={b._id} value={b._id}>
                            {b.boutiqueName || b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                    <button
                      type="button"
                      onClick={() => setPickerCategory("all")}
                      className={`px-3 py-1 rounded-full font-bold transition shrink-0 cursor-pointer ${pickerCategory === "all"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                        }`}
                    >
                      All Categories
                    </button>
                    {categories?.map((cat: any) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => setPickerCategory(cat.slug || cat._id)}
                        className={`px-3 py-1 rounded-full font-bold transition shrink-0 cursor-pointer ${pickerCategory === (cat.slug || cat._id)
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                          }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Cards Grid */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-zinc-950">
                  {pickerProducts && pickerProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {pickerProducts.map((product: any) => {
                        const isSelected = selectedProductIdsToAdd.has(product._id);
                        const isInCol = product.isAlreadyInCollection;

                        return (
                          <div
                            key={product._id}
                            onClick={() => {
                              if (!isInCol) toggleProductSelection(product._id);
                            }}
                            className={`group relative bg-white dark:bg-zinc-900 p-2.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 cursor-pointer select-none ${isInCol
                                ? "opacity-60 border-slate-200 dark:border-zinc-800 bg-slate-50/80"
                                : isSelected
                                  ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.01]"
                                  : "border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 shadow-2xs"
                              }`}
                          >
                            {/* Thumbnail & Select Checkbox */}
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                              <img
                                src={product.imageUrl || (product.images && product.images[0]) || "https://placehold.co/400x400/png?text=No+Image"}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />

                              {/* Multi-Select Checkbox */}
                              {!isInCol && (
                                <div className="absolute top-1.5 left-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleProductSelection(product._id);
                                    }}
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition shadow-xs cursor-pointer ${isSelected
                                        ? "bg-amber-500 text-slate-950 font-bold"
                                        : "bg-white/90 dark:bg-zinc-900/90 text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-zinc-700"
                                      }`}
                                  >
                                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                                  </button>
                                </div>
                              )}

                              {isInCol && (
                                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold rounded-md uppercase">
                                  In Collection
                                </div>
                              )}
                            </div>

                            {/* Title & Metadata */}
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {product.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate">
                                {product.boutique?.name || product.boutiqueName || "Boutique"}
                              </p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
                                  {formatCurrency(product.price || 0)}
                                </span>
                                {product.categoryName && (
                                  <span className="text-[9.5px] bg-slate-100 dark:bg-zinc-800 text-slate-500 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">
                                    {product.categoryName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quick 1-Click Action */}
                            <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                              {isInCol ? (
                                <div className="w-full py-1 text-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                  ✓ Already Added
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!selectedCollectionId) return;
                                    await addProduct({ collectionId: selectedCollectionId, productId: product._id });
                                    toast.success(`Added ${product.name}`);
                                  }}
                                  className="w-full py-1 text-center text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>1-Click Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-2">
                      <Search className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">No matching products found.</p>
                      <p className="text-[11px] text-slate-400">Try changing your category filter, store filter, or search query.</p>
                    </div>
                  )}
                </div>

                {/* Modal Sticky Batch Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      {selectedProductIdsToAdd.size} item{selectedProductIdsToAdd.size === 1 ? "" : "s"} selected
                    </span>
                    {selectedProductIdsToAdd.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductIdsToAdd(new Set())}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCatalogPickerModal(false)}
                      className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      disabled={selectedProductIdsToAdd.size === 0 || isAddingBatch}
                      onClick={handleBatchAddProducts}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {isAddingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Add {selectedProductIdsToAdd.size > 0 ? `${selectedProductIdsToAdd.size} Selected` : "Selected"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
}
