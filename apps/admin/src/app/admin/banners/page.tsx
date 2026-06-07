"use client";

import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { ArrowLeft, Trash2, Edit3, Power, Upload, Check, Loader2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function AdminBannersPage() {
  const banners = useQuery(api.banners.getBanners);
  const createBanner = useMutation(api.banners.createBanner);
  const updateBanner = useMutation(api.banners.updateBanner);
  const deleteBanner = useMutation(api.banners.deleteBanner);
  const toggleBanner = useMutation(api.banners.toggleBanner);
  const generateUploadUrl = useMutation(api.banners.generateUploadUrl);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaText, setCtaText] = useState("Shop Now");
  const [ctaLink, setCtaLink] = useState("/collections");
  const [sortOrder, setSortOrder] = useState(1);
  const [active, setActive] = useState(true);

  // File State
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string> => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!result.ok) {
      throw new Error("File upload failed");
    }
    const { storageId } = await result.json();
    return storageId;
  };

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDesktopFile(file);
      setDesktopPreview(URL.createObjectURL(file));
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMobileFile(file);
      setMobilePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setCtaText("Shop Now");
    setCtaLink("/collections");
    setSortOrder((banners?.length || 0) + 1);
    setActive(true);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    if (desktopInputRef.current) desktopInputRef.current.value = "";
    if (mobileInputRef.current) mobileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let desktopImageStorageId: string | undefined = undefined;
      let mobileImageStorageId: string | undefined = undefined;

      if (desktopFile) {
        desktopImageStorageId = await uploadImage(desktopFile);
      }
      if (mobileFile) {
        mobileImageStorageId = await uploadImage(mobileFile);
      }

      if (editingId) {
        await updateBanner({
          id: editingId as any,
          title,
          subtitle,
          desktopImageStorageId,
          mobileImageStorageId,
          ctaText,
          ctaLink,
          active,
          sortOrder,
        });
        alert("Banner updated successfully!");
      } else {
        if (!desktopFile || !mobileFile) {
          alert("Please upload both desktop and mobile images for new promotional slides.");
          setSubmitting(false);
          return;
        }
        await createBanner({
          title,
          subtitle,
          desktopImageStorageId,
          mobileImageStorageId,
          ctaText,
          ctaLink,
          active,
          sortOrder,
        });
        alert("Banner created successfully!");
      }
      resetForm();
    } catch (err: any) {
      alert("Error saving banner: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (banner: any) => {
    setEditingId(banner._id);
    setTitle(banner.title);
    setSubtitle(banner.subtitle);
    setCtaText(banner.ctaText);
    setCtaLink(banner.ctaLink);
    setSortOrder(banner.sortOrder);
    setActive(banner.active);
    setDesktopPreview(banner.desktopImageUrl);
    setMobilePreview(banner.mobileImageUrl);
    setDesktopFile(null);
    setMobileFile(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this promotional banner?")) {
      try {
        await deleteBanner({ id: id as any });
      } catch (err: any) {
        alert("Failed to delete banner: " + err.message);
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleBanner({ id: id as any, active: !currentStatus });
    } catch (err: any) {
      alert("Failed to toggle banner status: " + err.message);
    }
  };

  if (banners === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading banners...</p>
      </div>
    );
  }

  const sortedBanners = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Homepage Carousel Banners</h1>
          <p className="text-sm text-hive-text-muted">Manage homepage promotions, slide indicators, and background graphics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Create / Edit Banner */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
            {editingId ? "Edit Banner Slide" : "Create New Slide"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Promo Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Handloom Couture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Promo Subtitle</label>
            <input
              type="text"
              required
              placeholder="e.g. Discover curated collections with same day delivery"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">CTA Text</label>
              <input
                type="text"
                required
                placeholder="e.g. Shop Now"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">CTA Link URL</label>
              <input
                type="text"
                required
                placeholder="e.g. /collections/ethnic"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Sort Order</label>
              <input
                type="number"
                required
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 justify-center mt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-hive-border text-hive-gold focus:ring-hive-gold w-4 h-4"
                />
                <span className="text-sm font-bold text-hive-dark">Active on Home</span>
              </label>
            </div>
          </div>

          {/* Desktop image file upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Desktop Image (Landscape, Ratio ≈ 3:1)</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => desktopInputRef.current?.click()}
                className="flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Choose File
              </Button>
              <input
                type="file"
                ref={desktopInputRef}
                accept="image/*"
                onChange={handleDesktopFileChange}
                className="hidden"
              />
              <span className="text-xs text-hive-text-muted truncate max-w-[180px]">
                {desktopFile ? desktopFile.name : editingId ? "Retain existing image" : "No file selected"}
              </span>
            </div>
            {desktopPreview && (
              <div className="relative aspect-[3/1] rounded-xl overflow-hidden border border-hive-border/60 mt-1 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={desktopPreview} alt="Desktop Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Mobile image file upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Mobile Image (Compact, Ratio ≈ 2:1)</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mobileInputRef.current?.click()}
                className="flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Choose File
              </Button>
              <input
                type="file"
                ref={mobileInputRef}
                accept="image/*"
                onChange={handleMobileFileChange}
                className="hidden"
              />
              <span className="text-xs text-hive-text-muted truncate max-w-[180px]">
                {mobileFile ? mobileFile.name : editingId ? "Retain existing image" : "No file selected"}
              </span>
            </div>
            {mobilePreview && (
              <div className="relative aspect-[2/1] max-w-[180px] rounded-xl overflow-hidden border border-hive-border/60 mt-1 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mobilePreview} alt="Mobile Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-hive-border/60">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : editingId ? (
                "Update Slide"
              ) : (
                "Create Slide"
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Right List: Carousel Slides List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-hive-dark">Active Slides ({banners.length})</h2>
            <span className="text-xs text-hive-text-muted font-bold uppercase tracking-wider">Sort Order</span>
          </div>

          {sortedBanners.length === 0 ? (
            <div className="bg-white border border-hive-border rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-hive-cream/40 flex items-center justify-center border border-hive-border/40 text-hive-text-muted">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-hive-dark font-serif">No Banners Found</span>
                <span className="text-xs text-hive-text-muted font-medium">Upload promotional banner slides using the creation form.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {sortedBanners.map((banner) => (
                <Card key={banner._id} className={`overflow-hidden border transition-all duration-200 ${banner.active ? "border-hive-border bg-white" : "border-hive-border/40 bg-hive-cream/5 opacity-70"}`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    
                    {/* Media preview and details */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="relative w-20 h-10 rounded-lg border border-hive-border/60 overflow-hidden bg-slate-50 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={banner.desktopImageUrl} alt={banner.title} className="w-full h-full object-cover" />
                      </div>
                      
                      {/* Text details */}
                      <div className="flex flex-col min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-bold text-hive-dark text-sm truncate">{banner.title}</span>
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-hive-comb/80 border border-hive-border/60 text-hive-dark">
                            Pos: {banner.sortOrder}
                          </span>
                          {banner.active ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-hive-text-muted truncate mt-0.5">{banner.subtitle}</span>
                        <span className="text-[10px] font-mono text-hive-text-muted/70 mt-1 truncate">
                          CTA: {banner.ctaText} → {banner.ctaLink}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(banner._id, banner.active)}
                        className={`w-9 h-9 p-0 rounded-xl flex items-center justify-center border ${banner.active ? "border-green-200 hover:bg-green-50 text-green-600" : "border-hive-border/60 hover:bg-hive-cream/40 text-hive-text-muted"}`}
                        title={banner.active ? "Deactivate banner" : "Activate banner"}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(banner)}
                        className="w-9 h-9 p-0 rounded-xl flex items-center justify-center border border-hive-border/60 text-hive-text hover:bg-hive-cream/40"
                        title="Edit banner"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(banner._id)}
                        className="w-9 h-9 p-0 rounded-xl flex items-center justify-center border border-red-100 text-red-500 hover:bg-red-50"
                        title="Delete banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
