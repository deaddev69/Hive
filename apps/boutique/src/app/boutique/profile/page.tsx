"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { SignOutButton } from "@clerk/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, cn } from "@hive/ui";
import { Loader2, Store, Phone, Mail, MapPin, Shield, CheckCircle2, UploadCloud, LogOut } from "lucide-react";
import { toast } from "@hive/utils";

export default function BoutiqueProfile() {
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const updateBoutiqueProfile = useMutation(api.boutiques.updateBoutiqueProfile);
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
      });

      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save profile: " + err.message);
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
        <p className="text-sm text-hive-text-muted">Manage your shop profile details, logo representation, and delivery parameters.</p>
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
                <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Shop Name</label>
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
                  onChange={(e) => setDeliveryRadiusKm(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
                />
              </div>
            </div>
            
            <div className="pt-4 mt-2 border-t border-hive-border/60">
              <h4 className="text-sm font-semibold text-hive-dark mb-3">Store Operational Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-hive-dark">Store Status</label>
                  <select 
                    value={storeStatus} 
                    onChange={(e: any) => setStoreStatus(e.target.value)}
                    className="w-full h-11 px-3 border border-hive-border bg-hive-light rounded-xl text-sm"
                  >
                    <option value="open">Open (Normal Operations)</option>
                    <option value="busy">Busy (High Volume)</option>
                    <option value="closed">Closed / Paused</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-hive-dark">Accepting New Orders?</label>
                  <select 
                    value={isAcceptingOrders ? "true" : "false"} 
                    onChange={(e: any) => setIsAcceptingOrders(e.target.value === "true")}
                    className="w-full h-11 px-3 border border-hive-border bg-hive-light rounded-xl text-sm"
                  >
                    <option value="true">Yes, accepting orders</option>
                    <option value="false">No, temporarily paused</option>
                  </select>
                </div>
              </div>
              
              {(!isAcceptingOrders || storeStatus === "closed") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-hive-dark">Reason for pausing</label>
                    <select 
                      value={pauseReason} 
                      onChange={(e: any) => setPauseReason(e.target.value)}
                      className="w-full h-11 px-3 border border-hive-border bg-hive-light rounded-xl text-sm"
                    >
                      <option value="vacation">On Vacation</option>
                      <option value="capacity">At Capacity</option>
                      <option value="festival">Festival Holiday</option>
                      <option value="restocking">Restocking Inventory</option>
                      <option value="renovation">Store Renovation</option>
                      <option value="personal">Personal Reason</option>
                      <option value="emergency">Emergency</option>
                      <option value="other">Other</option>
                    </select>
                    <p className="text-xs text-hive-text-muted mt-1">This will be shown to customers when they view your products.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-hive-dark">Reopen Date (Optional)</label>
                    <input 
                      type="date"
                      value={closedUntilStr}
                      onChange={(e) => setClosedUntilStr(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full h-11 px-3 border border-hive-border bg-hive-light rounded-xl text-sm"
                    />
                    <p className="text-xs text-hive-text-muted mt-1">We'll show customers when you'll be back.</p>
                  </div>
                </div>
              )}
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
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Shop Description</label>
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
            <SignOutButton redirectUrl="/sign-in">
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
