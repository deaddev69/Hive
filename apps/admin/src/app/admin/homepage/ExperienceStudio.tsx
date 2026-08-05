"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatCurrency, toast } from "@hive/utils";
import {
  Sparkles, Plus, Trash2, Settings, Smartphone, Layout, Tag, Copy, Upload, Edit, GripVertical, CheckCircle2, ChevronRight, Share, X
} from "lucide-react";

export function ExperienceStudio() {
  const experiences = useQuery(api.homepageAdmin.getExperiences);
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blocks" | "seo" | "settings" | "preview">("blocks");
  
  // Set default selection
  useEffect(() => {
    if (!selectedExpId && experiences && experiences.length > 0) {
      setSelectedExpId(experiences[0]._id);
    }
  }, [experiences, selectedExpId]);

  const selectedExp = experiences?.find((e: any) => e._id === selectedExpId);
  const rawBlocks = useQuery(api.homepageAdmin.getExperienceBlocks, selectedExp ? { experienceId: selectedExp._id, status: "draft" } : "skip");

  // Local state for drag and drop
  const [blocks, setBlocks] = useState<any[]>([]);
  useEffect(() => {
    if (rawBlocks) {
      setBlocks([...rawBlocks].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [rawBlocks]);

  const duplicateExp = useMutation(api.homepageAdmin.duplicateExperience);
  const publishExp = useMutation(api.homepageAdmin.publishExperience);
  const removeBlock = useMutation(api.homepageAdmin.removeBlockFromExperience);
  const addBlock = useMutation(api.homepageAdmin.addBlockToExperience);
  const updateLayout = useMutation(api.homepageAdmin.updateExperienceLayout);

  const handlePublish = async () => {
    if (!selectedExpId) return;
    try {
      await publishExp({ experienceId: selectedExpId as any });
      toast.success("Experience published successfully!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDuplicate = async () => {
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

  const handleAddBlock = async () => {
    if (!selectedExpId) return;
    try {
      await addBlock({
        experienceId: selectedExpId as any,
        blockKey: `block_${Date.now()}`,
        blockType: "collection",
        title: "New Block",
        renderer: "productCarousel",
        sortOrder: blocks.length + 1,
      });
      toast.success("Block added!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    try {
      await removeBlock({ id: blockId as any });
      toast.success("Block removed!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // HTML5 Drag and Drop handlers
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    const newBlocks = [...blocks];
    const draggedItem = newBlocks[draggedIdx];
    newBlocks.splice(draggedIdx, 1);
    newBlocks.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    setBlocks(newBlocks);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    // Save new layout
    const layoutUpdates = blocks.map((b, i) => ({
      id: b._id,
      sortOrder: i + 1,
    }));
    try {
      await updateLayout({ blocks: layoutUpdates });
      toast.success("Layout updated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
      
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

          <button
            className="w-full p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 hover:text-amber-500 hover:border-amber-500 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
            onClick={() => toast.success("Create experience dialog to be implemented")}
          >
            <Plus className="w-4 h-4" /> New Experience
          </button>
        </div>
      </div>

      {/* ── Right Content: Studio Workspace ── */}
      <div className="lg:col-span-9 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
        {selectedExp ? (
          <>
            {/* Header & Tabs */}
            <div className="border-b border-slate-100 dark:border-zinc-800">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
                    {selectedExp.name}
                  </h2>
                  <p className="text-xs text-slate-500">Status: {selectedExp.status.toUpperCase()}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDuplicate}
                    className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Duplicate Experience"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePublish}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Publish
                  </button>
                </div>
              </div>

              <div className="flex items-center px-5 gap-6">
                {[
                  { id: "blocks", label: "Blocks", icon: Layout },
                  { id: "seo", label: "SEO", icon: Tag },
                  { id: "settings", label: "Settings", icon: Settings },
                  { id: "preview", label: "Preview", icon: Smartphone },
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

            {/* Tab Contents */}
            <div className="p-5 bg-slate-50 dark:bg-zinc-950/50 min-h-[500px]">
              
              {/* Blocks Tab */}
              {activeTab === "blocks" && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500">Drag to reorder layout.</p>
                    <button
                      onClick={handleAddBlock}
                      className="text-xs font-bold text-amber-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Block
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {blocks.map((block, idx) => (
                      <div
                        key={block._id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragEnter={() => handleDragEnter(idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                          draggedIdx === idx ? "opacity-50 border-amber-500 shadow-lg scale-[1.02]" : "border-slate-200 dark:border-zinc-800 shadow-xs hover:border-slate-300"
                        }`}
                      >
                        <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-amber-500">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                              {block.blockType}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {block.title || "Untitled Block"}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                            Renderer: {block.renderer || "Default"} 
                            {block.config?.collectionId && " • Attached Collection"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            className="p-2 text-slate-400 hover:text-amber-500 bg-slate-50 dark:bg-zinc-800 rounded-xl transition cursor-pointer"
                            title="Edit Block"
                            onClick={() => toast.success("Block editor to be implemented")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveBlock(block._id)}
                            className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-zinc-800 rounded-xl transition cursor-pointer"
                            title="Remove Block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {blocks.length === 0 && (
                      <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        No blocks added yet. Click "Add Block" to start merchandising.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Tabs Stubs */}
              {activeTab === "seo" && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">SEO Title</label>
                    <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200" defaultValue={selectedExp.seoTitle} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Meta Description</label>
                    <textarea className="w-full p-2.5 rounded-xl border border-slate-200" rows={3} defaultValue={selectedExp.seoDescription}></textarea>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Experience Name</label>
                    <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200" defaultValue={selectedExp.name} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Slug / URL Path</label>
                    <input type="text" className="w-full p-2.5 rounded-xl border border-slate-200" defaultValue={selectedExp.slug} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Theme Configuration</label>
                    <select className="w-full p-2.5 rounded-xl border border-slate-200">
                      <option>Light (Default)</option>
                      <option>Dark Mode</option>
                      <option>Festive Gold</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "preview" && (
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <Smartphone className="w-12 h-12 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Scan to preview on device.</p>
                  <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer">
                    <Share className="w-4 h-4" /> Copy Preview Link
                  </button>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
            <Sparkles className="w-10 h-10 text-amber-500/50 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Experience Studio</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Select an experience from the sidebar to manage its blocks, SEO, and visual presentation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
