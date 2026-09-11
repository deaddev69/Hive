"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button, PartnerShowcaseCard, ShowcaseBrandData, cn } from "@hive/ui";
import {
  Sparkles,
  MoveUp,
  MoveDown,
  Trash2,
  Plus,
  RotateCcw,
  EyeOff,
  Save,
  Search,
  Check,
  AlertCircle,
  Store,
  Layers,
  Info,
} from "lucide-react";

export function PartnerShowcaseManager() {
  const showcaseData = useQuery(api.about.getAdminPartnerShowcase);
  const updateShowcase = useMutation(api.about.updatePartnerShowcase);

  // Local state for curated ID list
  // null = unconfigured fallback (State 1)
  // [] = intentionally empty (State 2)
  // [id1, ...] = curated list (State 3)
  const [localSelectedIds, setLocalSelectedIds] = useState<string[] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Synchronize initial data from backend once
  useEffect(() => {
    if (showcaseData && !isInitialized) {
      setLocalSelectedIds(showcaseData.selectedIds);
      setIsInitialized(true);
    }
  }, [showcaseData, isInitialized]);

  // Lookup map for fast brand retrieval
  const allBrandsMap = useMemo(() => {
    const map = new Map<string, ShowcaseBrandData>();
    if (showcaseData?.allBrands) {
      for (const brand of showcaseData.allBrands) {
        map.set(brand._id, brand);
      }
    }
    return map;
  }, [showcaseData?.allBrands]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!showcaseData || !isInitialized) return false;
    const serverIds = showcaseData.selectedIds;
    if (localSelectedIds === null && serverIds === null) return false;
    if (localSelectedIds === null || serverIds === null) return true;
    if (localSelectedIds.length !== serverIds.length) return true;
    return localSelectedIds.some((id, idx) => id !== serverIds[idx]);
  }, [showcaseData, isInitialized, localSelectedIds]);

  // Selected brands in order
  const selectedBrands = useMemo(() => {
    if (!localSelectedIds) return [];
    return localSelectedIds
      .map((id) => allBrandsMap.get(id))
      .filter((b): b is ShowcaseBrandData => Boolean(b));
  }, [localSelectedIds, allBrandsMap]);

  // Available brands to add (approved brands not already selected)
  const availableBrands = useMemo(() => {
    if (!showcaseData?.allBrands) return [];
    const selectedSet = new Set(localSelectedIds || []);
    return showcaseData.allBrands.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.area && b.area.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase()));
      return !selectedSet.has(b._id) && matchesSearch;
    });
  }, [showcaseData?.allBrands, localSelectedIds, searchQuery]);

  // Actions
  const handleAddBrand = (brandId: string) => {
    setLocalSelectedIds((prev) => (prev ? [...prev, brandId] : [brandId]));
  };

  const handleRemoveBrand = (brandId: string) => {
    setLocalSelectedIds((prev) => (prev ? prev.filter((id) => id !== brandId) : []));
  };

  const handleMoveUp = (index: number) => {
    if (!localSelectedIds || index <= 0) return;
    const itemA = localSelectedIds[index];
    const itemB = localSelectedIds[index - 1];
    if (!itemA || !itemB) return;
    const updated = [...localSelectedIds];
    updated[index] = itemB;
    updated[index - 1] = itemA;
    setLocalSelectedIds(updated);
  };

  const handleMoveDown = (index: number) => {
    if (!localSelectedIds || index >= localSelectedIds.length - 1) return;
    const itemA = localSelectedIds[index];
    const itemB = localSelectedIds[index + 1];
    if (!itemA || !itemB) return;
    const updated = [...localSelectedIds];
    updated[index] = itemB;
    updated[index + 1] = itemA;
    setLocalSelectedIds(updated);
  };

  const handleResetToFallback = () => {
    setLocalSelectedIds(null);
  };

  const handleClearAll = () => {
    setLocalSelectedIds([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateShowcase({
        boutiqueIds: localSelectedIds === null ? undefined : (localSelectedIds as any),
      });
      setFeedback({
        type: "success",
        message: res.isFallback
          ? "Reset to automatic fallback (top active brands)."
          : `Saved ${res.count} curated brands successfully.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save showcase configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!showcaseData) {
    return (
      <div className="w-full py-16 bg-white border border-hive-border rounded-3xl flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-hive-amber/40 border-t-hive-amber animate-spin" />
        <span className="text-xs font-semibold text-hive-text-muted">Loading showcase configuration...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left">
      {/* ── 1. TOP CONTROL BAR ── */}
      <div className="bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-serif font-bold text-hive-dark">
              About Page Brand Showcase
            </h2>
            {localSelectedIds === null ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-wider">
                Automatic Fallback Mode
              </span>
            ) : localSelectedIds.length === 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[11px] font-bold uppercase tracking-wider">
                Hidden / Intentionally Empty
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase tracking-wider">
                Curated ({localSelectedIds.length} Selected)
              </span>
            )}
          </div>
          <p className="text-xs text-hive-text-muted leading-relaxed max-w-2xl">
            Control which partner brands appear in the marquee on <code className="text-xs font-mono bg-stone-100 px-1 py-0.5 rounded">/about</code>. Reorder sequence, add or remove brands, or reset to automatic fallback.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToFallback}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-stone-200 text-stone-700 hover:bg-stone-50"
            title="Revert to automatic top-approved brands"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Fallback</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-stone-200 text-stone-700 hover:bg-stone-50"
            title="Explicitly hide showcase on About page"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Hide Showcase</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all",
              hasUnsavedChanges
                ? "bg-hive-dark text-hive-cream hover:bg-black"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{hasUnsavedChanges ? "Save Changes" : "Saved"}</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={cn(
            "p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border",
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          )}
        >
          {feedback.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── 2. LIVE PREVIEW STRIP ── */}
      <div className="bg-neutral-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-serif font-bold tracking-wide uppercase text-white">
              Customer Live Preview (Shared PartnerShowcaseCard)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            {localSelectedIds === null
              ? "Showing Fallback Preview"
              : localSelectedIds.length === 0
              ? "Showcase Suppressed"
              : `${selectedBrands.length} Cards in Sequence`}
          </span>
        </div>

        {localSelectedIds === null ? (
          <div className="p-8 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
            <Info className="w-5 h-5 text-amber-400" />
            <p className="font-semibold text-stone-200">
              Automatic Fallback Mode is currently selected.
            </p>
            <p className="max-w-md">
              The public About page will dynamically query and display up to 12 top approved active partner brands sorted deterministically by creation time.
            </p>
          </div>
        ) : localSelectedIds.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
            <EyeOff className="w-5 h-5 text-stone-500" />
            <p className="font-semibold text-stone-300">
              Showcase is intentionally empty.
            </p>
            <p className="max-w-md">
              The Partner Brand marquee section will be completely omitted from the customer About page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 pt-1 flex items-center gap-5 scrollbar-thin scrollbar-thumb-stone-700">
            {selectedBrands.map((brand, idx) => (
              <div key={brand._id} className="shrink-0 flex flex-col items-center gap-2">
                <PartnerShowcaseCard
                  brand={brand}
                  className="w-56"
                  action={
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 font-mono font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. CURATION & REORDERING MANAGEMENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Curated Sequence (Reorder & Remove) */}
        <div className="lg:col-span-6 bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-hive-border/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-hive-dark" />
              <h3 className="text-base font-serif font-bold text-hive-dark">
                Curated Sequence ({selectedBrands.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-hive-text-muted">
              Use arrows to arrange display order
            </span>
          </div>

          {localSelectedIds === null ? (
            <div className="py-12 px-6 text-center text-hive-text-muted space-y-2 bg-hive-cream/20 rounded-2xl border border-dashed border-hive-border">
              <p className="text-sm font-semibold text-hive-dark">
                Showcase is currently in Automatic Fallback.
              </p>
              <p className="text-xs">
                To create a custom sequence, add any brand from the list on the right.
              </p>
            </div>
          ) : selectedBrands.length === 0 ? (
            <div className="py-12 px-6 text-center text-hive-text-muted space-y-2 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <p className="text-sm font-semibold text-stone-700">No brands selected.</p>
              <p className="text-xs">
                Click &ldquo;+ Add to Showcase&rdquo; on any approved brand from the right to build your showcase.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
              {selectedBrands.map((brand, index) => (
                <div
                  key={brand._id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-hive-cream/20 border border-hive-border/60 hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-hive-dark text-hive-cream text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    {brand.visualUrl || brand.logoUrl ? (
                      <img
                        src={brand.visualUrl || brand.logoUrl}
                        alt={brand.name}
                        className="w-10 h-10 rounded-xl object-cover border border-hive-border shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-700 shrink-0">
                        {brand.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-hive-dark truncate">{brand.name}</p>
                      <p className="text-[10.5px] text-hive-text-muted truncate">
                        {brand.category} • {brand.area || brand.city}
                      </p>
                    </div>
                  </div>

                  {/* Ordering & Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className={cn(
                        "p-1.5 rounded-lg border text-stone-600 transition-colors",
                        index === 0
                          ? "opacity-30 cursor-not-allowed border-transparent"
                          : "hover:bg-hive-cream border-stone-200 active:scale-95"
                      )}
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === selectedBrands.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className={cn(
                        "p-1.5 rounded-lg border text-stone-600 transition-colors",
                        index === selectedBrands.length - 1
                          ? "opacity-30 cursor-not-allowed border-transparent"
                          : "hover:bg-hive-cream border-stone-200 active:scale-95"
                      )}
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveBrand(brand._id)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors ml-1 active:scale-95"
                      title="Remove from Showcase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Available Approved Brands */}
        <div className="lg:col-span-6 bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-hive-border/60">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-hive-dark" />
              <h3 className="text-base font-serif font-bold text-hive-dark">
                Approved Partner Brands ({availableBrands.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-hive-text-muted">
              Click &ldquo;+ Add&rdquo; to insert
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-hive-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by brand name, category, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-hive-border/80 focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-hive-cream/10"
            />
          </div>

          {/* Available List */}
          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
            {availableBrands.length === 0 ? (
              <div className="py-10 text-center text-hive-text-muted text-xs">
                {searchQuery
                  ? "No matching approved partner brands found."
                  : "All approved brands are currently selected in the showcase."}
              </div>
            ) : (
              availableBrands.map((brand) => (
                <div
                  key={brand._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-hive-border/50 hover:border-hive-amber/60 hover:bg-hive-cream/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {brand.visualUrl || brand.logoUrl ? (
                      <img
                        src={brand.visualUrl || brand.logoUrl}
                        alt={brand.name}
                        className="w-9 h-9 rounded-xl object-cover border border-hive-border shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0">
                        {brand.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-hive-dark truncate">{brand.name}</p>
                      <p className="text-[10px] text-hive-text-muted truncate">
                        {brand.category} • {brand.area || brand.city}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddBrand(brand._id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border-stone-200 text-hive-dark hover:bg-stone-100 shrink-0"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Add</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
