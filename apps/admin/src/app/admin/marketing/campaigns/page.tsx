"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Send,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Search,
  Upload,
  Loader2,
  Smartphone,
  BarChart3,
  Calendar,
  Users,
  Image as ImageIcon,
  FolderKanban,
  Tag,
  Clock,
  ChevronRight,
  Archive,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { toast } from "@hive/utils";

type TabId = "overview" | "campaigns" | "executions" | "audience" | "assets";

export default function MarketingCampaignsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("campaigns");
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Convex Queries
  const campaigns = useQuery(api.campaigns.listCampaigns);
  const segments = useQuery(api.audienceSegments.listSegments);
  const collections = useQuery(api.homepageAdmin.getAllHomepageCollections);

  // Convex Mutations & Actions
  const createCampaignMutation = useMutation(api.campaigns.createCampaign);
  const duplicateCampaignMutation = useMutation(api.campaigns.duplicateCampaign);
  const updateCampaignMutation = useMutation(api.campaigns.updateCampaign);
  const dispatchPushAction = useAction(api.customerPushActions.dispatchPushCampaign);

  // Studio Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"EDITORIAL" | "SEASONAL" | "ANNOUNCEMENT" | "PRODUCT" | "DELIVERY">("EDITORIAL");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [audienceSegmentId, setAudienceSegmentId] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [targetUrl, setTargetUrl] = useState("/");
  const [bannerUrl, setBannerUrl] = useState("");
  const [heroUrl, setHeroUrl] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isDispatching, setIsDispatching] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-dispatch Safety Validation Checks
  const validationChecks = {
    hasTitle: title.trim().length > 0,
    hasPushTitle: pushTitle.trim().length > 0,
    hasPushBody: pushBody.trim().length > 0,
    hasTargetUrl: targetUrl.trim().length > 0,
    hasAudience: audienceSegmentId.trim().length > 0 || true,
    hasBanner: bannerUrl.trim().length > 0,
  };

  const isFormValid =
    validationChecks.hasTitle &&
    validationChecks.hasPushTitle &&
    validationChecks.hasPushBody &&
    validationChecks.hasTargetUrl;

  const handleFileUploadToR2 = async (file: File, targetAsset: "banner" | "hero") => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        if (targetAsset === "banner") setBannerUrl(data.url);
        if (targetAsset === "hero") setHeroUrl(data.url);
        toast.success("Asset uploaded to Cloudflare R2!");
      } else {
        toast.error(data.error || "R2 upload failed. You can paste an image URL directly.");
      }
    } catch (err: any) {
      toast.error("Upload error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachCollection = (colId: string) => {
    const col = collections?.find((c: any) => c._id === colId);
    if (!col) return;

    setCollectionId(col._id);
    setTitle(col.title);
    setPushTitle(col.title);
    setPushBody(col.subtitle || `Explore the ${col.title} collection on Hive.`);
    setTargetUrl(`/collections/${col.slug}`);
    if (col.imageUrl) {
      setBannerUrl(col.imageUrl);
      setHeroUrl(col.imageUrl);
    }
  };

  const handleSaveCampaign = async (status: "draft" | "running") => {
    if (!isFormValid) {
      toast.error("Please fill in required campaign fields before saving.");
      return;
    }

    try {
      setIsSaving(true);
      const assets = [];
      if (bannerUrl) assets.push({ type: "push" as const, url: bannerUrl, sortOrder: 1 });
      if (heroUrl) assets.push({ type: "hero" as const, url: heroUrl, sortOrder: 2 });

      await createCampaignMutation({
        title,
        slug: slug || undefined,
        type,
        subtitle: subtitle || undefined,
        description: description || undefined,
        collectionId: collectionId || undefined,
        audienceSegmentId: audienceSegmentId ? (audienceSegmentId as any) : undefined,
        assets,
        messaging: {
          pushTitle,
          pushBody,
          targetUrl,
        },
      });

      toast.success(`Campaign "${title}" created successfully! 🎉`);
      setShowStudioModal(false);
      resetForm();
    } catch (err: any) {
      toast.error("Failed to save campaign: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispatchPush = async (campaign: any) => {
    try {
      setIsDispatching(campaign._id);
      const pushAsset = campaign.assets?.find((a: any) => a.type === "push")?.url;

      const res = await dispatchPushAction({
        campaignId: campaign._id,
        title: campaign.messaging?.pushTitle || campaign.title,
        body: campaign.messaging?.pushBody || campaign.subtitle || "Check out new arrivals on Hive",
        bannerUrl: pushAsset,
        targetUrl: campaign.messaging?.targetUrl || "/",
        triggeredBy: "manual",
      });

      if (res.success) {
        toast.success(`Campaign dispatched to ${res.count || 0} customer devices! 🚀`);
      } else {
        toast.error(`Dispatch warning: ${res.error}`);
      }
    } catch (err: any) {
      toast.error("Dispatch failed: " + err.message);
    } finally {
      setIsDispatching(null);
    }
  };

  const handleDuplicate = async (id: any) => {
    try {
      const newId = await duplicateCampaignMutation({ id });
      toast.success("Campaign duplicated as a new draft! 📋");
    } catch (err: any) {
      toast.error("Failed to duplicate campaign: " + err.message);
    }
  };

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setType("EDITORIAL");
    setSubtitle("");
    setDescription("");
    setCollectionId("");
    setAudienceSegmentId("");
    setPushTitle("");
    setPushBody("");
    setTargetUrl("/");
    setBannerUrl("");
    setHeroUrl("");
  };

  // Metric Aggregations
  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns = campaigns?.filter((c: any) => c.status === "running" || c.status === "scheduled").length || 0;
  const totalDelivered = campaigns?.reduce((sum: number, c: any) => sum + (c.aggregateMetrics?.delivered || 0), 0) || 0;
  const totalClicked = campaigns?.reduce((sum: number, c: any) => sum + (c.aggregateMetrics?.clicked || 0), 0) || 0;
  const avgCTR = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-8 space-y-8 select-none">
      
      {/* ── Top Header & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-700 text-xs font-bold uppercase tracking-widest">
            <Send className="w-3.5 h-3.5" />
            <span>Hive Marketing Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-slate-900">
            Campaign Studio & Delivery Platform
          </h1>
          <p className="text-xs text-slate-500">
            Design multi-channel campaigns, target customer audience segments, and monitor live push dispatch executions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowStudioModal(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Create Campaign</span>
          </button>
        </div>
      </div>

      {/* ── Workspace Overview Metric Ribbon ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Active Campaigns</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-slate-900">{activeCampaigns}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalCampaigns} total</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Messages Delivered</span>
            <Send className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-serif font-bold text-slate-900">{totalDelivered.toLocaleString()}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Avg. CTR</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-slate-900">{avgCTR}%</span>
            <span className="text-xs text-slate-400 font-medium">engagement rate</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Audience Reach</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-serif font-bold text-slate-900">{segments?.length || 2} Segments</span>
        </div>
      </div>

      {/* ── Workspace Navigation Tabs ───────────────────────────────────────── */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: "campaigns", label: "All Campaigns", icon: Layers },
            { id: "executions", label: "Dispatch History", icon: Send },
            { id: "audience", label: "Audience Segments", icon: Users },
            { id: "assets", label: "Asset Library", icon: ImageIcon },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-amber-500 text-slate-900 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content: Campaigns List ────────────────────────────────────── */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
              Campaign Definitions ({campaigns?.length || 0})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns?.map((camp: any) => {
              const bannerAsset = camp.assets?.find((a: any) => a.type === "push" || a.type === "banner")?.url;
              const executionsCount = camp.executions?.length || 0;

              return (
                <div
                  key={camp._id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {camp.type}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                          camp.status === "completed" || camp.status === "running"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-serif font-bold text-lg text-slate-900 group-hover:text-amber-600 transition">
                        {camp.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{camp.subtitle || camp.messaging?.pushBody}</p>
                    </div>

                    {bannerAsset && (
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                        <Image src={bannerAsset} alt={camp.title} fill className="object-cover" />
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>URL: <code className="font-mono text-slate-700">{camp.slug}</code></span>
                      <span>Executions: <strong>{executionsCount}</strong></span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDispatchPush(camp)}
                      disabled={isDispatching === camp._id}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isDispatching === camp._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Dispatch Push</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(camp._id)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="Duplicate Campaign"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!campaigns || campaigns.length === 0) && (
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
                <Layers className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-serif text-lg font-bold text-slate-800">No campaigns created yet.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "+ Create Campaign" above to launch your first push & homepage marketing campaign.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Executions Log ───────────────────────────────────── */}
      {activeTab === "executions" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
            Dispatch Execution Logs
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Campaign</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Trigger</th>
                  <th className="p-3">Sent Date</th>
                  <th className="p-3 text-right">Sent</th>
                  <th className="p-3 text-right">Delivered</th>
                  <th className="p-3 text-right">Failed</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns?.flatMap((c: any) =>
                  (c.executions || []).map((e: any) => (
                    <tr key={e._id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-bold text-slate-900">{c.title}</td>
                      <td className="p-3 capitalize font-medium">{e.channel}</td>
                      <td className="p-3 capitalize text-slate-500">{e.triggeredBy}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(e.sentAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">{e.metrics?.sent || 0}</td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-600">
                        {e.metrics?.delivered || 0}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-red-500">{e.metrics?.failed || 0}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold uppercase text-[10px]">
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Studio Modal with Device Previews & Safety Validation ───────────── */}
      {showStudioModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Marketing Studio
                </span>
                <h2 className="text-xl font-serif font-bold text-slate-900">
                  Compose Campaign & Push Broadcast
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowStudioModal(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Campaign Controls & Inputs */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Collection Quick Attach */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" /> Attach Curated Collection
                  </span>
                  <select
                    value={collectionId}
                    onChange={(e) => handleAttachCollection(e.target.value)}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-800"
                  >
                    <option value="">Select a collection to auto-fill title & links...</option>
                    {collections?.map((col: any) => (
                      <option key={col._id} value={col._id}>
                        {col.emoji || "✨"} {col.title} ({col.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Title *</label>
                    <input
                      type="text"
                      placeholder="e.g., Wedding Season Collection"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Type</label>
                    <select
                      value={type}
                      onChange={(e: any) => setType(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="EDITORIAL">EDITORIAL</option>
                      <option value="SEASONAL">SEASONAL</option>
                      <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                      <option value="PRODUCT">PRODUCT</option>
                      <option value="DELIVERY">DELIVERY</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    placeholder="e.g., wedding-season"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Push Title *</label>
                    <input
                      type="text"
                      placeholder="🔥 Special Offer"
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Deep Link *</label>
                    <input
                      type="text"
                      placeholder="/collections/wedding-season"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Push Notification Body *</label>
                  <textarea
                    rows={2}
                    placeholder="Hand-picked boutique styles available now on Hive PWA."
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium resize-none"
                  />
                </div>

                {/* Cloudflare R2 Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Push Banner Image (R2 Storage)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUploadToR2(e, "banner")}
                      className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste direct image URL https://..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600"
                  />
                </div>

                {/* Optimistic Safety Checklist */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pre-Dispatch Safety Checklist
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <div className={`flex items-center gap-2 ${validationChecks.hasTitle ? "text-emerald-600" : "text-slate-400"}`}>
                      <Check className="w-3.5 h-3.5" /> Campaign Title
                    </div>
                    <div className={`flex items-center gap-2 ${validationChecks.hasPushTitle ? "text-emerald-600" : "text-slate-400"}`}>
                      <Check className="w-3.5 h-3.5" /> Push Title
                    </div>
                    <div className={`flex items-center gap-2 ${validationChecks.hasPushBody ? "text-emerald-600" : "text-slate-400"}`}>
                      <Check className="w-3.5 h-3.5" /> Push Message Body
                    </div>
                    <div className={`flex items-center gap-2 ${validationChecks.hasTargetUrl ? "text-emerald-600" : "text-slate-400"}`}>
                      <Check className="w-3.5 h-3.5" /> Target Link
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Live Mobile Push Notification Preview */}
              <div className="lg:col-span-5 space-y-4 bg-slate-900 p-5 rounded-3xl text-white">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Android & iOS Live Preview
                  </span>
                </div>

                {/* Android Notification Shade Component */}
                <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-2xl p-4 space-y-2 text-left shadow-lg">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Hive PWA
                    </span>
                    <span>Just now</span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug">
                    {pushTitle || "🔥 Special Offer from Hive!"}
                  </h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {pushBody || "Hand-picked boutique styles available now on Hive."}
                  </p>

                  {bannerUrl && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 mt-2">
                      <Image src={bannerUrl} alt="Push banner" fill className="object-cover" />
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCampaign("draft")}
                    disabled={!isFormValid || isSaving}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Campaign Definition"}
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
