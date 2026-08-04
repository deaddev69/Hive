"use client";

import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Send, Upload, X, Sparkles, CheckCircle2 } from "lucide-react";

interface BroadcastCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastCampaignModal({ isOpen, onClose }: BroadcastCampaignModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetUrl, setTargetUrl] = useState("/");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const broadcastNotification = useAction(api.customerPushActions.broadcastCustomerNotification);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        setBannerUrl(data.url);
      } else {
        alert(data.error || "Failed to upload image banner.");
      }
    } catch (err) {
      console.error("R2 upload error:", err);
      alert("Failed to upload image banner to Cloudflare R2.");
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg text-white p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Broadcast Customer Campaign</h2>
            <p className="text-xs text-zinc-400">Send Rich Push Notifications with Cloudflare R2 Banners</p>
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Campaign Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🔥 Flash Sale: 50% OFF Festive Collection!"
              required
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Notification Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Shop Kerala handloom sarees before stock runs out."
              rows={3}
              required
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Click Link</label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/collections/festive or /product/123"
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Cloudflare R2 Banner Upload */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Cloudflare R2 Banner Image (2:1 Ratio Recommended)
            </label>

            {bannerUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-700/80 bg-black max-h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt="Banner Preview" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => setBannerUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-amber-500/60 rounded-2xl p-4 cursor-pointer transition-colors bg-zinc-800/30">
                <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                <span className="text-xs font-semibold text-zinc-300">
                  {isUploading ? "Uploading to Cloudflare R2..." : "Upload Rich Notification Banner"}
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
            )}
          </div>

          {/* Live Mobile Notification Shade Preview */}
          <div className="bg-black/60 border border-zinc-800 rounded-2xl p-3">
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2">
              Mobile Push Shade Preview
            </p>
            <div className="bg-zinc-800/90 rounded-xl p-3 flex gap-3 items-start border border-zinc-700/50">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0">
                H
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{title || "Notification Title"}</p>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{body || "Notification body description..."}</p>
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || isUploading || !title || !body}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? "Dispatching..." : "Dispatch Campaign 🚀"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
