"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Save, IndianRupee, Percent, AlertTriangle } from "lucide-react";
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

  const [handlingCharge, setHandlingCharge] = useState<string>("");
  const [platformFee, setPlatformFee] = useState<string>("");
  const [gstRate, setGstRate] = useState<string>("");
  const [tiers, setTiers] = useState<CommissionTier[]>([...DEFAULT_TIERS]);
  const [isSaving, setIsSaving] = useState(false);
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

      toast.success("Platform pricing configuration saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
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
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading platform config...</span>
      </div>
    );
  }

  // Live preview calculations
  const hcPaise = Math.round(parseFloat(handlingCharge || "0") * 100);
  const pfPaise = Math.round(parseFloat(platformFee || "0") * 100);
  const gstPct = parseFloat(gstRate || "18");
  const platformSubtotalPaise = hcPaise + pfPaise;
  const gstOnPlatformPaise = Math.round(platformSubtotalPaise * gstPct / 100);
  const totalCustomerChargesPaise = platformSubtotalPaise + gstOnPlatformPaise;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Platform Pricing Configuration</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure commission tiers, platform fees, and GST rates. Changes apply to new orders only.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Seller Commission Tiers */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Seller Commission Tiers</h3>
          <p className="text-xs text-gray-500 mb-4">
            Each tier independently defines the commission percentage deducted from the seller.
            GST on commission is additionally deducted from the seller payout.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => {
              // Live commission preview for ₹1000 product
              const sampleBase = 100000; // ₹1000 in paise
              const commPaise = Math.round(sampleBase * tier.sellerCommissionPercent / 100);
              const commGstPaise = Math.round(commPaise * gstPct / 100);
              const payoutPaise = sampleBase - commPaise - commGstPaise;

              return (
                <div
                  key={tier.key}
                  className="bg-gray-800/60 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">{tier.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {tier.key}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Percent className="h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={tier.sellerCommissionPercent}
                      onChange={(e) => updateTierCommission(tier.key, e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  {/* Live preview */}
                  <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-700 pt-2">
                    <p>On ₹1,000 product:</p>
                    <p className="text-gray-400">
                      Commission: <span className="text-amber-400">₹{(commPaise / 100).toFixed(2)}</span>
                    </p>
                    <p className="text-gray-400">
                      Commission GST: <span className="text-amber-400">₹{(commGstPaise / 100).toFixed(2)}</span>
                    </p>
                    <p className="text-gray-400">
                      Seller Payout: <span className="text-emerald-400 font-medium">₹{(payoutPaise / 100).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform Fees */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Platform Charges (Charged to Customer)</h3>
          <p className="text-xs text-gray-500 mb-4">
            These charges are added on top of the product price at checkout. GST on these charges is also paid by the customer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Handling Charge (₹)</label>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={handlingCharge}
                  onChange={(e) => setHandlingCharge(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="29"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Platform Fee (₹)</label>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">GST Rate (%)</label>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="18"
                />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="mt-4 bg-gray-800/60 border border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-2">Customer Charge Preview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Handling</span>
                <p className="text-white font-medium">₹{(hcPaise / 100).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Platform Fee</span>
                <p className="text-white font-medium">₹{(pfPaise / 100).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">GST ({gstPct}%)</span>
                <p className="text-amber-400 font-medium">₹{(gstOnPlatformPaise / 100).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Charges</span>
                <p className="text-emerald-400 font-semibold">₹{(totalCustomerChargesPaise / 100).toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              + Product price + Dynamic Porter delivery fee = Customer total at checkout
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info notice */}
      <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-900/40 rounded-lg p-4">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200">
          <p className="font-medium">Changes apply to new orders only</p>
          <p className="text-amber-300/70 mt-1">
            Historical orders retain their original pricing snapshot. Modifying these settings will not
            change any existing order&apos;s commission, platform fees, or seller payout amounts.
          </p>
        </div>
      </div>
    </div>
  );
}
