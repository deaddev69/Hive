"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { SignOutButton } from "@clerk/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { Loader2, Store, Phone, Mail, MapPin, Shield, CheckCircle2, UploadCloud, LogOut } from "lucide-react";


export default function BoutiqueProfile() {
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const updateBoutiqueProfile = useMutation(api.boutiques.updateBoutiqueProfile);
  const generateUploadUrl = useMutation(api.products.generateBoutiqueUploadUrl);

  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  // Editable fields
  const [boutiqueName, setBoutiqueName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(15);
  const [latitude, setLatitude] = useState(17.385);
  const [longitude, setLongitude] = useState(78.487);
  
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
      const resolvedLogo = typeof boutique.logoUrl === "string" ? boutique.logoUrl : (boutique.logoUrl as any)?.objectKey || null;
      const resolvedBanner = typeof boutique.bannerUrl === "string" ? boutique.bannerUrl : (boutique.bannerUrl as any)?.objectKey || null;

      setLogoPreview(resolvedLogo);
      setCoverPreview(resolvedBanner);
      setLogoStorageId(resolvedLogo);
      setCoverStorageId(resolvedBanner);

      setBoutiqueName(boutique.boutiqueName || boutique.name || "");
      setOwnerName(boutique.ownerName || "");
      setAddress(boutique.address || "");
      setDeliveryRadiusKm(boutique.deliveryRadiusKm ?? 15);
      setLatitude(boutique.latitude ?? 17.385);
      setLongitude(boutique.longitude ?? 78.487);
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
    if (!boutique) {
      alert("Error: Boutique profile is not loaded yet.");
      return;
    }
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

      const logoPayload = finalLogo ? {
        assetId: finalLogo,
        ownerType: "boutique",
        ownerId: boutique._id,
        storageProvider: "cloudflare-r2",
        bucket: "hive-media",
        objectKey: `logo_${boutique._id}.png`,
        status: "ready" as const,
        displayOrder: 1,
        width: 200,
        height: 200,
        size: 0,
        mime: "image/png",
        uploadedAt: Date.now()
      } : undefined;

      const bannerPayload = finalCover ? {
        assetId: finalCover,
        ownerType: "boutique",
        ownerId: boutique._id,
        storageProvider: "cloudflare-r2",
        bucket: "hive-media",
        objectKey: `banner_${boutique._id}.png`,
        status: "ready" as const,
        displayOrder: 1,
        width: 800,
        height: 400,
        size: 0,
        mime: "image/png",
        uploadedAt: Date.now()
      } : undefined;

      await updateBoutiqueProfile({
        phone,
        description,
        logoUrl: logoPayload,
        bannerUrl: bannerPayload,
        boutiqueName,
        ownerName,
        address,
        latitude,
        longitude,
        deliveryRadiusKm,
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Boutique Name</label>
                <input
                  type="text"
                  required
                  value={boutiqueName}
                  onChange={(e) => setBoutiqueName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Owner Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Delivery Radius (Km)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={deliveryRadiusKm}
                  onChange={(e) => setDeliveryRadiusKm(parseInt(e.target.value) || 15)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Physical Registered Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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

            {/* Map Coordinates display & pin drag */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <span className="font-bold text-hive-text-muted flex justify-between">
                <span>Coordinates</span>
                <span className="font-mono text-[10px] text-hive-amber">
                  Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                </span>
              </span>
              <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl text-xs text-amber-800 font-medium leading-relaxed">
                Once map coordinates are set through admin, they are locked. To change your store location, you must contact admin and send a support mail to <a href="mailto:myhive.in@gmail.com" className="font-bold underline">myhive.in@gmail.com</a>.
              </div>
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
                <span className="font-extrabold text-hive-dark">{boutiqueName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Owner Name</span>
                <span className="font-extrabold text-hive-dark">{ownerName}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Email</span>
                <span className="font-extrabold text-hive-dark">{boutique.email}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Delivery Radius</span>
                <span className="font-extrabold text-hive-dark">{deliveryRadiusKm} Km</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Verification Status</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              </div>

              <div className="flex flex-col gap-1 text-left py-2">
                <span className="font-bold text-hive-text-muted">Physical Registered Address</span>
                <span className="font-semibold text-slate-700 leading-normal">{address}</span>
              </div>

            </div>
          </Card>

          {/* Mobile-only Logout */}
          <div className="md:hidden mt-4">
            <SignOutButton redirectUrl="http://localhost:3000/">
              <Button 
                variant="outline" 
                className="w-full justify-center gap-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl py-3 font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </Button>
            </SignOutButton>
          </div>
        </div>

      </div>
    </div>
  );
}
