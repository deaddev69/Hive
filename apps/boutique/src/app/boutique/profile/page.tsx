"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { SignOutButton } from "@clerk/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, cn } from "@hive/ui";
import Link from "next/link";
import { Loader2, Store, Phone, Mail, MapPin, Shield, CheckCircle2, UploadCloud, LogOut, Star, Wallet, ChevronRight, ShieldCheck, Lock } from "lucide-react";
import { toast } from "@hive/utils";

export default function BoutiqueProfile() {
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const updateBoutiqueProfile = useMutation(api.boutiques.updateBoutiqueProfile);
  const me = useQuery(api.users.getMe);
  const updateBoutiqueStaff = useMutation(api.boutiques.updateBoutiqueStaff);
  const generateUploadUrl = useAction(api.media.api.generateUploadUrl);
  const commitUpload = useAction(api.media.api.commitUpload);

  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  // Editable fields
  const [boutiqueName, setBoutiqueName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(15);
  const [latitude, setLatitude] = useState(17.385);
  const [longitude, setLongitude] = useState(78.487);
  
  // Store status
  const [storeStatus, setStoreStatus] = useState<"open" | "busy" | "closed">("open");
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [pauseReason, setPauseReason] = useState<string>("other");
  const [closedUntilStr, setClosedUntilStr] = useState<string>("");

  // Operating Hours and Holidays
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("21:00");
  const [weeklyClosedDays, setWeeklyClosedDays] = useState<number[]>([]);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  
  // Image states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoStorageId, setLogoStorageId] = useState<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverStorageId, setCoverStorageId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [returnsAcceptedDefault, setReturnsAcceptedDefault] = useState(true);

  // Staff States
  const [staffEmail1, setStaffEmail1] = useState("");
  const [staffEmail2, setStaffEmail2] = useState("");
  const [staffPhone1, setStaffPhone1] = useState("");
  const [staffPhone2, setStaffPhone2] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);

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
      
      setStoreStatus(boutique.storeStatus as any || "open");
      setIsAcceptingOrders(boutique.isAcceptingOrders ?? true);
      setPauseReason(boutique.pauseReason || "other");
      if (boutique.closedUntil) {
        const date = new Date(boutique.closedUntil);
        setClosedUntilStr(date.toISOString().split("T")[0] || "");
      } else {
        setClosedUntilStr("");
      }

      setOpeningTime(boutique.openingTime || "09:00");
      setClosingTime(boutique.closingTime || "21:00");
      setWeeklyClosedDays(boutique.weeklyClosedDays || []);
      setHolidayDates(boutique.holidayDates || []);
      setReturnsAcceptedDefault(boutique.returnsAcceptedDefault !== false);
      setStaffEmail1(boutique.staffEmail1 || "");
      setStaffEmail2(boutique.staffEmail2 || "");
      setStaffPhone1((boutique as any).staffPhone1 || "");
      setStaffPhone2((boutique as any).staffPhone2 || "");
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

  const uploadFileToR2 = async (file: File, context: string) => {
    const { presignedUrl, sessionId } = await generateUploadUrl({
      mimeType: file.type,
      fileSize: file.size,
      ownerType: "boutique",
      ownerId: boutique!._id,
      context,
    });

    const result = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!result.ok) throw new Error("Failed to upload file to R2");

    return await commitUpload({ sessionId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boutique) {
      toast.error("Error: Boutique profile is not loaded yet.");
      return;
    }
    setSaving(true);
    setUploadMsg("Saving your updates...");

    try {
      let logoPayload = undefined;
      let bannerPayload = undefined;

      if (logoFile) {
        setUploadMsg("Uploading Boutique Logo...");
        logoPayload = await uploadFileToR2(logoFile, "boutique_logo");
        setLogoFile(null);
      }

      if (coverFile) {
        setUploadMsg("Uploading Cover Banner...");
        bannerPayload = await uploadFileToR2(coverFile, "boutique_banner");
        setCoverFile(null);
      }

      const payload: any = {
        phone,
        description,
        boutiqueName,
        ownerName,
        address,
        latitude,
        longitude,
        deliveryRadiusKm,
        storeStatus,
        isAcceptingOrders,
        pauseReason: (!isAcceptingOrders || storeStatus === "closed") ? (pauseReason as any) : undefined,
        closedUntil: (!isAcceptingOrders || storeStatus === "closed") && closedUntilStr 
                       ? new Date(closedUntilStr).getTime() 
                       : undefined,
        openingTime,
        closingTime,
        weeklyClosedDays,
        holidayDates,
        returnsAcceptedDefault,
      };

      if (logoPayload !== undefined) {
        payload.logoUrl = logoPayload;
      }
      if (bannerPayload !== undefined) {
        payload.bannerUrl = bannerPayload;
      }

      await updateBoutiqueProfile(payload);

      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
      setUploadMsg("");
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (staffPhone1 && !phoneRegex.test(staffPhone1)) {
      toast.error("Staff WhatsApp 1 must be a valid E.164 phone number (e.g. +919876543210)");
      return;
    }
    if (staffPhone2 && !phoneRegex.test(staffPhone2)) {
      toast.error("Staff WhatsApp 2 must be a valid E.164 phone number (e.g. +919876543210)");
      return;
    }

    setSavingStaff(true);
    try {
      await updateBoutiqueStaff({
        staffEmail1: staffEmail1 || undefined,
        staffEmail2: staffEmail2 || undefined,
        staffPhone1: staffPhone1 || undefined,
        staffPhone2: staffPhone2 || undefined,
      });
      toast.success("Staff details updated!");
      setIsEditingStaff(false);
    } catch (err: any) {
      toast.error("Failed to update staff: " + err.message);
    } finally {
      setSavingStaff(false);
    }
  };

  const handleCancelStaffEdit = () => {
    if (boutique) {
      setStaffEmail1(boutique.staffEmail1 || "");
      setStaffEmail2(boutique.staffEmail2 || "");
      setStaffPhone1((boutique as any).staffPhone1 || "");
      setStaffPhone2((boutique as any).staffPhone2 || "");
    }
    setIsEditingStaff(false);
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
        <h1 className="text-3xl font-serif font-black text-hive-dark">More & Account Hub</h1>
        <p className="text-sm text-hive-text-muted">Manage your store profile, customer feedback, and financial settlements.</p>
      </div>

      {/* Quick Management Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/boutique/reviews"
          className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-900 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#F5C22B]">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 group-hover:text-slate-900">Customer Reviews & Ratings</span>
              <span className="text-[11px] text-slate-500 font-medium">View product ratings & reply to buyers</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
        </Link>

        {me?.role !== "boutique" && (
          <Link
            href="/boutique/finance"
            className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-900 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 group-hover:text-slate-900">Earnings & Settlements</span>
                <span className="text-[11px] text-slate-500 font-medium">Track payouts, ledgers & revenue</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Editable Settings (7 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-6">
          <Card className="border border-hive-border bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
              Customize Presentation
            </h3>

            {/* Logo Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Logo Representation</label>
              <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-hive-border hover:border-[#F5C22B] flex items-center justify-center overflow-hidden bg-slate-50 cursor-pointer group">
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
                  Replace Logo
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Shop Name</label>
                <input
                  type="text"
                  required
                  value={boutiqueName}
                  onChange={(e) => setBoutiqueName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-[#F5C22B] text-sm bg-hive-cream/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Owner Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-[#F5C22B] text-sm bg-hive-cream/10"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-[#F5C22B] text-sm bg-hive-cream/10"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Delivery Radius (Km)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={deliveryRadiusKm}
                  onChange={(e) => setDeliveryRadiusKm(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-[#F5C22B] text-sm bg-hive-cream/10"
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
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-[#F5C22B] text-sm bg-hive-cream/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Brand Story</label>
                <span className={`text-[10px] font-bold ${description.length > 500 ? 'text-rose-500' : 'text-hive-text-muted/70'}`}>
                  {description.length}/500
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your boutique's story—your style philosophy, custom stitching heritage, fabric sourcing focus, and design choices..."
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-[#F5C22B] text-sm bg-hive-cream/10 resize-none"
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
                Once map coordinates are set through admin, they are locked. To change your store location, you must contact admin and send a support mail to <a href="mailto:support@hivenow.in" className="font-bold underline">support@hivenow.in</a>.
              </div>
            </div>
            {/* Store Default Return Policy Toggle Card */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <label className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Default 24-Hour Return Policy
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Choose your store's default return setting. This auto-applies when adding new products.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option A: Accept 24h Returns */}
                <div
                  onClick={() => setReturnsAcceptedDefault(true)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 text-left ${
                    returnsAcceptedDefault
                      ? "bg-emerald-50/70 border-2 border-emerald-600 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        returnsAcceptedDefault ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">Accept 24h Returns</span>
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">★ Recommended</span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      returnsAcceptedDefault ? "bg-emerald-600 text-white" : "border-2 border-slate-300"
                    }`}>
                      {returnsAcceptedDefault && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Allow buyers to request voluntary size exchanges or change-of-mind returns within 24 hours of delivery.
                  </p>
                </div>

                {/* Option B: Final Sale Default */}
                <div
                  onClick={() => setReturnsAcceptedDefault(false)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 text-left ${
                    !returnsAcceptedDefault
                      ? "bg-slate-900 text-white border-2 border-slate-900 shadow-md"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        !returnsAcceptedDefault ? "bg-slate-800 text-[#F5C22B]" : "bg-slate-100 text-slate-700"
                      }`}>
                        <Lock className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-black ${!returnsAcceptedDefault ? "text-white" : "text-slate-900"}`}>
                          Final Sale Default
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${!returnsAcceptedDefault ? "text-amber-400" : "text-slate-400"}`}>
                          No Voluntary Returns
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      !returnsAcceptedDefault ? "bg-[#F5C22B] text-slate-900" : "border-2 border-slate-300"
                    }`}>
                      {!returnsAcceptedDefault && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <p className={`text-[11px] leading-relaxed font-medium ${!returnsAcceptedDefault ? "text-slate-300" : "text-slate-600"}`}>
                    No voluntary change-of-mind returns. Damaged or wrong items remain 100% platform guaranteed.
                  </p>
                </div>
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
          {/* Card: Operational Hours & Holidays */}
          <Card className="border border-hive-border bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-serif font-bold text-hive-dark">
                Operations & Holidays
              </h3>
              <p className="text-xs text-hive-text-muted mt-0.5">Configure store timings, weekly days off, and holiday periods.</p>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Opening Time</label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full h-11 px-3 border border-hive-border rounded-xl text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Closing Time</label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full h-11 px-3 border border-hive-border rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Weekly Days Off */}
            <div className="flex flex-col gap-2 pb-4 border-b border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Weekly Days Off</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 0, label: "Sun" },
                  { value: 1, label: "Mon" },
                  { value: 2, label: "Tue" },
                  { value: 3, label: "Wed" },
                  { value: 4, label: "Thu" },
                  { value: 5, label: "Fri" },
                  { value: 6, label: "Sat" }
                ].map((day) => {
                  const isClosed = weeklyClosedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        if (isClosed) {
                          setWeeklyClosedDays(weeklyClosedDays.filter((d) => d !== day.value));
                        } else {
                          setWeeklyClosedDays([...weeklyClosedDays, day.value]);
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                        isClosed
                          ? "bg-amber-50 border-amber-200 text-amber-700 font-bold"
                          : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Holiday Manager */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Manage Holidays</label>
              
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newHoliday}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="flex-1 h-10 px-3 border border-hive-border rounded-xl text-sm"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newHoliday) return;
                    if (holidayDates.includes(newHoliday)) {
                      toast.error("Holiday date already added.");
                      return;
                    }
                    setHolidayDates([...holidayDates, newHoliday]);
                    setNewHoliday("");
                  }}
                  className="h-10 text-xs px-4"
                >
                  Add
                </Button>
              </div>

              {/* Holiday List */}
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto mt-1 pr-1">
                {holidayDates.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No holidays configured.</p>
                ) : (
                  holidayDates
                    .sort()
                    .map((date) => (
                      <div key={date} className="flex justify-between items-center bg-stone-50 border border-stone-200/60 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-stone-700">
                          {new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHolidayDates(holidayDates.filter((d) => d !== date));
                          }}
                          className="text-stone-400 hover:text-red-600 text-xs font-bold transition-all px-1.5 py-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </Card>

          {/* Card: Staff Management (Owner-only) */}
          {me?.role !== "boutique" && (
            <Card className="border border-hive-border bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-hive-dark">
                    Manage Shop Staff
                  </h3>
                  <p className="text-xs text-hive-text-muted mt-0.5 font-medium leading-relaxed">
                    Update active staff contact emails and WhatsApp numbers. Changed staff will automatically lose authentication access.
                  </p>
                </div>
                {!isEditingStaff && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingStaff(true)}
                    className="shrink-0 h-9 text-xs px-3 font-bold border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 rounded-xl"
                  >
                    Edit
                  </Button>
                )}
              </div>

              <form onSubmit={handleUpdateStaff} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3.5">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff Email 1</label>
                    <input
                      type="email"
                      placeholder="e.g. staff1@store.com"
                      value={staffEmail1}
                      onChange={(e) => setStaffEmail1(e.target.value)}
                      disabled={!isEditingStaff}
                      className="w-full h-11 px-3 border border-hive-border rounded-xl text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100 disabled:cursor-not-allowed transition-all duration-150"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff WhatsApp 1</label>
                    <input
                      type="tel"
                      placeholder="e.g. +919876543211"
                      value={staffPhone1}
                      onChange={(e) => setStaffPhone1(e.target.value)}
                      disabled={!isEditingStaff}
                      className="w-full h-11 px-3 border border-hive-border rounded-xl text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100 disabled:cursor-not-allowed transition-all duration-150"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 border-t border-slate-100 pt-3.5">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff Email 2</label>
                    <input
                      type="email"
                      placeholder="e.g. staff2@store.com"
                      value={staffEmail2}
                      onChange={(e) => setStaffEmail2(e.target.value)}
                      disabled={!isEditingStaff}
                      className="w-full h-11 px-3 border border-hive-border rounded-xl text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100 disabled:cursor-not-allowed transition-all duration-150"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff WhatsApp 2</label>
                    <input
                      type="tel"
                      placeholder="e.g. +919876543212"
                      value={staffPhone2}
                      onChange={(e) => setStaffPhone2(e.target.value)}
                      disabled={!isEditingStaff}
                      className="w-full h-11 px-3 border border-hive-border rounded-xl text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100 disabled:cursor-not-allowed transition-all duration-150"
                    />
                  </div>
                </div>

                {isEditingStaff && (
                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelStaffEdit}
                      className="flex-1 py-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingStaff}
                      className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-2xl text-xs font-bold"
                    >
                      {savingStaff && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Details
                    </Button>
                  </div>
                )}
              </form>
            </Card>
          )}

          <Card className="border border-hive-border bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
              Registration Meta
            </h3>

            <div className="flex flex-col gap-4 text-xs">
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="font-bold text-hive-text-muted">Shop Name</span>
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

              <div className="flex justify-between items-center py-2.5 border-b border-slate-100/60">
                <span className="font-bold text-hive-text-muted">Verification Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/40 shadow-[0_1px_2px_rgba(16,185,129,0.04)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Approved
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
            <SignOutButton redirectUrl="/sign-in">
              <Button 
                variant="outline" 
                className="w-full justify-center gap-2 border-[#f1f5f9] bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-800 rounded-2xl py-3 text-xs font-bold shadow-sm"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Sign Out</span>
              </Button>
            </SignOutButton>
          </div>
        </div>

      </div>
    </div>
  );
}
