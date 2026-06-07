"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { Loader2, Store, Phone, Mail, MapPin, Shield, CheckCircle2, UploadCloud } from "lucide-react";
import dynamic from "next/dynamic";

const BoutiqueMap = dynamic(() => import("../../../components/BoutiqueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full rounded-2xl bg-hive-cream/30 border border-hive-border flex items-center justify-center gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-hive-amber" />
      <span className="text-xs text-hive-text-muted font-bold">Loading map view...</span>
    </div>
  ),
});

export default function BoutiqueProfile() {
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const updateBoutiqueProfile = useMutation(api.boutiques.updateBoutiqueProfile);
  const generateUploadUrl = useMutation(api.products.generateBoutiqueUploadUrl);

  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  
  // Image states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoStorageId, setLogoStorageId] = useState<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverStorageId, setCoverStorageId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  // Sync details when boutique query resolves
  useEffect(() => {
    if (boutique) {
      setPhone(boutique.phone || boutique.phoneNumber || "");
      setDescription(boutique.description || "");
      setLogoPreview(boutique.logoUrl || null);
      setCoverPreview(boutique.bannerUrl || null);
      setLogoStorageId(boutique.logoUrl || null);
      setCoverStorageId(boutique.bannerUrl || null);
    }
  }, [boutique]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Logo image is too large. Max 5MB.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Cover image is too large. Max 5MB.");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadFileToConvex = async (file: File): Promise<string> => {
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    return storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadMsg("Saving your updates...");

    try {
      let finalLogo = logoStorageId;
      let finalCover = coverStorageId;

      if (logoFile) {
        setUploadMsg("Uploading Boutique Logo...");
        finalLogo = await uploadFileToConvex(logoFile);
        setLogoStorageId(finalLogo);
        setLogoFile(null);
      }

      if (coverFile) {
        setUploadMsg("Uploading Cover Banner...");
        finalCover = await uploadFileToConvex(coverFile);
        setCoverStorageId(finalCover);
        setCoverFile(null);
      }

      await updateBoutiqueProfile({
        phone,
        description,
        logoUrl: finalLogo || undefined,
        bannerUrl: finalCover || undefined,
      });

      alert("Profile updated successfully!");
    } catch (err: any) {
      alert("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
      setUploadMsg("");
    }
  };

  if (boutique === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left">
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Profile</h1>
        <p className="text-sm text-hive-text-muted">Manage your designer boutique details, logo representation, and service parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Editable Settings (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-6">
          <Card className="border border-hive-border bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
              Customize Presentation
            </h3>

            {/* Logo and Cover Side-by-Side Uplod */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Logo (4 cols) */}
              <div className="md:col-span-4 flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Logo Representation</label>
                <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-hive-border hover:border-hive-gold flex items-center justify-center overflow-hidden bg-slate-50 cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover animate-fade-in" />
                  ) : (
                    <Store className="w-8 h-8 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                    Replace
                  </div>
                </div>
              </div>

              {/* Cover Image (8 cols) */}
              <div className="md:col-span-8 flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Storefront Banner</label>
                <div className="relative w-full h-28 rounded-2xl border-2 border-dashed border-hive-border hover:border-hive-gold flex items-center justify-center overflow-hidden bg-slate-50 cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="Cover Banner" className="w-full h-full object-cover animate-fade-in" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-1.5">
                      <UploadCloud className="w-6 h-6" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Upload Cover</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                    Replace Cover Banner
                  </div>
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Public Contact Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Boutique Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your brand story, fabric sourcing focus, and design choices..."
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 resize-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="mt-2 py-3 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {uploadMsg}
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </Card>
        </form>

        {/* Right Side: Read-only Settings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="border border-hive-border bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
              Registration Meta
            </h3>

            <div className="flex flex-col gap-4 text-xs">
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Boutique Name</span>
                <span className="font-extrabold text-hive-dark">{boutique.boutiqueName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Owner Name</span>
                <span className="font-extrabold text-hive-dark">{boutique.ownerName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Email</span>
                <span className="font-extrabold text-hive-dark">{boutique.email}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Delivery Radius</span>
                <span className="font-extrabold text-hive-dark">{boutique.deliveryRadiusKm} Km</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Verification Status</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              </div>

              <div className="flex flex-col gap-1 text-left py-2">
                <span className="font-bold text-hive-text-muted">Physical Registered Address</span>
                <span className="font-semibold text-slate-700 leading-normal">{boutique.address}</span>
              </div>

              {/* Map Coordinates display */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-hive-text-muted flex justify-between">
                  <span>Coordinates</span>
                  <span className="font-mono text-[10px] text-hive-amber">
                    Lat: {boutique.latitude.toFixed(6)}, Lng: {boutique.longitude.toFixed(6)}
                  </span>
                </span>
                <BoutiqueMap lat={boutique.latitude} lng={boutique.longitude} readOnly={true} />
              </div>

            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
