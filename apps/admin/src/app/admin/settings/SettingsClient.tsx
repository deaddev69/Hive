"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Save, IndianRupee, Percent, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@hive/ui";

type CommissionTier = {
  key: string;
  name: string;
  sellerCommissionPercent: number;
};

const DEFAULT_TIERS: CommissionTier[] = [
  { key: "bronze", name: "Bronze", sellerCommissionPercent: 2 },
  { key: "silver", name: "Silver", sellerCommissionPercent: 3 },
  { key: "gold", name: "Gold", sellerCommissionPercent: 5 },
];

export default function SettingsClient() {
  const config = useQuery(api.adminSettings.getPlatformConfig);
  const updateConfig = useMutation(api.adminSettings.updatePlatformConfig);
  const recalculatePrices = useMutation(api.adminSettings.recalculateAllProductPrices);

  const [handlingCharge, setHandlingCharge] = useState<string>("");
  const [platformFee, setPlatformFee] = useState<string>("");
  const [gstRate, setGstRate] = useState<string>("");
  const [tiers, setTiers] = useState<CommissionTier[]>([...DEFAULT_TIERS]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<{ message: string; updatedCount: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);


  useEffect(() => {
    if (config && !isInitialized) {
      setHandlingCharge(((config.handlingChargePaise ?? 2900) / 100).toString());
      setPlatformFee(((config.platformFeePaise ?? 2000) / 100).toString());
      setGstRate((config.gstRatePercent ?? 18).toString());
      setTiers(
        config.commissionTiers && config.commissionTiers.length > 0
          ? config.commissionTiers.map((t: any) => ({
              key: t.key,
              name: t.name,
              sellerCommissionPercent: t.sellerCommissionPercent,
            }))
          : [...DEFAULT_TIERS]
      );
      setIsInitialized(true);
    }
  }, [config, isInitialized]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const handlingPaise = Math.round(parseFloat(handlingCharge || "0") * 100);
      const platformPaise = Math.round(parseFloat(platformFee || "0") * 100);
      const gstPercent = parseFloat(gstRate || "18");

      if (isNaN(handlingPaise) || handlingPaise < 0) {
        toast.error("Handling charge must be a valid non-negative amount.");
        return;
      }
      if (isNaN(platformPaise) || platformPaise < 0) {
        toast.error("Platform fee must be a valid non-negative amount.");
        return;
      }
      if (isNaN(gstPercent) || gstPercent < 0 || gstPercent > 100) {
        toast.error("GST rate must be between 0% and 100%.");
        return;
      }

      for (const tier of tiers) {
        if (tier.sellerCommissionPercent < 0 || tier.sellerCommissionPercent > 100) {
          toast.error(`${tier.name} commission must be between 0% and 100%.`);
          return;
        }
      }

      await updateConfig({
        handlingChargePaise: handlingPaise,
        platformFeePaise: platformPaise,
        gstRatePercent: gstPercent,
        commissionTiers: tiers,
      });

      toast.success("Platform configuration updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculatePrices = async () => {
    setIsRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await recalculatePrices({});
      setRecalcResult({ message: res.message, updatedCount: res.updatedCount });
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to recalculate product prices.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const updateTierCommission = (key: string, value: string) => {

    setTiers((prev) =>
      prev.map((t) =>
        t.key === key
          ? { ...t, sellerCommissionPercent: parseFloat(value) || 0 }
          : t
      )
    );
  };

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        <span className="text-sm text-slate-500 font-medium">Loading platform configuration...</span>
      </div>
    );
  }

  // Live preview metrics
  const hcPaise = Math.round(parseFloat(handlingCharge || "0") * 100);
  const pfPaise = Math.round(parseFloat(platformFee || "0") * 100);
  const gstPct = parseFloat(gstRate || "18");
  const platformSubtotalPaise = hcPaise + pfPaise;
  const gstOnPlatformPaise = Math.round((platformSubtotalPaise * gstPct) / 100);
  const totalCustomerChargesPaise = platformSubtotalPaise + gstOnPlatformPaise;

  return (
    <div className="space-y-6 text-left max-w-5xl">
      {/* Action Strip */}
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-serif">Unit Economics & Rates</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure tier commission rates deducted from sellers and platform fees charged to customers.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* 1. Seller Commission Tiers */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              1. Seller Commission Tiers
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              Deducted from Seller
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Each tier independently defines the commission % deducted from the boutique upon delivery. GST on this commission is also deducted from the seller payout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const sampleBase = 100000; // ₹1000 in paise
            const commPaise = Math.round((sampleBase * tier.sellerCommissionPercent) / 100);
            const commGstPaise = Math.round((commPaise * gstPct) / 100);
            const payoutPaise = sampleBase - commPaise - commGstPaise;

            return (
              <div
                key={tier.key}
                className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4.5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-900">{tier.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {tier.key}
                    </span>
                  </div>

                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Seller Commission
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={tier.sellerCommissionPercent}
                      onChange={(e) => updateTierCommission(tier.key, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="bg-white border border-slate-200/70 rounded-lg p-3 text-[11px] space-y-1 text-slate-600 font-medium">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    On ₹1,000 Listing:
                  </div>
                  <div className="flex justify-between">
                    <span>Commission ({tier.sellerCommissionPercent}%):</span>
                    <span className="font-bold text-slate-800 font-mono">₹{(commPaise / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST on Comm ({gstPct}%):</span>
                    <span className="font-bold text-slate-800 font-mono">₹{(commGstPaise / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 text-emerald-700 font-bold">
                    <span>Seller Payout:</span>
                    <span className="font-mono">₹{(payoutPaise / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Platform Charges */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              2. Platform Charges
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
              Charged to Customer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            These platform fees are added on top of the product base price at checkout. GST on these charges is paid by the customer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Handling Charge */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Handling Charge (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={handlingCharge}
                onChange={(e) => setHandlingCharge(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                placeholder="29"
              />
            </div>
            <p className="text-[10px] text-slate-400">Order processing fee</p>
          </div>

          {/* Platform Fee */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Platform Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                placeholder="20"
              />
            </div>
            <p className="text-[10px] text-slate-400">Technology platform fee</p>
          </div>

          {/* GST Rate */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              GST Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-slate-900 font-bold text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                placeholder="18"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
            <p className="text-[10px] text-slate-400">GST on fees & commissions</p>
          </div>
        </div>

        {/* Customer Fee Preview Banner */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Customer Fee Summary at Checkout
            </span>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-mono">
              Total Fees: ₹{(totalCustomerChargesPaise / 100).toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/70 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Handling</span>
              <span className="font-bold text-slate-800 font-mono">₹{(hcPaise / 100).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Platform Fee</span>
              <span className="font-bold text-slate-800 font-mono">₹{(pfPaise / 100).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">GST ({gstPct}%)</span>
              <span className="font-bold text-slate-800 font-mono">₹{(gstOnPlatformPaise / 100).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Customer Total</span>
              <span className="font-extrabold text-slate-900 font-mono">
                Product + Delivery + ₹{(totalCustomerChargesPaise / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Catalog Price Synchronization */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                3. Product Catalog Price Synchronization
              </h2>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                0% Customer Markup
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Synchronizes all existing catalog products with the commission pricing system. Resets storefront display prices directly to the seller&apos;s base price (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">price = basePrice</code>), stripping legacy markups.
            </p>
          </div>

          <button
            type="button"
            disabled={isRecalculating || isSaving}
            onClick={handleRecalculatePrices}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isRecalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Recalculating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#F5C22B]" />
                <span>Recalculate All Product Prices</span>
              </>
            )}
          </button>
        </div>

        {recalcResult && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-900 font-medium">
              <span className="font-bold">Sync Completed:</span> {recalcResult.message}
            </div>
          </div>
        )}
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Historical Order Immutability:</span> Changes saved here apply only to new checkouts and orders. Past orders retain their original frozen financial pricing snapshot.
        </div>
      </div>
    </div>
  );
}

