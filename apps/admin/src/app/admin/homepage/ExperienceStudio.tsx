"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "@hive/utils";
import {
  Sparkles, Plus, Trash2, Settings, Smartphone, Layout, Copy, Edit, X, Eye, EyeOff, Search, Layers, ShoppingBag, Zap, ChevronDown, ChevronUp, Upload, Loader2, Link as LinkIcon
} from "lucide-react";
import { Id } from "../../../../../../convex/_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DRIVEN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

type BlockType = "hero" | "collection" | "category" | "recentlyViewed" | "trust" | "banner";

interface BlockSchema {
  id: BlockType;
  name: string;
  category: "Marketing" | "Collections" | "Commerce";
  icon: React.ElementType;
  description: string;
  defaultConfig: {
    title?: string;
    renderer: string;
    config: any;
  };
  fields: ("title" | "subtitle" | "collectionId" | "campaignId" | "maxProducts" | "showSeeAll" | "renderer")[];
}

const BLOCK_REGISTRY: BlockSchema[] = [
  {
    id: "hero",
    name: "Hero Banner",
    category: "Marketing",
    icon: Zap,
    description: "Large full-bleed graphic image banner at top of page.",
    defaultConfig: { title: "", renderer: "largeCards", config: {} },
    fields: ["bannerUpload", "targetUrl"]
  },
  {
    id: "banner",
    name: "Editorial Banner",
    category: "Marketing",
    icon: Layers,
    description: "Graphic lifestyle banner image between collection rows.",
    defaultConfig: { title: "", renderer: "largeCards", config: {} },
    fields: ["bannerUpload", "targetUrl"]
  },
  {
    id: "collection",
    name: "Product Carousel",
    category: "Collections",
    icon: ShoppingBag,
    description: "Horizontal scrollable list of products.",
    defaultConfig: { title: "Featured Products", renderer: "productCarousel", config: { maxProducts: 12, showSeeAll: true } },
    fields: ["title", "subtitle", "collectionId", "maxProducts", "showSeeAll"]
  },
  {
    id: "category",
    name: "Category Grid",
    category: "Collections",
    icon: Layout,
    description: "Grid of product categories.",
    defaultConfig: { title: "Shop by Category", renderer: "occasionGrid", config: {} },
    fields: ["title", "subtitle"]
  },
  {
    id: "recentlyViewed",
    name: "Recently Viewed",
    category: "Commerce",
    icon: Eye,
    description: "Personalized history of user's viewed items.",
    defaultConfig: { title: "Recently Viewed", renderer: "productCarousel", config: { maxProducts: 10 } },
    fields: ["title", "maxProducts"]
  },
  {
    id: "trust",
    name: "Trust Strip",
    category: "Commerce",
    icon: Sparkles,
    description: "Icons showing delivery promises and authentic guarantees.",
    defaultConfig: { title: "", renderer: "largeCards", config: {} },
    fields: []
  }
];

export function ExperienceStudio() {
  const experiences = useQuery(api.homepageAdmin.getExperiences);
  
  // Fetch dependencies for block configs
  const collections = useQuery(api.homepageAdmin.getAllHomepageCollections);
  const campaigns = useQuery(api.homepageAdmin.getAllEditorialBanners);
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });

  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blocks" | "settings">("blocks");
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);

  // Set default selection
  useEffect(() => {
    if (!selectedExpId && experiences && experiences.length > 0) {
      setSelectedExpId(experiences[0]._id);
    }
  }, [experiences, selectedExpId]);

  const selectedExp = experiences?.find((e: any) => e._id === selectedExpId);
  // Fetch ALL blocks (draft and archived/hidden)
  const rawBlocks = useQuery(api.homepageAdmin.getExperienceBlocks, selectedExp ? { experienceId: selectedExp._id, status: "all" } : "skip");
  
  // Local state for optimistic updates
  const [blocks, setBlocks] = useState<any[]>([]);
  useEffect(() => {
    if (rawBlocks) {
      setBlocks([...rawBlocks].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [rawBlocks]);

  const duplicateExp = useMutation(api.homepageAdmin.duplicateExperience);
  const publishExp = useMutation(api.homepageAdmin.publishExperience);
  const addBlock = useMutation(api.homepageAdmin.addBlockToExperience);
  const removeBlock = useMutation(api.homepageAdmin.removeBlockFromExperience);
  const updateLayout = useMutation(api.homepageAdmin.updateExperienceLayout);
  
  // Granular Mutations
  const updateExp = useMutation(api.homepageAdmin.updateExperience);
  const updateBlockContent = useMutation(api.homepageAdmin.updateBlockContent);
  const updateBlockLayoutMut = useMutation(api.homepageAdmin.updateBlockLayout);
  const toggleVisibility = useMutation(api.homepageAdmin.toggleBlockVisibility);
  const duplicateBlock = useMutation(api.homepageAdmin.duplicateBlock);

  const handlePublish = async () => {
    if (!selectedExpId) return;
    try {
      await publishExp({ experienceId: selectedExpId as any });
      toast.success("Experience published successfully!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDuplicateExp = async () => {
    if (!selectedExp) return;
    const newName = prompt("Enter new experience name:", `${selectedExp.name} Copy`);
    if (!newName) return;
    const newSlug = newName.toLowerCase().replace(/\s+/g, "-");
    try {
      const newId = await duplicateExp({ id: selectedExp._id, newName, newSlug });
      setSelectedExpId(newId);
      toast.success("Experience duplicated successfully!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddBlock = async (schema: BlockSchema) => {
    if (!selectedExpId) return;
    try {
      await addBlock({
        experienceId: selectedExpId as any,
        blockKey: `${schema.id}_${Date.now()}`,
        blockType: schema.id,
        title: schema.defaultConfig.title,
        renderer: schema.defaultConfig.renderer as any,
        config: schema.defaultConfig.config,
        sortOrder: blocks.length + 1,
      });
      setShowBlockLibrary(false);
      toast.success(`${schema.name} added!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDuplicateBlock = async (blockId: string) => {
    try {
      await duplicateBlock({ id: blockId as Id<"experienceBlocks"> });
      toast.success("Block duplicated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleVisibility = async (blockId: string, currentStatus: string) => {
    try {
      const isHidden = currentStatus !== "archived"; // if it's draft it becomes archived (hidden)
      await toggleVisibility({ id: blockId as Id<"experienceBlocks">, isHidden });
      toast.success(isHidden ? "Block hidden" : "Block visible");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Up/Down Reordering Handlers
  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[idx - 1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx - 1]];
    setBlocks(newBlocks);
    const layoutUpdates = newBlocks.map((b, i) => ({ id: b._id, sortOrder: i + 1 }));
    await updateLayout({ blocks: layoutUpdates });
  };

  const handleMoveDown = async (idx: number) => {
    if (idx === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
    setBlocks(newBlocks);
    const layoutUpdates = newBlocks.map((b, i) => ({ id: b._id, sortOrder: i + 1 }));
    await updateLayout({ blocks: layoutUpdates });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300 relative">
      
      {/* ── Left Sidebar: Experiences ── */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Experiences ({experiences?.length || 0})
          </h2>
        </div>

        <div className="space-y-2">
          {experiences?.map((exp: any) => (
            <div
              key={exp._id}
              onClick={() => setSelectedExpId(exp._id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedExpId === exp._id
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md"
                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300"
              }`}
            >
              <div>
                <h3 className="text-sm font-bold truncate">{exp.name}</h3>
                <p className={`text-[10px] ${selectedExpId === exp._id ? "text-slate-800" : "text-slate-400"}`}>
                  /{exp.slug}
                </p>
              </div>
              {exp.status === "published" && (
                <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-bold text-[10px] uppercase">
                  Live
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Content: Studio Workspace ── */}
      <div className="lg:col-span-9 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
        {selectedExp ? (
          <>
            <div className="border-b border-slate-100 dark:border-zinc-800">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
                    {selectedExp.name}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowBlockLibrary(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer">
                    <Plus className="w-4 h-4"/> Add Block
                  </button>
                  <button onClick={handlePublish} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition active:scale-95 cursor-pointer">
                    Publish
                  </button>
                </div>
              </div>

              <div className="flex items-center px-5 gap-6">
                {[
                  { id: "blocks", label: "Blocks", icon: Layout },
                  { id: "settings", label: "Settings", icon: Settings },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "border-amber-500 text-slate-900 dark:text-white"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-zinc-950/50 min-h-[500px]">
              
              {activeTab === "blocks" && (
                <div className="max-w-3xl mx-auto space-y-4">
                  {blocks.map((block, idx) => {
                    const schema = BLOCK_REGISTRY.find(s => s.id === block.blockType) || BLOCK_REGISTRY[0];
                    const isHidden = block.status === "archived";

                    return (
                      <div key={block._id} className={`bg-white dark:bg-zinc-900 rounded-2xl border ${isHidden ? "border-dashed border-slate-300 opacity-60" : "border-slate-200"} dark:border-zinc-800 shadow-xs hover:border-slate-300 transition-all overflow-hidden`}>
                        <div className="p-4 flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <button onClick={() => handleMoveUp(idx)} disabled={idx === 0} className={`p-0.5 rounded ${idx === 0 ? "text-slate-200" : "text-slate-400 hover:text-amber-500"} cursor-pointer`}><ChevronUp className="w-4 h-4"/></button>
                            <button onClick={() => handleMoveDown(idx)} disabled={idx === blocks.length - 1} className={`p-0.5 rounded ${idx === blocks.length - 1 ? "text-slate-200" : "text-slate-400 hover:text-amber-500"} cursor-pointer`}><ChevronDown className="w-4 h-4"/></button>
                          </div>
                        
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                                {schema.name}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {block.title || "Untitled Block"}
                              </h4>
                              {isHidden && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">HIDDEN</span>}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                              Renderer: {block.renderer || "Default"} 
                              {block.config?.collectionId && " • Attached Collection"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button onClick={() => setExpandedBlockId(expandedBlockId === block._id ? null : block._id)} className="p-2 text-slate-400 hover:text-amber-500 bg-slate-50 dark:bg-zinc-800 rounded-xl transition cursor-pointer" title="Configure"><Settings className="w-4 h-4" /></button>
                            <button onClick={() => handleDuplicateBlock(block._id)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-zinc-800 rounded-xl transition cursor-pointer" title="Duplicate"><Copy className="w-4 h-4" /></button>
                            <button onClick={() => handleToggleVisibility(block._id, block.status)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 dark:bg-zinc-800 rounded-xl transition cursor-pointer" title={isHidden ? "Show" : "Hide"}>
                              {isHidden ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                            </button>
                            <button onClick={() => removeBlock({ id: block._id })} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-zinc-800 rounded-xl transition cursor-pointer" title="Remove"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {/* Schema-Driven Config Drawer */}
                        {expandedBlockId === block._id && (
                          <div className="bg-slate-50 dark:bg-zinc-950 p-5 border-t border-slate-100 dark:border-zinc-800">
                            <BlockConfigEditor 
                              block={block} 
                              schema={schema} 
                              collections={collections} 
                              campaigns={campaigns} 
                              categories={categories}
                              onSave={async (updates: any) => {
                                await updateBlockContent({
                                  id: block._id,
                                  title: updates.title,
                                  subtitle: updates.subtitle,
                                  config: updates.config,
                                });
                                if (updates.renderer) {
                                  await updateBlockLayoutMut({ id: block._id, renderer: updates.renderer });
                                }
                                toast.success("Configuration saved");
                              }}
                              onClose={() => setExpandedBlockId(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {blocks.length === 0 && (
                    <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      No blocks added yet. Click "Add Block" to open the library.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && selectedExp && (
                <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Experience Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                      <input 
                        type="text" 
                        defaultValue={selectedExp.name}
                        onBlur={(e) => updateExp({ id: selectedExp._id, name: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Slug</label>
                      <input 
                        type="text" 
                        defaultValue={selectedExp.slug}
                        onBlur={(e) => updateExp({ id: selectedExp._id, slug: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-mono text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SEO Title</label>
                      <input 
                        type="text" 
                        defaultValue={selectedExp.seoTitle || ""}
                        onBlur={(e) => updateExp({ id: selectedExp._id, seoTitle: e.target.value })}
                        placeholder="e.g. Premium Tailoring | Hive by TailorBee"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SEO Description</label>
                      <textarea 
                        defaultValue={selectedExp.seoDescription || ""}
                        onBlur={(e) => updateExp({ id: selectedExp._id, seoDescription: e.target.value })}
                        placeholder="e.g. Discover our curated collection..."
                        rows={3}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
            <Sparkles className="w-10 h-10 text-amber-500/50 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Experience Studio</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">Select an experience to manage.</p>
          </div>
        )}
      </div>

      {/* ── Block Library Modal ── */}
      {showBlockLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 flex items-center justify-between border-b">
              <h2 className="text-lg font-bold">Block Library</h2>
              <button onClick={() => setShowBlockLibrary(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 overflow-y-auto">
              {["Marketing", "Collections", "Commerce"].map(category => (
                <div key={category} className="mb-8">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {BLOCK_REGISTRY.filter(b => b.category === category).map(block => (
                      <div key={block.id} onClick={() => handleAddBlock(block)} className="p-4 border rounded-2xl hover:border-amber-500 hover:shadow-md cursor-pointer transition group">
                        <block.icon className="w-6 h-6 text-slate-400 group-hover:text-amber-500 mb-3" />
                        <h4 className="font-bold text-sm">{block.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{block.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA EDITOR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function BlockConfigEditor({ block, schema, collections, campaigns, categories, onSave, onClose }: any) {
  const generateUploadUrl = useAction(api.media.api.generateUploadUrl);
  const commitUpload = useAction(api.media.api.commitUpload);
  const [uploading, setUploading] = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: block.title || "",
    subtitle: block.subtitle || "",
    renderer: block.renderer || schema.defaultConfig?.renderer,
    config: { ...(schema.defaultConfig?.config || {}), ...block.config }
  });

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const { presignedUrl, sessionId } = await generateUploadUrl({
        mimeType: file.type,
        fileSize: file.size,
        ownerType: "admin",
        ownerId: "experience_banners",
        context: "banner_image",
      });
      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const finalizedAsset = await commitUpload({ sessionId });
      updateConfig(key, finalizedAsset);
      toast.success("Banner image uploaded successfully!");
    } catch (err) {
      console.error("Banner upload failed:", err);
      toast.error("Failed to upload banner image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => onSave(formData);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dynamic Fields */}
        <div className="space-y-4">
          {schema.fields.includes("title") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Title</label>
              <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
          )}
          {schema.fields.includes("subtitle") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Subtitle</label>
              <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} />
            </div>
          )}
          {schema.fields.includes("bannerUpload") && (
            <div className="space-y-4 border-t border-b border-slate-100 py-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Desktop Banner Image (Landscape)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={desktopInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload(e, "desktopImage")}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => desktopInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Choose Desktop Image
                  </button>
                </div>
                {formData.config.desktopImage && (
                  <div className="mt-2 relative aspect-[16/6] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[140px]">
                    <img
                      src={
                        typeof formData.config.desktopImage === "string" 
                          ? formData.config.desktopImage.replace("https://cdn.hivenow.in/cdn-cgi/image/format=auto/banner_images/", "https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/banner_images/") 
                          : (formData.config.desktopImage?.objectKey 
                              ? `https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/${formData.config.desktopImage.objectKey}` 
                              : "")
                      }
                      alt="Desktop Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobile Banner Image (Compact)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload(e, "mobileImage")}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => mobileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Choose Mobile Image
                  </button>
                </div>
                {formData.config.mobileImage && (
                  <div className="mt-2 relative aspect-[2/1] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[120px]">
                    <img
                      src={
                        typeof formData.config.mobileImage === "string" 
                          ? formData.config.mobileImage.replace("https://cdn.hivenow.in/cdn-cgi/image/format=auto/banner_images/", "https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/banner_images/") 
                          : (formData.config.mobileImage?.objectKey 
                              ? `https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/${formData.config.mobileImage.objectKey}` 
                              : "")
                      }
                      alt="Mobile Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {schema.fields.includes("targetUrl") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Click Link (Optional)</label>
              <input
                list="target-urls"
                type="text"
                placeholder="e.g. /collections/fresh-on-hive or /category/sarees"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                value={formData.config.targetUrl || ""}
                onChange={e => updateConfig("targetUrl", e.target.value)}
              />
              <datalist id="target-urls">
                {categories && categories.map((c: any) => (
                  <option key={`cat-${c._id}`} value={`/category/${c.slug}`}>Category: {c.name}</option>
                ))}
                {collections && collections.map((c: any) => (
                  <option key={`col-${c._id}`} value={`/collections/${c.slug}`}>Collection: {c.name}</option>
                ))}
                <option value="/collections">All Collections</option>
              </datalist>
            </div>
          )}
          {schema.fields.includes("renderer") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Renderer (Layout)</label>
              <select className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" value={formData.renderer} onChange={e => setFormData({...formData, renderer: e.target.value})}>
                <option value="productCarousel">Product Carousel (Horizontal Scroll)</option>
                <option value="twoColumnGrid">2-Column Product Grid</option>
                <option value="largeCards">Large Cards</option>
                <option value="moodGrid">Mood Grid</option>
                <option value="occasionGrid">Category / Occasion Grid</option>
                <option value="editorialGrid">Editorial Grid</option>
              </select>
            </div>
          )}
          {schema.fields.includes("maxProducts") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Max Items to Display</label>
              <input type="number" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" value={formData.config.maxProducts} onChange={e => updateConfig("maxProducts", parseInt(e.target.value))} />
            </div>
          )}
          {schema.fields.includes("showSeeAll") && (
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id={`seeall-${block._id}`} checked={formData.config.showSeeAll} onChange={e => updateConfig("showSeeAll", e.target.checked)} />
              <label htmlFor={`seeall-${block._id}`} className="text-sm font-semibold">Show "See All" Link</label>
            </div>
          )}
        </div>

        {/* Picker Column */}
        <div>
          {schema.fields.includes("collectionId") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2">Assign Collection</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {collections?.map((col: any) => (
                  <div 
                    key={col._id} 
                    onClick={() => updateConfig("collectionId", col._id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${formData.config.collectionId === col._id ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-amber-300"}`}
                  >
                    <div>
                      <h5 className="text-sm font-bold">{col.title}</h5>
                      <p className="text-[10px] text-slate-500">{col.productCount} products • {col.status}</p>
                    </div>
                    {formData.config.collectionId === col._id && <div className="w-3 h-3 rounded-full bg-amber-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {schema.fields.includes("campaignId") && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-2">Assign Campaign/Banner</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {campaigns?.map((camp: any) => (
                  <div 
                    key={camp._id} 
                    onClick={() => updateConfig("campaignId", camp._id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${formData.config.campaignId === camp._id ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-amber-300"}`}
                  >
                    <div>
                      <h5 className="text-sm font-bold">{camp.title}</h5>
                    </div>
                    {formData.config.campaignId === camp._id && <div className="w-3 h-3 rounded-full bg-amber-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
        <button onClick={handleSave} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm">Save Configuration</button>
      </div>
    </div>
  );
}
