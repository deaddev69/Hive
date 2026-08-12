"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@hive/ui";

export default function SettingsClient() {
  const liveSettings = useQuery(api.adminSettings.getPlatformSettings);
  const updateSettingsMutation = useMutation(api.adminSettings.updatePlatformSettings);
  const recalculatePricesMutation = useMutation(api.adminSettings.recalculateAllProductPrices);

  const [markupRate, setMarkupRate] = useState<string>("");
  const [platformFeeRate, setPlatformFeeRate] = useState<string>("");
  const [markupType, setMarkupType] = useState<"flat" | "tiered">("tiered");
  const [markupTiers, setMarkupTiers] = useState<Array<{ min_price: number; max_price: number | null; rate: number }>>([]);
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

  const addTier = () => {
    setMarkupTiers((prev) => {
      const updated = [...prev];
      if (updated.length === 0) {
        return [{ min_price: 0, max_price: null, rate: 10 }];
      }
      const last = updated[updated.length - 1];
      if (!last) return prev;
      const lastMax = (last.min_price || 0) + 999;
      last.max_price = lastMax;
      
      updated.push({
        min_price: lastMax + 1,
        max_price: null,
        rate: 10
      });
      return updated;
    });
  };

  const deleteTier = (index: number) => {
    setMarkupTiers((prev) => {
      if (prev.length <= 1) {
        toast.error("You must have at least one markup tier.");
        return prev;
      }
      const updated = prev.filter((_, idx) => idx !== index);
      
      const first = updated[0];
      if (first) {
        first.min_price = 0;
      }
      for (let i = 1; i < updated.length; i++) {
        const prevTier = updated[i - 1];
        const currTier = updated[i];
        if (prevTier && currTier) {
          if (prevTier.max_price === null) {
            prevTier.max_price = prevTier.min_price + 999;
          }
          currTier.min_price = prevTier.max_price + 1;
        }
      }
      const last = updated[updated.length - 1];
      if (last) {
        last.max_price = null;
      }
      return updated;
    });
  };

  const updateTierField = (index: number, field: "max_price" | "rate", value: string) => {
    setMarkupTiers((prev) => {
      const updated = prev.map((t, idx) => {
        if (idx === index) {
          if (field === "max_price") {
            if (value === "") return { ...t, max_price: null };
            const parsed = parseInt(value);
            return { ...t, max_price: isNaN(parsed) ? null : parsed };
          } else {
            if (value === "") return { ...t, rate: 0 };
            const parsed = parseFloat(value);
            return { ...t, rate: isNaN(parsed) ? 0 : parsed };
          }
        }
        return t;
      });

      if (field === "max_price") {
        for (let i = 1; i < updated.length; i++) {
          const prevTier = updated[i - 1];
          const currTier = updated[i];
          if (prevTier && currTier && prevTier.max_price !== null) {
            currTier.min_price = prevTier.max_price + 1;
          }
        }
      }
      return updated;
    });
  };

  const validateTiers = (tiers: typeof markupTiers): string | null => {
    if (tiers.length === 0) return "Please define at least one tier.";
    
    const sorted = [...tiers].sort((a, b) => a.min_price - b.min_price);
    
    const first = sorted[0];
    if (!first || first.min_price !== 0) {
      return "The first tier must start at ₹0.";
    }
    
    for (let i = 0; i < sorted.length; i++) {
      const tier = sorted[i];
      if (!tier) continue;
      if (tier.min_price < 0 || tier.rate < 0) {
        return `Tier ${i + 1} values cannot be negative.`;
      }
      if (tier.max_price !== null && tier.max_price < tier.min_price) {
        return `Tier ${i + 1}: Max Price (₹${tier.max_price}) cannot be less than Min Price (₹${tier.min_price}).`;
      }
      
      if (i < sorted.length - 1) {
        if (tier.max_price === null) {
          return `Only the highest tier can have an infinite Max Price. Tier ${i + 1} must have a Max Price.`;
        }
        const nextTier = sorted[i + 1];
        if (nextTier && nextTier.min_price !== tier.max_price + 1) {
          return `Price ranges must be continuous. Tier ${i + 2}'s Min Price must start at ₹${tier.max_price + 1}.`;
        }
      } else {
        if (tier.max_price !== null) {
          return "The highest tier must have an infinite Max Price (leave it empty).";
        }
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

      if (markupType === "tiered") {
        const error = validateTiers(markupTiers);
        if (error) {
          toast.error(error);
          return;
        }
      }

      const formattedTiers = markupType === "flat" ? [] : markupTiers.map((t) => ({
        min_price: t.min_price,
        max_price: t.max_price,
        rate: t.rate,
      }));

      let updatedProductsCount = 0;

      try {
        // Direct authenticated mutation via Convex React client
        const result = await updateSettingsMutation({
          markupRate: parsedMarkup / 100,
          platformFeeRate: parsedFee / 100,
          markupType,
          markupTiers: formattedTiers,
        });
        updatedProductsCount = result?.updatedProductsCount ?? 0;
      } catch (mutationErr: any) {
        console.warn("Direct mutation error, attempting fallback REST API...", mutationErr);
        // Fallback to REST API route
        const res = await fetch("/api/admin/platform-config", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            markupRate: parsedMarkup,
            platformFeeRate: parsedFee,
            markupType,
            markupTiers: formattedTiers,
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

  return (
    <Card className="max-w-3xl border-hive-border rounded-2xl shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="space-y-6">
          {/* Mode Switch Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-slate-600">
              Platform Markup Type
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => setMarkupType("flat")}
                className={`h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  markupType === "flat"
                    ? "bg-hive-dark text-hive-gold border-hive-dark shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Flat Rate (%)
              </button>
              <button
                type="button"
                onClick={() => setMarkupType("tiered")}
                className={`h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  markupType === "tiered"
                    ? "bg-hive-dark text-hive-gold border-hive-dark shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tiered Price Slabs
              </button>
            </div>
          </div>

          {/* Platform Processing Fee Rate */}
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

          {/* Flat Markup Configuration */}
          {markupType === "flat" && (
            <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-xs font-black uppercase tracking-widest text-slate-600">
                Fallback Platform Markup Rate (%)
              </label>
              <p className="text-[11px] text-slate-500 mb-1">
                The universal flat commission markup applied to all product base prices (e.g., 15 for 15%).
              </p>
              <div className="relative">
                <input
                  type="number"
                  value={markupRate}
                  onChange={(e) => setMarkupRate(e.target.value)}
                  step="0.1"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-hive-gold/20 focus:border-hive-gold outline-none transition-all"
                  placeholder="15"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
              </div>
            </div>
          )}

          {/* Tiered Price Slabs Configuration */}
          {markupType === "tiered" && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">
                    Tiered Commission Price Slabs
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define commission markups dynamically based on product base price ranges.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addTier}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Slab
                </button>
              </div>

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
                    {markupTiers.map((tier, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          ₹{tier.min_price}
                        </td>
                        <td className="py-3 px-4">
                          {idx === markupTiers.length - 1 ? (
                            <span className="text-slate-400 italic text-[11px]">
                              Infinite (and above)
                            </span>
                          ) : (
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                min={tier.min_price}
                                value={tier.max_price ?? ""}
                                onChange={(e) => updateTierField(idx, "max_price", e.target.value)}
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
                              value={tier.rate}
                              onChange={(e) => updateTierField(idx, "rate", e.target.value)}
                              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-[13px] font-mono font-medium focus:ring-1 focus:ring-hive-gold outline-none"
                              placeholder="18"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => deleteTier(idx)}
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
            </div>
          )}
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
