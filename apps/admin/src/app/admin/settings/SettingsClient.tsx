"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Calculator, 
  ShieldCheck,
  Percent,
  IndianRupee,
  Layers
} from "lucide-react";

export type CommissionSlab = {
  minPrice: number;
  maxPrice: number | null;
  commissionPercent: number;
};

export type TierPricingConfig = {
  key: string;
  name: string;
  commissionSlabs: CommissionSlab[];
  commissionGstPercent: number;
  handlingChargePaise: number;
  platformFeePaise: number;
  platformGstPercent: number;
};

const DEFAULT_TIERS: TierPricingConfig[] = [
  {
    key: "bronze",
    name: "Bronze",
    commissionSlabs: [
      { minPrice: 0, maxPrice: 499, commissionPercent: 2 },
      { minPrice: 500, maxPrice: 999, commissionPercent: 3 },
      { minPrice: 1000, maxPrice: 1499, commissionPercent: 4 },
      { minPrice: 1500, maxPrice: null, commissionPercent: 5 },
    ],
    commissionGstPercent: 18,
    handlingChargePaise: 2900,
    platformFeePaise: 2000,
    platformGstPercent: 18,
  },
  {
    key: "silver",
    name: "Silver",
    commissionSlabs: [
      { minPrice: 0, maxPrice: 499, commissionPercent: 2.5 },
      { minPrice: 500, maxPrice: 999, commissionPercent: 3.5 },
      { minPrice: 1000, maxPrice: null, commissionPercent: 4.5 },
    ],
    commissionGstPercent: 18,
    handlingChargePaise: 2500,
    platformFeePaise: 1500,
    platformGstPercent: 18,
  },
  {
    key: "gold",
    name: "Gold",
    commissionSlabs: [
      { minPrice: 0, maxPrice: 499, commissionPercent: 3 },
      { minPrice: 500, maxPrice: 999, commissionPercent: 4 },
      { minPrice: 1000, maxPrice: null, commissionPercent: 5 },
    ],
    commissionGstPercent: 18,
    handlingChargePaise: 2000,
    platformFeePaise: 1000,
    platformGstPercent: 18,
  },
];

function validateSlabs(slabs: CommissionSlab[]): { valid: boolean; error?: string } {
  if (!Array.isArray(slabs) || slabs.length === 0) {
    return { valid: false, error: "At least one slab required." };
  }
  const sorted = [...slabs].sort((a, b) => a.minPrice - b.minPrice);
  if (sorted[0]?.minPrice !== 0) {
    return { valid: false, error: "First slab must start at ₹0." };
  }
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    // Indexing an array yields `T | undefined` under noUncheckedIndexedAccess.
    // `i` is always in range here, so this guard never fires at runtime — it is
    // what lets the rest of the loop read `s` without an assertion.
    if (!s) continue;
    if (s.commissionPercent < 0 || s.commissionPercent > 100 || isNaN(s.commissionPercent)) {
      return { valid: false, error: `Invalid commission % at slab ₹${s.minPrice}.` };
    }
    const isLast = i === sorted.length - 1;
    if (!isLast) {
      if (s.maxPrice === null || s.maxPrice === undefined) {
        return { valid: false, error: `Slab starting at ₹${s.minPrice} must have a max price.` };
      }
      if (s.maxPrice < s.minPrice) {
        return { valid: false, error: `Max price cannot be less than min price (₹${s.minPrice}).` };
      }
      const next = sorted[i + 1];
      // Same reasoning: `isLast` is false here, so i + 1 is in range.
      if (!next) continue;
      if (next.minPrice !== s.maxPrice + 1) {
        if (next.minPrice <= s.maxPrice) {
          return { valid: false, error: `Overlap between ₹${s.minPrice}–₹${s.maxPrice} and ₹${next.minPrice}.` };
        } else {
          return { valid: false, error: `Gap between ₹${s.minPrice}–₹${s.maxPrice} and ₹${next.minPrice}. Next slab must start at ₹${s.maxPrice + 1}.` };
        }
      }
    } else {
      if (s.maxPrice !== null && s.maxPrice !== undefined) {
        return { valid: false, error: `Final slab (₹${s.minPrice}+) must be open-ended.` };
      }
    }
  }
  return { valid: true };
}

export default function SettingsClient() {
  const config = useQuery(api.adminSettings.getPlatformConfig);
  const updateConfig = useMutation(api.adminSettings.updatePlatformConfig);
  const recalculatePrices = useMutation(api.migrations.recalculateAllProductPrices);

  const [tiers, setTiers] = useState<TierPricingConfig[]>(DEFAULT_TIERS);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Live simulation state
  const [simBasePrice, setSimBasePrice] = useState<number>(899);

  useEffect(() => {
    if (config && !isInitialized) {
      if (config.tiers && config.tiers.length > 0) {
        setTiers(config.tiers);
      } else {
        setTiers(DEFAULT_TIERS);
      }
      setIsInitialized(true);
    }
  }, [config, isInitialized]);

  const validationResults = useMemo(() => {
    return tiers.map((tier) => ({
      key: tier.key,
      name: tier.name,
      ...validateSlabs(tier.commissionSlabs),
    }));
  }, [tiers]);

  const hasAnyValidationError = validationResults.some((r) => !r.valid);

  const handleUpdateTierGst = (tierKey: string, value: number) => {
    setTiers((prev) =>
      prev.map((t) => (t.key === tierKey ? { ...t, commissionGstPercent: value } : t))
    );
  };

  const handleUpdateTierCharges = (
    tierKey: string,
    field: "handlingChargePaise" | "platformFeePaise" | "platformGstPercent",
    value: number
  ) => {
    setTiers((prev) =>
      prev.map((t) => (t.key === tierKey ? { ...t, [field]: value } : t))
    );
  };

  const handleUpdateSlab = (
    tierKey: string,
    slabIndex: number,
    field: "minPrice" | "maxPrice" | "commissionPercent",
    val: any
  ) => {
    setTiers((prev) =>
      prev.map((t) => {
        if (t.key !== tierKey) return t;
        const newSlabs = [...t.commissionSlabs];
        const existing = newSlabs[slabIndex];
        if (!existing) return t;
        newSlabs[slabIndex] = { ...existing, [field]: val };
        return { ...t, commissionSlabs: newSlabs };
      })
    );
  };

  const handleAddSlab = (tierKey: string) => {
    setTiers((prev) =>
      prev.map((t) => {
        if (t.key !== tierKey) return t;
        const slabs = [...t.commissionSlabs];
        const last = slabs[slabs.length - 1];
        if (last) {
          const splitMin = last.minPrice;
          const splitMax = splitMin + 499;
          last.maxPrice = splitMax;
          slabs.push({
            minPrice: splitMax + 1,
            maxPrice: null,
            commissionPercent: Math.min(100, (last.commissionPercent || 0) + 1),
          });
        } else {
          slabs.push({ minPrice: 0, maxPrice: null, commissionPercent: 2 });
        }
        return { ...t, commissionSlabs: slabs };
      })
    );
  };

  const handleDeleteSlab = (tierKey: string, index: number) => {
    setTiers((prev) =>
      prev.map((t) => {
        if (t.key !== tierKey) return t;
        if (t.commissionSlabs.length <= 1) {
          toast.error("Cannot delete the only slab in a tier.");
          return t;
        }
        const slabs = t.commissionSlabs.filter((_, idx) => idx !== index);
        // Fix up the new last slab to be open-ended
        const lastIdx = slabs.length - 1;
        const last = lastIdx >= 0 ? slabs[lastIdx] : undefined;
        if (last) {
          slabs[lastIdx] = { ...last, maxPrice: null };
        }
        return { ...t, commissionSlabs: slabs };
      })
    );
  };

  const handleSave = async () => {
    if (hasAnyValidationError) {
      const err = validationResults.find((r) => !r.valid);
      toast.error(`Please fix validation error in ${err?.name}: ${err?.error}`);
      return;
    }

    setIsSaving(true);
    try {
      await updateConfig({
        tiers,
      });
      toast.success("Tier commission slabs & platform charges saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save tier configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculatePrices = async () => {
    setIsRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await recalculatePrices({});
      setRecalcResult(res);
      toast.success(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to recalculate prices.");
    } finally {
      setIsRecalculating(false);
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        <span className="text-sm text-slate-500 font-medium">Loading platform configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left max-w-6xl">
      {/* Top Header & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 font-serif">Platform Unit Economics &amp; Tier Rates</h2>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">v3 Multi-Slab</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure independent commission slabs and platform charges for Bronze, Silver, and Gold tiers.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || hasAnyValidationError}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98] shrink-0"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* 1. SELLER COMMISSION CONFIGURATION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              1. Seller Commission Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each tier has independent commission slabs. GST on seller commission is deducted from the seller payout.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const validation = validationResults.find((v) => v.key === tier.key);
            const isValid = validation?.valid;

            return (
              <div
                key={tier.key}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs transition-all ${
                  !isValid ? "border-red-300 ring-1 ring-red-200" : "border-slate-200/90"
                }`}
              >
                <div>
                  {/* Tier Title & Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <span className="text-base font-bold text-slate-900">{tier.name} Tier</span>
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">{tier.key}</span>
                    </div>
                    {isValid ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid Slabs
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Invalid
                      </span>
                    )}
                  </div>

                  {/* Commission GST input */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl mb-3 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">Commission GST Rate</span>
                    <div className="flex items-center gap-1 w-20">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={tier.commissionGstPercent}
                        onChange={(e) => handleUpdateTierGst(tier.key, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-right font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                      <span className="text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  {/* Slabs List */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      <div className="col-span-7">Price Range (₹)</div>
                      <div className="col-span-4 text-right">Commission</div>
                      <div className="col-span-1"></div>
                    </div>

                    {tier.commissionSlabs.map((slab, idx) => {
                      const isLast = idx === tier.commissionSlabs.length - 1;
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 items-center gap-1.5 bg-slate-50/70 border border-slate-200/80 rounded-xl p-2 text-xs"
                        >
                          {/* Price Range */}
                          <div className="col-span-7 flex items-center gap-1">
                            <span className="text-slate-500 font-mono text-[11px]">₹{slab.minPrice}</span>
                            <span className="text-slate-400">–</span>
                            {isLast ? (
                              <span className="font-bold text-slate-900 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                                ∞ (Any+)
                              </span>
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <span className="text-slate-400 text-[11px]">₹</span>
                                <input
                                  type="number"
                                  min={slab.minPrice}
                                  value={slab.maxPrice ?? ""}
                                  onChange={(e) =>
                                    handleUpdateSlab(
                                      tier.key,
                                      idx,
                                      "maxPrice",
                                      e.target.value === "" ? null : parseInt(e.target.value)
                                    )
                                  }
                                  className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                                />
                              </div>
                            )}
                          </div>

                          {/* Commission % */}
                          <div className="col-span-4 flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={slab.commissionPercent}
                              onChange={(e) =>
                                handleUpdateSlab(tier.key, idx, "commissionPercent", parseFloat(e.target.value) || 0)
                              }
                              className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                            />
                            <span className="text-slate-400 font-bold text-[11px]">%</span>
                          </div>

                          {/* Delete */}
                          <div className="col-span-1 flex justify-end">
                            {tier.commissionSlabs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSlab(tier.key, idx)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                title="Delete slab"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isValid && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 font-medium">
                      {validation?.error}
                    </div>
                  )}

                  {/* Add Slab Button */}
                  <button
                    type="button"
                    onClick={() => handleAddSlab(tier.key)}
                    className="mt-3 w-full py-2 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Slab</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. PLATFORM CHARGES BY TIER */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-slate-700" />
            2. Platform Charges by Tier (Charged to Customer)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Handling and platform fees configured per tier. Included in customer storefront pricing.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-5">Tier</th>
                  <th className="py-3.5 px-5">Handling Charge (₹)</th>
                  <th className="py-3.5 px-5">Platform Fee (₹)</th>
                  <th className="py-3.5 px-5">Platform GST (%)</th>
                  <th className="py-3.5 px-5 text-right">Customer Fee Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {tiers.map((tier) => {
                  const hc = tier.handlingChargePaise / 100;
                  const pf = tier.platformFeePaise / 100;
                  const gstPct = tier.platformGstPercent;
                  const gstAmount = Math.round((hc + pf) * (gstPct / 100) * 100) / 100;
                  const totalFee = hc + pf + gstAmount;

                  return (
                    <tr key={tier.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {tier.name}
                        <span className="text-[10px] text-slate-400 font-mono block">{tier.key}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1 w-28">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={hc}
                            onChange={(e) =>
                              handleUpdateTierCharges(
                                tier.key,
                                "handlingChargePaise",
                                Math.round((parseFloat(e.target.value) || 0) * 100)
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1 w-28">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={pf}
                            onChange={(e) =>
                              handleUpdateTierCharges(
                                tier.key,
                                "platformFeePaise",
                                Math.round((parseFloat(e.target.value) || 0) * 100)
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1 w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={gstPct}
                            onChange={(e) =>
                              handleUpdateTierCharges(
                                tier.key,
                                "platformGstPercent",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                          />
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-emerald-800 font-mono">
                        ₹{totalFee.toFixed(2)}
                        <span className="text-[10px] text-slate-400 font-normal block font-sans">
                          (₹{hc} + ₹{pf} + 18% GST)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE SIMULATOR / CALCULATOR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-700" />
              3. Live Pricing Simulator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Test how a product base price resolves across tiers and commission slabs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Test Base Price:</span>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="1"
                step="10"
                value={simBasePrice}
                onChange={(e) => setSimBasePrice(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-24 bg-transparent font-bold text-sm text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {tiers.map((tier) => {
            const slabs = tier.commissionSlabs || [];
            const matchingSlab =
              slabs.find((s) => {
                const min = simBasePrice >= s.minPrice;
                const max = s.maxPrice === null || s.maxPrice === undefined || simBasePrice <= s.maxPrice;
                return min && max;
              }) || slabs[slabs.length - 1];

            const commPercent = matchingSlab?.commissionPercent ?? 2;
            const commAmount = (simBasePrice * commPercent) / 100;
            const commGst = (commAmount * tier.commissionGstPercent) / 100;
            const netPayout = Math.max(0, simBasePrice - commAmount - commGst);

            const hc = tier.handlingChargePaise / 100;
            const pf = tier.platformFeePaise / 100;
            const platformGst = (hc + pf) * (tier.platformGstPercent / 100);
            const customerPrice = simBasePrice + hc + pf + platformGst;

            const slabLabel =
              matchingSlab?.maxPrice === null
                ? `₹${matchingSlab.minPrice}+`
                : `₹${matchingSlab?.minPrice} – ₹${matchingSlab?.maxPrice}`;

            return (
              <div key={tier.key} className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{tier.name}</span>
                  <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                    {slabLabel}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Commission Rate:</span>
                    <span className="font-bold text-slate-900">{commPercent}%</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Commission Deducted:</span>
                    <span className="font-mono text-slate-800">₹{commAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST on Commission ({tier.commissionGstPercent}%):</span>
                    <span className="font-mono text-slate-800">₹{commGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-emerald-800 font-bold">
                    <span>Seller Net Payout:</span>
                    <span className="font-mono">₹{netPayout.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-dashed border-slate-200 text-slate-700 font-bold">
                    <span>Storefront Customer Price:</span>
                    <span className="font-mono">₹{customerPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CATALOG RECALCULATION & SYNC */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              4. Synchronize Product Catalog Prices
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              Upfront All-Inclusive Pricing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Recalculates all active product catalog prices according to each boutique&apos;s assigned tier platform charges and GST rates.
          </p>
        </div>

        <button
          type="button"
          disabled={isRecalculating || isSaving}
          onClick={handleRecalculatePrices}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isRecalculating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Recalculating...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-[#F5C22B]" />
              <span>Recalculate All Prices</span>
            </>
          )}
        </button>
      </div>

      {recalcResult && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs text-emerald-900 font-medium">
            <span className="font-bold">Sync Completed:</span> {recalcResult}
          </div>
        </div>
      )}

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
        <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Historical Order Immutability:</span> Changes saved here apply only to new checkouts and future orders. Past orders retain their original frozen financial pricing snapshot and will not be altered.
        </div>
      </div>
    </div>
  );
}
