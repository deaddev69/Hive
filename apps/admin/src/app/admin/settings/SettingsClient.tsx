"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, RefreshCw, Pencil } from "lucide-react";
import { Card, CardContent } from "@hive/ui";

type Slab = { min_price: number; max_price: number | null; rate: number };
type TierConfig = { name: string; slabs: Slab[] };

const DEFAULT_TIER_SLABS: Slab[] = [
  { min_price: 0, max_price: 499, rate: 8 },
  { min_price: 500, max_price: 999, rate: 8 },
  { min_price: 1000, max_price: 1499, rate: 8 },
  { min_price: 1500, max_price: 2499, rate: 8 },
  { min_price: 2500, max_price: 4999, rate: 8 },
  { min_price: 5000, max_price: null, rate: 5 },
];

const DEFAULT_TIERS: Record<string, TierConfig> = {
  tier1: { name: "Bronze", slabs: [...DEFAULT_TIER_SLABS] },
  tier2: { name: "Silver", slabs: [...DEFAULT_TIER_SLABS] },
  tier3: { name: "Gold", slabs: [...DEFAULT_TIER_SLABS] },
};

const TIER_KEYS = ["tier1", "tier2", "tier3"] as const;

export default function SettingsClient() {
  const liveSettings = useQuery(api.adminSettings.getPlatformSettings);
  const updateSettingsMutation = useMutation(api.adminSettings.updatePlatformSettings);
  const recalculatePricesMutation = useMutation(api.adminSettings.recalculateAllProductPrices);

  const [markupRate, setMarkupRate] = useState<string>("");
  const [platformFeeRate, setPlatformFeeRate] = useState<string>("");
  const [markupType, setMarkupType] = useState<"flat" | "tiered">("tiered");
  const [markupTiers, setMarkupTiers] = useState<Slab[]>([]);
  const [tierConfigs, setTierConfigs] = useState<Record<string, TierConfig>>({ ...DEFAULT_TIERS });
  const [activeTab, setActiveTab] = useState<string>("tier1");
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync initial values from live query
  useEffect(() => {
    if (liveSettings && !isInitialized) {
      setMarkupRate(((liveSettings.markupRate ?? 0.15) * 100).toString());
      setPlatformFeeRate(((liveSettings.platformFeeRate ?? 0.02) * 100).toString());
      setMarkupType(liveSettings.markupType ?? "tiered");
      const sortedTiers = liveSettings.markupTiers
        ? [...liveSettings.markupTiers].sort((a, b) => a.min_price - b.min_price)
        : [];
      setMarkupTiers(sortedTiers);

      // Load tier configs from DB or use defaults
      const loadedTiers: Record<string, TierConfig> = {};
      for (const key of TIER_KEYS) {
        const dbTier = (liveSettings as any)[key];
        if (dbTier && dbTier.name && Array.isArray(dbTier.slabs)) {
          loadedTiers[key] = {
            name: dbTier.name,
            slabs: [...dbTier.slabs].sort((a: Slab, b: Slab) => a.min_price - b.min_price),
          };
        } else {
          loadedTiers[key] = { ...DEFAULT_TIERS[key], slabs: [...DEFAULT_TIERS[key].slabs] };
        }
      }
      setTierConfigs(loadedTiers);
      setIsInitialized(true);
    }
  }, [liveSettings, isInitialized]);

  if (liveSettings === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
      </div>
    );
  }

  // --- Tier slab helpers ---
  const addSlabToTier = (tierKey: string) => {
    setTierConfigs((prev) => {
      const tier = prev[tierKey];
      if (!tier) return prev;
      const updated = [...tier.slabs];
      if (updated.length === 0) {
        return { ...prev, [tierKey]: { ...tier, slabs: [{ min_price: 0, max_price: null, rate: 10 }] } };
      }
      const last = updated[updated.length - 1];
      if (!last) return prev;
      const lastMax = (last.min_price || 0) + 999;
      last.max_price = lastMax;
      updated.push({ min_price: lastMax + 1, max_price: null, rate: 10 });
      return { ...prev, [tierKey]: { ...tier, slabs: updated } };
    });
  };

  const deleteSlabFromTier = (tierKey: string, index: number) => {
    setTierConfigs((prev) => {
      const tier = prev[tierKey];
      if (!tier) return prev;
      if (tier.slabs.length <= 1) {
        toast.error("You must have at least one markup slab.");
        return prev;
      }
      const updated = tier.slabs.filter((_, idx) => idx !== index);
      const first = updated[0];
      if (first) first.min_price = 0;
      for (let i = 1; i < updated.length; i++) {
        const prevSlab = updated[i - 1];
        const currSlab = updated[i];
        if (prevSlab && currSlab) {
          if (prevSlab.max_price === null) prevSlab.max_price = prevSlab.min_price + 999;
          currSlab.min_price = prevSlab.max_price + 1;
        }
      }
      const last = updated[updated.length - 1];
      if (last) last.max_price = null;
      return { ...prev, [tierKey]: { ...tier, slabs: updated } };
    });
  };

  const updateSlabField = (tierKey: string, index: number, field: "max_price" | "rate", value: string) => {
    setTierConfigs((prev) => {
      const tier = prev[tierKey];
      if (!tier) return prev;
      const updated = tier.slabs.map((s, idx) => {
        if (idx === index) {
          if (field === "max_price") {
            if (value === "") return { ...s, max_price: null };
            const parsed = parseInt(value);
            return { ...s, max_price: isNaN(parsed) ? null : parsed };
          } else {
            if (value === "") return { ...s, rate: 0 };
            const parsed = parseFloat(value);
            return { ...s, rate: isNaN(parsed) ? 0 : parsed };
          }
        }
        return s;
      });
      if (field === "max_price") {
        for (let i = 1; i < updated.length; i++) {
          const prevSlab = updated[i - 1];
          const currSlab = updated[i];
          if (prevSlab && currSlab && prevSlab.max_price !== null) {
            currSlab.min_price = prevSlab.max_price + 1;
          }
        }
      }
      return { ...prev, [tierKey]: { ...tier, slabs: updated } };
    });
  };

  const updateTierName = (tierKey: string, name: string) => {
    setTierConfigs((prev) => {
      const tier = prev[tierKey];
      if (!tier) return prev;
      return { ...prev, [tierKey]: { ...tier, name } };
    });
  };

  const validateSlabs = (slabs: Slab[], label: string): string | null => {
    if (slabs.length === 0) return `${label}: Please define at least one slab.`;
    const sorted = [...slabs].sort((a, b) => a.min_price - b.min_price);
    const first = sorted[0];
    if (!first || first.min_price !== 0) return `${label}: The first slab must start at ₹0.`;
    for (let i = 0; i < sorted.length; i++) {
      const slab = sorted[i];
      if (!slab) continue;
      if (slab.min_price < 0 || slab.rate < 0) return `${label} Slab ${i + 1}: Values cannot be negative.`;
      if (slab.max_price !== null && slab.max_price < slab.min_price) {
        return `${label} Slab ${i + 1}: Max Price (₹${slab.max_price}) cannot be less than Min Price (₹${slab.min_price}).`;
      }
      if (i < sorted.length - 1) {
        if (slab.max_price === null) return `${label}: Only the highest slab can have an infinite Max Price.`;
        const nextSlab = sorted[i + 1];
        if (nextSlab && nextSlab.min_price !== slab.max_price + 1) {
          return `${label}: Price ranges must be continuous. Slab ${i + 2}'s Min Price must start at ₹${slab.max_price + 1}.`;
        }
      } else {
        if (slab.max_price !== null) return `${label}: The highest slab must have an infinite Max Price (leave it empty).`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const parsedMarkup = parseFloat(markupRate);
      const parsedFee = parseFloat(platformFeeRate);

      if (isNaN(parsedMarkup) || isNaN(parsedFee)) {
        toast.error("Please enter valid numbers for the rates.");
        return;
      }
      if (parsedMarkup < 0 || parsedFee < 0) {
        toast.error("Rates cannot be negative.");
        return;
      }

      // Validate all three tiers
      for (const key of TIER_KEYS) {
        const tc = tierConfigs[key];
        if (!tc) continue;
        if (!tc.name.trim()) {
          toast.error(`Tier ${key.replace("tier", "")} must have a name.`);
          return;
        }
        const error = validateSlabs(tc.slabs, `Tier ${tc.name}`);
        if (error) {
          toast.error(error);
          return;
        }
      }

      // Check for duplicate tier names
      const names = TIER_KEYS.map((k) => tierConfigs[k]?.name?.trim().toLowerCase());
      const uniqueNames = new Set(names);
      if (uniqueNames.size < 3) {
        toast.error("Each tier must have a unique name.");
        return;
      }

      const formattedTiers = markupType === "flat" ? [] : markupTiers.map((t) => ({
        min_price: t.min_price,
        max_price: t.max_price,
        rate: t.rate,
      }));

      let updatedProductsCount = 0;

      try {
        const result = await updateSettingsMutation({
          markupRate: parsedMarkup / 100,
          platformFeeRate: parsedFee / 100,
          markupType,
          markupTiers: formattedTiers,
          tier1: tierConfigs.tier1 ? { name: tierConfigs.tier1.name, slabs: tierConfigs.tier1.slabs } : undefined,
          tier2: tierConfigs.tier2 ? { name: tierConfigs.tier2.name, slabs: tierConfigs.tier2.slabs } : undefined,
          tier3: tierConfigs.tier3 ? { name: tierConfigs.tier3.name, slabs: tierConfigs.tier3.slabs } : undefined,
        });
        updatedProductsCount = result?.updatedProductsCount ?? 0;
      } catch (mutationErr: any) {
        console.warn("Direct mutation error, attempting fallback REST API...", mutationErr);
        const res = await fetch("/api/admin/platform-config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markupRate: parsedMarkup,
            platformFeeRate: parsedFee,
            markupType,
            markupTiers: formattedTiers,
            tier1: tierConfigs.tier1,
            tier2: tierConfigs.tier2,
            tier3: tierConfigs.tier3,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update platform settings.");
        }
        const data = await res.json();
        updatedProductsCount = data.updatedProductsCount ?? 0;
      }

      toast.success(
        updatedProductsCount > 0
          ? `Platform settings saved! Automatically recalculated prices for ${updatedProductsCount} products.`
          : "Platform settings updated successfully!"
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update platform settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualRecalculate = async () => {
    try {
      setIsRecalculating(true);
      const res = await recalculatePricesMutation();
      toast.success(`Successfully recalculated prices for ${res?.updatedProductsCount ?? 0} products!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to recalculate product prices.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const renderSlabTable = (tierKey: string) => {
    const tc = tierConfigs[tierKey];
    if (!tc) return null;
    return (
      <div className="space-y-3">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Min Price (₹)</th>
                <th className="py-2.5 px-4">Max Price (₹)</th>
                <th className="py-2.5 px-4">Markup Rate (%)</th>
                <th className="py-2.5 px-4 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tc.slabs.map((slab, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-medium text-slate-700">
                    ₹{slab.min_price}
                  </td>
                  <td className="py-3 px-4">
                    {idx === tc.slabs.length - 1 ? (
                      <span className="text-slate-400 italic text-[11px]">
                        Infinite (and above)
                      </span>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min={slab.min_price}
                          value={slab.max_price ?? ""}
                          onChange={(e) => updateSlabField(tierKey, idx, "max_price", e.target.value)}
                          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-3 text-[13px] font-mono font-medium focus:ring-1 focus:ring-hive-gold outline-none"
                          placeholder="e.g. 499"
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={slab.rate}
                        onChange={(e) => updateSlabField(tierKey, idx, "rate", e.target.value)}
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-mono font-medium focus:ring-1 focus:ring-hive-gold outline-none"
                        placeholder="18"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => deleteSlabFromTier(tierKey, idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50/50 transition-colors"
                      aria-label="Delete slab"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => addSlabToTier(tierKey)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Slab
        </button>
      </div>
    );
  };

  return (
    <Card className="max-w-3xl border-hive-border rounded-2xl shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="space-y-6">
          {/* Platform Processing Fee Rate — UNCHANGED */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-slate-600">
              Platform Processing Fee (%)
            </label>
            <p className="text-[11px] text-slate-500 mb-1">
              The percentage deducted from the boutique's Base Price during payout generation. (e.g. 2 for 2%)
            </p>
            <div className="relative">
              <input
                type="number"
                value={platformFeeRate}
                onChange={(e) => setPlatformFeeRate(e.target.value)}
                step="0.1"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-hive-gold/20 focus:border-hive-gold outline-none transition-all"
                placeholder="2"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
            </div>
          </div>

          {/* Fallback Flat Markup Rate — Hidden input (kept for backward compat) */}
          <input type="hidden" value={markupRate} />

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PRICING TIERS — 3-Tier Configuration                           */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800">
                Pricing Tiers
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Each seller is assigned to one pricing tier. Each tier has independently configurable markup price slabs.
              </p>
            </div>

            {/* Tab Selector */}
            <div className="grid grid-cols-3 gap-2">
              {TIER_KEYS.map((key) => {
                const tc = tierConfigs[key];
                const label = tc?.name || key.replace("tier", "Tier ");
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`h-11 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                      isActive
                        ? "bg-hive-dark text-hive-gold border-hive-dark shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Active Tier Configuration */}
            {TIER_KEYS.map((key) => {
              if (activeTab !== key) return null;
              const tc = tierConfigs[key];
              if (!tc) return null;
              return (
                <div key={key} className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Tier Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-600">
                      Tier Display Name
                    </label>
                    <div className="relative">
                      <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={tc.name}
                        onChange={(e) => updateTierName(key, e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-sm font-medium focus:ring-2 focus:ring-hive-gold/20 focus:border-hive-gold outline-none transition-all"
                        placeholder={`e.g. ${DEFAULT_TIERS[key]?.name}`}
                      />
                    </div>
                  </div>

                  {/* Slab Table */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">
                      Commission Markup Slabs — {tc.name}
                    </h4>
                    {renderSlabTable(key)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleManualRecalculate}
            disabled={isRecalculating || isSaving}
            className="w-full sm:w-auto h-11 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin text-hive-amber" /> : <RefreshCw className="w-4 h-4" />}
            Sync & Recalculate All Prices
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isRecalculating}
            className="w-full sm:w-auto h-11 px-6 bg-hive-dark text-hive-gold rounded-xl text-xs font-extrabold uppercase tracking-widest hover:bg-hive-dark/95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
