"use client";
// Force Vercel rebuild to inject newly deployed environment variables (Google Maps Keys)

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { Plus, Edit3, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Loader2, Search, MapPin, Store, Mail, FileDown, Users, ShieldCheck } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Load BoutiqueMap dynamically with SSR disabled to prevent Leaflet window reference crashes during Next.js builds.
const BoutiqueMap = dynamic(() => import("../../../components/BoutiqueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full rounded-2xl bg-hive-cream/30 border border-hive-border flex items-center justify-center gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-hive-amber" />
      <span className="text-xs text-hive-text-muted font-bold">Loading interactive map container...</span>
    </div>
  ),
});

export default function AdminBoutiquesPage() {
  const boutiques = useQuery(api.boutiques.getBoutiques, { excludeTestData: true });
  
  const createBoutique = useMutation(api.boutiques.createBoutique);
  const approveBoutique = useMutation(api.boutiques.approveBoutique);
  const rejectBoutique = useMutation(api.boutiques.rejectBoutique);
  const suspendBoutique = useMutation(api.boutiques.suspendBoutique);
  const softDeleteBoutique = useMutation(api.boutiques.softDeleteBoutique);
  const resendInvite = useMutation(api.boutiques.resendBoutiqueInvite);

  const [resendingId, setResendingId] = useState<string | null>(null);

  // Form State
  const [boutiqueName, setBoutiqueName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [staffEmail1, setStaffEmail1] = useState("");
  const [staffEmail2, setStaffEmail2] = useState("");
  const [staffPhone1, setStaffPhone1] = useState("");
  const [staffPhone2, setStaffPhone2] = useState("");
  const [razorpayAccountId, setRazorpayAccountId] = useState("");
  
  // Coordinates (latitude and longitude) are mandatory
  const [latitude, setLatitude] = useState<number>(9.9816);
  const [longitude, setLongitude] = useState<number>(76.2999);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(10);
  // Address Components (Required by backend createBoutique mutation)
  const [city, setCity] = useState("Ernakulam");
  const [state, setState] = useState("Kerala");
  const [pincode, setPincode] = useState("682011");

  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);

  // Search filter for boutique list
  const [searchTerm, setSearchTerm] = useState("");

  const resetForm = () => {
    setBoutiqueName("");
    setOwnerName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setStaffEmail1("");
    setStaffEmail2("");
    setStaffPhone1("");
    setStaffPhone2("");
    setRazorpayAccountId("");
    setCity("Ernakulam");
    setState("Kerala");
    setPincode("682011");
    setLatitude(9.9816);
    setLongitude(76.2999);
    setDeliveryRadiusKm(10);
    setDescription("");
    setStatus("PENDING");
  };

  const handleCoordinatesChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSelectPlace = (place: any) => {
    setAddress(place.address || "");
    setCity(place.city || "Ernakulam");
    setState(place.state || "Kerala");
    setPincode(place.pincode || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation check: Coordinates are mandatory
    if (latitude === 0 || longitude === 0) {
      alert("Error: Geolocation coordinates are mandatory. Please pin your boutique on the map.");
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (staffPhone1 && !phoneRegex.test(staffPhone1)) {
      alert("Staff WhatsApp 1 must be a valid E.164 phone number (e.g. +919876543210)");
      return;
    }
    if (staffPhone2 && !phoneRegex.test(staffPhone2)) {
      alert("Staff WhatsApp 2 must be a valid E.164 phone number (e.g. +919876543210)");
      return;
    }

    const trimmedAccountId = razorpayAccountId.trim();
    if (trimmedAccountId && !trimmedAccountId.startsWith("acc_")) {
      alert("Razorpay Linked Account ID must start with \"acc_\". Example: acc_TLcH6m3i3GBI2n");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBoutique({
        boutiqueName,
        ownerName,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        deliveryRadiusKm,
        description,
        status,
        staffEmail1: staffEmail1 || undefined,
        staffEmail2: staffEmail2 || undefined,
        staffPhone1: staffPhone1 || undefined,
        staffPhone2: staffPhone2 || undefined,
        razorpayAccountId: trimmedAccountId || undefined,
      });
      const claimLink = `https://seller.hivenow.in/invite/${result.rawToken}`;
      prompt(
        "Boutique created successfully!\n\nCopy this Invite Link to send to the merchant manually:",
        claimLink
      );
      resetForm();
    } catch (err: any) {
      const errorMessage = err?.data || err?.message || "Unknown error";
      alert("Failed to save boutique profile: " + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, action: "APPROVE" | "REJECT" | "SUSPEND" | "DELETE") => {
    try {
      if (action === "APPROVE") {
        await approveBoutique({ id: id as any });
      } else if (action === "REJECT") {
        await rejectBoutique({ id: id as any });
      } else if (action === "SUSPEND") {
        await suspendBoutique({ id: id as any, suspensionReason: "Suspended by Admin operator" });
      } else if (action === "DELETE") {
        if (window.confirm("Are you sure you want to delete this boutique? Its data will remain in the DB as a backup, but it will disappear from this panel.")) {
          await softDeleteBoutique({ id: id as any });
        }
      }
    } catch (err: any) {
      const errorMessage = err?.data || err?.message || "Unknown error";
      alert(`Failed to set boutique status to ${action}: ` + errorMessage);
    }
  };

  const handleResendInvite = async (boutiqueId: any) => {
    setResendingId(boutiqueId);
    try {
      await resendInvite({ boutiqueId });
      alert("Onboarding email dispatched via Resend successfully!");
    } catch (err: any) {
      const errorMessage = err?.data || err?.message || "Unknown error";
      alert("Failed to resend onboarding email: " + errorMessage);
    } finally {
      setResendingId(null);
    }
  };

  if (boutiques === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading boutiques registry...</p>
      </div>
    );
  }

  // Filter list
  const filteredBoutiques = boutiques.filter((b: any) =>
    b.boutiqueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCsv = () => {
    if (!boutiques || boutiques.length === 0) return;
    const headers = [
      "Boutique Name",
      "Owner Name",
      "Owner Email",
      "Owner Phone",
      "Status",
      "Store Status",
      "Staff 1 Email",
      "Staff 1 Phone",
      "Staff 2 Email",
      "Staff 2 Phone",
      "Notification Routing",
      "Address",
      "City",
      "Delivery Radius (km)"
    ];

    const rows = boutiques.map((b: any) => [
      `"${(b.boutiqueName || "").replace(/"/g, '""')}"`,
      `"${(b.ownerName || "").replace(/"/g, '""')}"`,
      `"${(b.ownerEmail || b.email || "").replace(/"/g, '""')}"`,
      `"${(b.phone || "").replace(/"/g, '""')}"`,
      `"${(b.status || "").replace(/"/g, '""')}"`,
      `"${(b.storeStatus || "open").replace(/"/g, '""')}"`,
      `"${(b.staffEmail1 || "").replace(/"/g, '""')}"`,
      `"${(b.staffPhone1 || "").replace(/"/g, '""')}"`,
      `"${(b.staffEmail2 || "").replace(/"/g, '""')}"`,
      `"${(b.staffPhone2 || "").replace(/"/g, '""')}"`,
      `"${(b.staffNotificationSelection || "none").replace(/"/g, '""')}"`,
      `"${(b.address || "").replace(/"/g, '""')}"`,
      `"${(b.city || "").replace(/"/g, '""')}"`,
      b.deliveryRadiusKm || 10
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `hive_merchant_staff_roster_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header back button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-black text-hive-dark">Hyperlocal Partner &amp; Staff Directory</h1>
            <p className="text-sm text-hive-text-muted">Register partners, manage staff rosters &amp; order notification routing.</p>
          </div>
        </div>

        <Button
          onClick={handleExportCsv}
          variant="outline"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs shadow-xs"
        >
          <FileDown className="w-4 h-4 text-emerald-600" />
          <span>Export Roster (CSV)</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Form and Map Picker */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
            Register New Partner
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Partner Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Silk N Thread Studios"
              value={boutiqueName}
              onChange={(e) => setBoutiqueName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Owner Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Aditi Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
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
                onChange={(e) => setDeliveryRadiusKm(parseInt(e.target.value) || 10)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. aditi@silkthread.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. +919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff Email 1 (Optional)</label>
              <input
                type="email"
                placeholder="staff1@boutique.com"
                value={staffEmail1}
                onChange={(e) => setStaffEmail1(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff Email 2 (Optional)</label>
              <input
                type="email"
                placeholder="staff2@boutique.com"
                value={staffEmail2}
                onChange={(e) => setStaffEmail2(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff WhatsApp 1 (Optional)</label>
              <input
                type="text"
                placeholder="e.g. +919876543211"
                value={staffPhone1}
                onChange={(e) => setStaffPhone1(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Staff WhatsApp 2 (Optional)</label>
              <input
                type="text"
                placeholder="e.g. +919876543212"
                value={staffPhone2}
                onChange={(e) => setStaffPhone2(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Razorpay Route Account ID (Optional)</label>
            <input
              type="text"
              placeholder="acc_xxxxxxxxxxxxxx"
              value={razorpayAccountId}
              onChange={(e) => setRazorpayAccountId(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 font-mono text-slate-800 ${
                razorpayAccountId.trim() && !razorpayAccountId.trim().startsWith("acc_")
                  ? "border-red-400"
                  : "border-hive-border/60"
              }`}
            />
            <p className="text-[11px] text-hive-text-muted leading-snug">
              Paste the Razorpay Route Linked Account ID generated manually from the Razorpay Dashboard.
            </p>
            {razorpayAccountId.trim() && !razorpayAccountId.trim().startsWith("acc_") && (
              <p className="text-[11px] text-red-500 font-semibold">Must start with &quot;acc_&quot;</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Physical Address</label>
            <input
              type="text"
              required
              placeholder="e.g. MG Road, Ernakulam, Kerala"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
            />
          </div>

          {/* Map Geolocation coordinate entry */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted flex items-center justify-between">
              <span>Partner Location Coordinates</span>
              <span className="text-[10px] text-hive-amber font-extrabold font-mono">
                Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
              </span>
            </label>
            <BoutiqueMap 
              lat={latitude} 
              lng={longitude} 
              onChange={handleCoordinatesChange} 
              onSelectPlace={handleSelectPlace}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs bg-hive-cream/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs bg-hive-cream/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">Pincode</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs bg-hive-cream/10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Boutique Description</label>
            <textarea
              required
              rows={3}
              placeholder="Describe boutique couture speciality, fabric focus..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-white"
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
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
              ) : (
                "Register Boutique"
              )}
            </Button>
          </div>
        </form>

        {/* Right Side: Boutiques List Registry */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h2 className="text-lg font-serif font-bold text-hive-dark">Registrations ({boutiques.length})</h2>
            
            {/* Search filter input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search boutiques, owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold"
              />
              <Search className="w-3.5 h-3.5 text-hive-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {filteredBoutiques.length === 0 ? (
            <div className="bg-white border border-hive-border rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-hive-cream/40 flex items-center justify-center border border-hive-border/40 text-hive-text-muted">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-hive-dark font-serif">No Boutiques Found</span>
                <span className="text-xs text-hive-text-muted font-medium">Register a designer boutique to populate the list.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredBoutiques.map((boutique: any) => {
                const isApproved = boutique.status === "APPROVED";
                const isPending = boutique.status === "PENDING";
                const isRejected = boutique.status === "REJECTED";
                const isSuspended = boutique.status === "SUSPENDED";
                const isClaimed = !!boutique.ownerUserId;
                const onboardingLabel = isClaimed 
                  ? (boutique.hasAcceptedLegalTerms ? "Legal ✓" : "Needs Legal")
                  : (boutique.inviteStatus === "sent" ? "Invite Sent" : boutique.inviteStatus || "No Invite");

                return (
                  <Card key={boutique._id} className="overflow-hidden border border-hive-border bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex flex-col gap-4">
                      
                      {/* Name and status badge */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="text-left">
                          <h3 className="font-serif font-black text-hive-dark text-base">{boutique.boutiqueName}</h3>
                          <span className="text-xs text-hive-text-muted font-medium">Owner: <strong>{boutique.ownerName}</strong></span>
                        </div>

                        {/* Status Label */}
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isApproved ? "bg-green-50 text-green-700 border-green-200" :
                            isPending ? "bg-amber-50 text-amber-700 border-amber-200" :
                            isRejected ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {isApproved && <CheckCircle2 className="w-3 h-3" />}
                            {isPending && <AlertCircle className="w-3 h-3" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            <span>{boutique.status}</span>
                          </span>
                          {isApproved && !boutique.razorpayAccountId && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300" title="Approved seller is missing Razorpay Route Account ID">
                              <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                              <span>Route Account Missing</span>
                            </span>
                          )}
                          {/* Onboarding Status Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isClaimed 
                              ? (boutique.hasAcceptedLegalTerms 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-blue-50 text-blue-700 border-blue-200")
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            <span>{isClaimed ? "👤 Claimed" : "📩 " + onboardingLabel}</span>
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-hive-text/85 leading-relaxed text-left border-l-2 border-hive-border/60 pl-3.5">
                        {boutique.description}
                      </p>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-4 text-xs text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Owner Contact</span>
                          <span className="text-slate-700 truncate">{boutique.email}</span>
                          <span className="text-slate-700">{boutique.phone}</span>
                          {(boutique.staffEmail1 || boutique.staffEmail2 || boutique.staffPhone1 || boutique.staffPhone2) && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" /> Staff Roster
                                </span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                                  Routing: {boutique.staffNotificationSelection || "none"}
                                </span>
                              </div>
                              {boutique.staffEmail1 && (
                                <span className="text-slate-600 truncate text-[11px]">
                                  Staff 1: {boutique.staffEmail1} {boutique.staffPhone1 ? `(${boutique.staffPhone1})` : ""}
                                </span>
                              )}
                              {boutique.staffEmail2 && (
                                <span className="text-slate-600 truncate text-[11px]">
                                  Staff 2: {boutique.staffEmail2} {boutique.staffPhone2 ? `(${boutique.staffPhone2})` : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Serviceability &amp; Status</span>
                          <span className="text-slate-700">Radius: <strong>{boutique.deliveryRadiusKm} Km</strong></span>
                          <span className="text-slate-700">Store Mode: <strong className="capitalize">{boutique.storeStatus || "open"}</strong></span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            {boutique.latitude.toFixed(4)}, {boutique.longitude.toFixed(4)}
                          </span>
                        </div>
                        <div className="col-span-2 flex flex-col gap-1 border-t border-slate-200/60 pt-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Physical Address</span>
                          <span className="text-slate-700 leading-tight">{boutique.address}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/boutiques/${boutique._id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 hover:bg-slate-100 text-xs py-2 px-3 rounded-xl"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resendingId === boutique._id}
                            onClick={() => handleResendInvite(boutique._id)}
                            className="flex items-center gap-1 hover:bg-amber-50 text-amber-800 border-amber-200 text-xs py-2 px-3 rounded-xl font-bold bg-amber-50/40"
                          >
                            {resendingId === boutique._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                            {isClaimed ? "Send Reminder" : "Resend Email"}
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(boutique._id, "APPROVE")}
                              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-600 hover:text-white text-xs py-2 px-3 rounded-xl font-bold"
                            >
                              Approve
                            </Button>
                          )}
                          {!isRejected && isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(boutique._id, "REJECT")}
                              className="bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white text-xs py-2 px-3 rounded-xl font-bold"
                            >
                              Reject
                            </Button>
                          )}
                          {isApproved && !isSuspended && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(boutique._id, "SUSPEND")}
                              className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white text-xs py-2 px-3 rounded-xl font-bold"
                            >
                              Suspend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(boutique._id, "DELETE")}
                            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-600 hover:text-white text-xs py-2 px-3 rounded-xl font-bold ml-auto"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
