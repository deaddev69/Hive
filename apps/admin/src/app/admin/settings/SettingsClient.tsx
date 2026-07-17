"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent } from "@hive/ui";

export default function SettingsClient() {
  const platformSettings = useQuery(api.adminSettings.getPlatformSettings);
  const updateSettings = useMutation(api.adminSettings.updatePlatformSettings);

  const [markupRate, setMarkupRate] = useState<string>("");
  const [platformFeeRate, setPlatformFeeRate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (platformSettings) {
      setMarkupRate((platformSettings.markupRate * 100).toString());
      setPlatformFeeRate((platformSettings.platformFeeRate * 100).toString());
    }
  }, [platformSettings]);

  if (platformSettings === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
      </div>
    );
  }

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

      await updateSettings({
        markupRate: parsedMarkup / 100,
        platformFeeRate: parsedFee / 100,
      });

      toast.success("Platform settings updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update platform settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl border-hive-border rounded-2xl shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-slate-600">
              Platform Markup Rate (%)
            </label>
            <p className="text-[11px] text-slate-500 mb-1">
              The percentage added to the boutique's Base Price to determine the Customer Display Price. (e.g. 15 for 15%)
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
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 px-6 bg-hive-dark text-hive-gold rounded-xl text-xs font-extrabold uppercase tracking-widest hover:bg-hive-dark/95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
