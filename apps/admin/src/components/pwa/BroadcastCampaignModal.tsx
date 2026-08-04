"use client";

import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Send, Upload, X, Sparkles, CheckCircle2, Link2, AlertTriangle, Image as ImageIcon } from "lucide-react";

interface BroadcastCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastCampaignModal({ isOpen, onClose }: BroadcastCampaignModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetUrl, setTargetUrl] = useState("/");
  const [bannerUrl, setBannerUrl] = useState("");
  const [imageMode, setImageMode] = useState<"file" | "url">("file");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const broadcastNotification = useAction(api.customerPushActions.broadcastCustomerNotification);

  if (!isOpen) return null;

  // Preset Campaign Templates
  const presets = [
    {
      name: "🔥 New Stock Alert",
      title: "Fresh Kerala Handloom Styles Just Uploaded!",
      body: "Discover breathable linens & silk sarees from local Kochi boutiques.",
      link: "/collections/fresh-on-hive",
    },
    {
      name: "✨ Flash Sale",
      title: "Flash Sale: Up to 40% OFF Selected Styles!",
      body: "Limited time offer on trending boutique collections across Kochi.",
      link: "/collections/under-999",
    },
    {
      name: "🚚 Express Delivery",
      title: "Need An Outfit Today? Same-Day Delivery Active!",
      body: "Order before 2 PM for 2-hour doorstep trial & delivery in Kochi.",
      link: "/collections/going-out-today",
    },
    {
      name: "👑 Wedding Luxe",
      title: "Kochi Festive & Wedding Luxe Curation '26",
      body: "Handcrafted Zari sarees, bridal organzas & designer sherwanis.",
      link: "/collections/wedding-season",
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setTitle(preset.title);
    setBody(preset.body);
    setTargetUrl(preset.link);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setBannerUrl(data.url);
      } else {
        setUploadError(data.error || "R2 Storage upload failed. You can paste an image URL directly below.");
      }
    } catch (err: any) {
      console.error("R2 upload error:", err);
      setUploadError("Server upload error. You can paste a direct image URL below instead.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    try {
      setIsSending(true);
      setResultMessage(null);

      const res = await broadcastNotification({
        title,
        body,
        bannerUrl: bannerUrl || undefined,
        targetUrl,
      });

      if (res.success) {
        setResultMessage(`Campaign dispatched to ${res.count || 0} customer devices! 🎉`);
        setTimeout(() => {
          onClose();
          setTitle("");
          setBody("");
          setBannerUrl("");
          setResultMessage(null);
          setUploadError(null);
        }, 2000);
      } else {
        setResultMessage(`Dispatch failed: ${res.error}`);
      }
    } catch (err: any) {
      console.error("Broadcast failed:", err);
      setResultMessage(`Error sending broadcast: ${err.message || err}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg text-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Broadcast Customer Campaign</h2>
            <p className="text-xs text-zinc-400">Dispatch Push Notifications with Rich Banners to PWA Customers</p>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="mt-3 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">1-Click Campaign Presets</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-amber-500/20 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 text-[11px] font-semibold rounded-lg border border-zinc-700/60 transition cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Campaign Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🔥 Flash Sale: 50% OFF Festive Collection!"
              required
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Notification Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Shop Kerala handloom sarees before stock runs out."
              rows={2}
              required
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Click Link</label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/collections/festive or /products"
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Banner Image Section (Dual Mode: File or URL) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400">
                Rich Notification Banner
              </label>
              <div className="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700">
                <button
                  type="button"
                  onClick={() => setImageMode("file")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${imageMode === "file" ? "bg-amber-500 text-slate-950" : "text-zinc-400"}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${imageMode === "url" ? "bg-amber-500 text-slate-950" : "text-zinc-400"}`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {bannerUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/80 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt="Banner Preview" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => { setBannerUrl(""); setUploadError(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : imageMode === "file" ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-amber-500/60 rounded-2xl p-4 cursor-pointer transition-colors bg-zinc-800/30">
                <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                <span className="text-xs font-semibold text-zinc-300">
                  {isUploading ? "Uploading to Cloudflare R2..." : "Click to Upload Banner Image"}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, WebP up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or R2 public URL"
                  className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className="block text-[10px] underline font-bold mt-0.5 hover:text-amber-300"
                  >
                    Switch to Direct Image URL Paste ➔
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Push Notification Shade Preview */}
          <div className="bg-black/60 border border-zinc-800 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Mobile Push Shade Preview</span>
              <span>Just Now</span>
            </div>
            <div className="bg-zinc-800/90 rounded-xl p-3 flex gap-3 items-start border border-zinc-700/50 shadow-inner">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 shadow-xs">
                H
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Hive</span>
                  <span className="text-[9px] text-zinc-500">now</span>
                </div>
                <p className="text-xs font-bold text-white truncate mt-0.5">{title || "Campaign Title"}</p>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">{body || "Notification text description..."}</p>
                {bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bannerUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg mt-2 border border-zinc-700/60" />
                )}
              </div>
            </div>
          </div>

          {resultMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resultMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || isUploading || !title || !body}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Dispatching..." : "Dispatch Campaign 🚀"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

