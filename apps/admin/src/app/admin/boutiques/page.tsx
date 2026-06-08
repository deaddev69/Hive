"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { Plus, Edit3, CheckCircle2, XCircle, AlertCircle, ArrowLeft, Loader2, Search, MapPin, Store } from "lucide-react";
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
  const boutiques = useQuery(api.boutiques.getBoutiques);
  
  const createBoutique = useMutation(api.boutiques.createBoutique);
  const approveBoutique = useMutation(api.boutiques.approveBoutique);
  const rejectBoutique = useMutation(api.boutiques.rejectBoutique);
  const suspendBoutique = useMutation(api.boutiques.suspendBoutique);

  // Form State
  const [boutiqueName, setBoutiqueName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  // Coordinates (latitude and longitude) are mandatory
  const [latitude, setLatitude] = useState<number>(17.385044);
  const [longitude, setLongitude] = useState<number>(78.486671);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(10);
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
    setLatitude(17.385044);
    setLongitude(78.486671);
    setDeliveryRadiusKm(10);
    setDescription("");
    setStatus("PENDING");
  };

  const handleCoordinatesChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation check: Coordinates are mandatory
    if (latitude === 0 || longitude === 0) {
      alert("Error: Geolocation coordinates are mandatory. Please pin your boutique on the map.");
      return;
    }

    setSubmitting(true);
    try {
      await createBoutique({
        boutiqueName,
        ownerName,
        email,
        phone,
        address,
        latitude,
        longitude,
        deliveryRadiusKm,
        description,
        status,
      });
      alert("Boutique created and registered successfully!");
      resetForm();
    } catch (err: any) {
      alert("Failed to save boutique profile: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, action: "APPROVE" | "REJECT" | "SUSPEND") => {
    try {
      if (action === "APPROVE") {
        await approveBoutique({ id: id as any });
      } else if (action === "REJECT") {
        await rejectBoutique({ id: id as any });
      } else if (action === "SUSPEND") {
        await suspendBoutique({ id: id as any });
      }
    } catch (err: any) {
      alert(`Failed to set boutique status to ${action}: ` + err.message);
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

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Boutiques Registry</h1>
          <p className="text-sm text-hive-text-muted">Register boutique designers, confirm locations on OSM map, and manage approvals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Form and Map Picker */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
            Register New Boutique
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Boutique Name</label>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Physical Address</label>
            <input
              type="text"
              required
              placeholder="e.g. Flat 302, Road 12, Banjara Hills, Hyderabad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10"
            />
          </div>

          {/* Map Geolocation coordinate entry */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted flex items-center justify-between">
              <span>Boutique Location Coordinates</span>
              <span className="text-[10px] text-hive-amber font-extrabold font-mono">
                Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
              </span>
            </label>
            <BoutiqueMap 
              lat={latitude} 
              lng={longitude} 
              onChange={handleCoordinatesChange} 
            />
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
                      </div>

                      {/* Description */}
                      <p className="text-xs text-hive-text/85 leading-relaxed text-left border-l-2 border-hive-border/60 pl-3.5">
                        {boutique.description}
                      </p>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-4 text-xs text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Info</span>
                          <span className="text-slate-700 truncate">{boutique.email}</span>
                          <span className="text-slate-700">{boutique.phone}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Serviceability</span>
                          <span className="text-slate-700">Radius: <strong>{boutique.deliveryRadiusKm} Km</strong></span>
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
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <Link href={`/admin/boutiques/${boutique._id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 hover:bg-slate-100 text-xs py-2 px-3 rounded-xl"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                          </Button>
                        </Link>

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
