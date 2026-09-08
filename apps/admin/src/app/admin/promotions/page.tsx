"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import {
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  Copy,
  Power,
  Image as ImageIcon,
  ExternalLink,
  Gift,
  ArrowRight,
  Loader2,
  X,
  Smartphone,
  Eye,
  ShieldCheck,
  Tag,
  MapPin,
  Calendar,
} from "lucide-react";
import Image from "next/image";

export default function AdminPromotionsPage() {
  const promotions = useQuery(api.promotions.listAdminPromotions, {});
  const createPromotion = useMutation(api.promotions.createPromotion);
  const toggleStatus = useMutation(api.promotions.togglePromotionStatus);
  const archivePromotion = useMutation(api.promotions.archivePromotion);
  const duplicatePromotion = useMutation(api.promotions.duplicatePromotion);

  const [filterTab, setFilterTab] = useState<"all" | "active" | "draft" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Structured Builder Form State
  const [form, setForm] = useState<{
    name: string;
    type: "scratch_card" | "sponsored_banner" | "brand_offer" | "coupon";
    placement: "ORDER_SUCCESS_REWARD" | "ORDER_SUCCESS_SPONSORED";
    status: "draft" | "active" | "scheduled";
    priority: number;
    badge: string;
    title: string;
    subtitle: string;
    creativeUrl: string;
    aspectRatio: "1:1" | "3:4" | "4:5" | "16:9";
    ctaText: string;
    destinationType: "product" | "store" | "category" | "promotion" | "external";
    destinationValue: string;
    brandName: string;
    // Reward settings (NO client rewardCode)
    rewardTitle: string;
    rewardType: "fixed" | "percentage";
    discountValue: number;
    minOrderRupees: number;
    expiresInDays: number;
    terms: string;
    // Targeting
    audience: "everyone" | "new_customers" | "returning_customers";
    locationType: "all" | "selected_pincodes";
    pincodesInput: string;
    vertical: string;
    // Exposure rules
    maxImpressions: number;
    cooldownDays: number;
  }>({
    name: "The Linen Club – 20% Off",
    type: "sponsored_banner",
    placement: "ORDER_SUCCESS_SPONSORED",
    status: "active",
    priority: 2,
    badge: "Sponsored · The Linen Club",
    title: "Flat 20% Off",
    subtitle: "on your next purchase",
    creativeUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80",
    aspectRatio: "1:1",
    ctaText: "Shop Now →",
    destinationType: "store",
    destinationValue: "the-linen-club",
    brandName: "The Linen Club",
    rewardTitle: "₹100 OFF",
    rewardType: "fixed",
    discountValue: 100,
    minOrderRupees: 999,
    expiresInDays: 30,
    terms: "Valid on next Hive purchase within 30 days.",
    audience: "everyone",
    locationType: "all",
    pincodesInput: "682030, 682024",
    vertical: "apparel",
    maxImpressions: 1,
    cooldownDays: 30,
  });

  const filteredPromotions = (promotions || []).filter((p) => {
    if (filterTab === "active" && p.status !== "active") return false;
    if (filterTab === "draft" && p.status !== "draft") return false;
    if (filterTab === "archived" && p.status !== "archived") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCreateSubmit = async (statusOverride?: "draft" | "active") => {
    setSubmitting(true);
    try {
      const pincodes =
        form.locationType === "selected_pincodes"
          ? form.pincodesInput.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

      await createPromotion({
        name: form.name,
        type: form.type,
        placement: form.placement,
        status: statusOverride || form.status,
        priority: Number(form.priority) || 1,
        badge: form.badge || undefined,
        title: form.title,
        subtitle: form.subtitle || undefined,
        creativeUrl: form.creativeUrl || undefined,
        aspectRatio: form.aspectRatio,
        ctaText: form.ctaText,
        destination: {
          type: form.destinationType,
          value: form.destinationValue || "default",
        },
        ctaLink:
          form.destinationType === "external"
            ? form.destinationValue
            : form.destinationType === "store"
            ? `/shop/${form.destinationValue}`
            : `/collections/${form.destinationValue}`,
        brandName: form.brandName || undefined,
        rewardConfig:
          form.type === "scratch_card" || form.type === "coupon"
            ? {
                rewardTitle: form.rewardTitle || "₹100 OFF",
                rewardType: form.rewardType,
                discountValue: Number(form.discountValue) || 100,
                minOrderPaise: (Number(form.minOrderRupees) || 0) * 100,
                expiresInDays: Number(form.expiresInDays) || 30,
                terms: form.terms || undefined,
                claimLimit: 1,
              }
            : undefined,
        targeting: {
          audience: form.audience,
          locationType: form.locationType,
          pincodes,
          vertical: form.vertical !== "all" ? form.vertical : undefined,
        },
        displayRules: {
          maxImpressionsPerCustomer: Number(form.maxImpressions) || 1,
          maxClaimsPerCustomer: 1,
          cooldownDays: Number(form.cooldownDays) || 30,
        },
      });

      setIsCreateOpen(false);
    } catch (err: any) {
      alert("Failed to create promotion: " + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Post-Purchase Promotions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage campaigns, interactive scratch cards, and partner advertisements for the order confirmation screen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Promotion</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          {(["all", "active", "draft", "archived"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                filterTab === tab
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {promotions === undefined ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-xs font-medium">Loading promotions...</span>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No promotions found</p>
            <p className="text-xs text-slate-400">
              The order confirmation screen automatically uses high-converting default fallbacks when no campaigns are active.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Campaign & Creative</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Placement</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPromotions.map((promo) => (
                  <tr key={promo._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 flex items-center justify-center">
                          {promo.creativeUrl ? (
                            <Image
                              src={promo.creativeUrl}
                              alt={promo.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : promo.type === "scratch_card" ? (
                            <Gift className="w-5 h-5 text-amber-500" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{promo.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {promo.badge ? `${promo.badge} · ` : ""}
                            {promo.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                        {promo.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {promo.placement}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          promo.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : promo.status === "scheduled"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : promo.status === "archived"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {promo.status === "active" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : promo.status === "scheduled" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span className="capitalize">{promo.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-slate-800">
                      {promo.priority}
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => toggleStatus({ promotionId: promo._id })}
                        title={promo.status === "active" ? "Pause" : "Activate"}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicatePromotion({ promotionId: promo._id })}
                        title="Duplicate as Draft"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Archive promotion "${promo.name}"?`)) {
                            archivePromotion({ promotionId: promo._id });
                          }
                        }}
                        title="Archive Campaign"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Structured Create Promotion Builder Modal with Live Mobile Preview */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-5xl w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create Post-Purchase Promotion</h2>
                <p className="text-xs text-slate-500">Configure content, targeting, and preview real-time customer rendering.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen: Left Builder Form, Right Live Mobile Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Multi-Section Form */}
              <div className="lg:col-span-7 space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-xs">
                {/* 1. Basic Information */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">1. Basic Information</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Promotion Name *</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Promotion Type *</label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="sponsored_banner">Sponsored Offer</option>
                        <option value="scratch_card">Scratch & Win</option>
                        <option value="brand_offer">Hive Promotion</option>
                        <option value="coupon">Coupon / Reward</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Placement *</label>
                      <select
                        value={form.placement}
                        onChange={(e) => setForm({ ...form, placement: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="ORDER_SUCCESS_SPONSORED">Order Success – Sponsored Slot</option>
                        <option value="ORDER_SUCCESS_REWARD">Order Success – Reward / Scratch Slot</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Priority (1 = Highest) *</label>
                      <input
                        type="number"
                        min={1}
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Content & Creative */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">2. Content & Creative</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Headline Title *</label>
                      <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Flat 20% Off"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Description / Subtitle</label>
                      <input
                        type="text"
                        value={form.subtitle}
                        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                        placeholder="on your next purchase"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Badge / Sponsored Label</label>
                      <input
                        type="text"
                        value={form.badge}
                        onChange={(e) => setForm({ ...form, badge: e.target.value })}
                        placeholder="Sponsored · The Linen Club"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                      <input
                        type="text"
                        value={form.brandName}
                        onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                        placeholder="The Linen Club"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Creative Image URL</label>
                      <input
                        type="url"
                        value={form.creativeUrl}
                        onChange={(e) => setForm({ ...form, creativeUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Aspect Ratio</label>
                      <div className="flex gap-2">
                        {(["1:1", "3:4", "4:5", "16:9"] as const).map((ar) => (
                          <button
                            key={ar}
                            type="button"
                            onClick={() => setForm({ ...form, aspectRatio: ar })}
                            className={`flex-1 py-1.5 rounded-lg border text-center font-bold text-xs cursor-pointer ${
                              form.aspectRatio === ar
                                ? "bg-amber-500 text-slate-950 border-amber-500"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {ar}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Destination */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">3. Destination (Type-Safe)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Destination Target</label>
                      <select
                        value={form.destinationType}
                        onChange={(e) => setForm({ ...form, destinationType: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="store">Hive Store (Boutique slug)</option>
                        <option value="product">Hive Product (Product slug)</option>
                        <option value="category">Category (Vertical slug)</option>
                        <option value="promotion">Collection / Promotion slug</option>
                        <option value="external">External Website (Approved URL)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target Slug / URL</label>
                      <input
                        type="text"
                        value={form.destinationValue}
                        onChange={(e) => setForm({ ...form, destinationValue: e.target.value })}
                        placeholder={form.destinationType === "external" ? "https://..." : "e.g. the-linen-club"}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Reward Configuration (Conditional) */}
                {(form.type === "scratch_card" || form.type === "coupon") && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                    <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-600" />
                      4. Server-Issued Reward Configuration
                    </span>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed">
                      Unique coupon codes are generated and assigned server-side when customers scratch/claim. No code is leaked in public records.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Reward Title *</label>
                        <input
                          type="text"
                          value={form.rewardTitle}
                          onChange={(e) => setForm({ ...form, rewardTitle: e.target.value })}
                          placeholder="₹100 OFF"
                          className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Reward Type</label>
                        <select
                          value={form.rewardType}
                          onChange={(e) => setForm({ ...form, rewardType: e.target.value as any })}
                          className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white"
                        >
                          <option value="fixed">Fixed Discount (₹)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Discount Amount</label>
                        <input
                          type="number"
                          value={form.discountValue}
                          onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                          placeholder="100"
                          className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Hyperlocal Targeting & Frequency Limits */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">5. Targeting & Exposure Rules</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Audience</label>
                      <select
                        value={form.audience}
                        onChange={(e) => setForm({ ...form, audience: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="new_customers">New Customers</option>
                        <option value="returning_customers">Returning Customers</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Location Scope</label>
                      <select
                        value={form.locationType}
                        onChange={(e) => setForm({ ...form, locationType: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="all">All Serviceable Areas</option>
                        <option value="selected_pincodes">Specific Pincodes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Vertical</label>
                      <select
                        value={form.vertical}
                        onChange={(e) => setForm({ ...form, vertical: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="all">All Verticals</option>
                        <option value="apparel">Apparel</option>
                        <option value="footwear">Footwear</option>
                        <option value="jewellery">Jewellery</option>
                        <option value="fragrance">Fragrance</option>
                        <option value="lifestyle">Lifestyle</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-Time Mobile Preview */}
              <div className="lg:col-span-5 bg-slate-100 p-4 rounded-3xl border border-slate-200 sticky top-2 flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  Live Mobile Preview
                </div>

                {/* Mobile Screen Simulator */}
                <div className="w-full max-w-xs bg-[#FAFAF9] rounded-3xl border-4 border-slate-300 p-3 shadow-lg space-y-3 select-none">
                  {/* Mock Minimal Confirmation Header */}
                  <div className="flex justify-between items-center px-1 text-[10px] text-stone-400 font-bold border-b border-stone-200/60 pb-1.5">
                    <span>← Orders</span>
                    <span className="text-amber-500 font-black">hive·now</span>
                  </div>

                  {/* Rendered Live Preview Card */}
                  {form.type === "scratch_card" ? (
                    <div className="w-full rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/70 to-[#FDE68A]/40 border border-amber-200/80 p-3.5 shadow-2xs">
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-[9px] font-bold text-amber-900 block w-fit mb-1">
                        {form.badge || "Just for you ✨"}
                      </span>
                      <h4 className="font-black text-stone-900 text-sm leading-snug">
                        {form.title || "Scratch & Win Rewards"}
                      </h4>
                      <p className="text-[10px] text-stone-600 mt-0.5">
                        {form.subtitle || "Get a reward for your next Hive purchase."}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-stone-900 text-white text-[10px] font-bold">
                          {form.ctaText || "Scratch Now →"}
                        </span>
                        <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center text-amber-950 font-bold text-[9px] shadow-2xs border border-amber-300">
                          <Gift className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full rounded-2xl border border-stone-200 bg-white p-3 shadow-2xs flex items-center justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] font-bold tracking-wider text-stone-400 uppercase block">
                          {form.badge || "Sponsored · Brand"}
                        </span>
                        <h4 className="font-black text-stone-900 text-xs mt-0.5 leading-snug truncate">
                          {form.title || "Flat 20% Off"}
                        </h4>
                        <p className="text-[9px] text-stone-500 truncate">
                          {form.subtitle || "on your next purchase"}
                        </p>
                        <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full border border-stone-300 text-[9px] font-bold text-stone-800">
                          {form.ctaText || "Shop Now →"}
                        </span>
                      </div>
                      <div className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 shrink-0 overflow-hidden relative flex items-center justify-center">
                        {form.creativeUrl ? (
                          <Image
                            src={form.creativeUrl}
                            alt="preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 text-center text-[9px] text-stone-400">
                    Aspect Ratio: <span className="font-bold">{form.aspectRatio}</span> · Placement: <span className="font-mono">{form.placement}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleCreateSubmit("draft")}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleCreateSubmit("active")}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Publish Promotion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
