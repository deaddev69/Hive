"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { ArrowLeft, Loader2, Save, Store, MapPin } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Load BoutiqueMap dynamically with SSR disabled to prevent Leaflet window reference crashes during Next.js builds.
const BoutiqueMap = dynamic(() => import("@/components/BoutiqueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] w-full rounded-2xl bg-hive-cream/30 border border-hive-border flex items-center justify-center gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-hive-amber" />
      <span className="text-xs text-hive-text-muted font-bold">Loading interactive map container...</span>
    </div>
  ),
});

export default function EditBoutiquePage() {
  const params = useParams();
  const router = useRouter();
  const boutiqueId = params.id as string;

  console.log("[EditBoutiquePage] Initialized with boutiqueId:", boutiqueId);

  // Fetch boutique details
  const boutique = useQuery(api.boutiques.getBoutiqueById, { id: boutiqueId as any });
  const updateBoutique = useMutation(api.boutiques.updateBoutique);

  // Form State
  const [boutiqueName, setBoutiqueName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(17.385044);
  const [longitude, setLongitude] = useState(78.486671);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(10);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [city, setCity] = useState("Kochi");
  const [state, setState] = useState("Kerala");
  const [pincode, setPincode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prepopulate form when boutique query completes
  useEffect(() => {
    if (boutique) {
      console.log("[EditBoutiquePage] Boutique details loaded successfully:", boutique);
      setBoutiqueName(boutique.boutiqueName);
      setOwnerName(boutique.ownerName);
      setEmail(boutique.email);
      setPhone(boutique.phone);
      setAddress(boutique.address);
      setLatitude(boutique.latitude);
      setLongitude(boutique.longitude);
      setDeliveryRadiusKm(boutique.deliveryRadiusKm);
      setDescription(boutique.description);
      setStatus(boutique.status);
      setCity(boutique.city || boutique.addressDetails?.city || "Kochi");
      setState(boutique.state || boutique.addressDetails?.state || "Kerala");
      setPincode(boutique.pincode || boutique.addressDetails?.pincode || "");
    }
  }, [boutique]);

  const handleCoordinatesChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSelectPlace = (place: any) => {
    setAddress(place.address || "");
    setCity(place.city || "Kochi");
    setState(place.state || "Kerala");
    setPincode(place.pincode || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (latitude === 0 || longitude === 0) {
      alert("Error: Geolocation coordinates are mandatory. Please pin the boutique on the map.");
      return;
    }

    setSubmitting(true);
    console.log("[EditBoutiquePage] Submitting update request for ID:", boutiqueId, {
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

    try {
      await updateBoutique({
        id: boutiqueId as any,
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
      });
      console.log("[EditBoutiquePage] Update successful!");
      alert("Boutique profile updated successfully!");
      router.push("/admin/boutiques");
    } catch (err: any) {
      console.error("[EditBoutiquePage] Save failed:", err);
      alert("Failed to save boutique profile: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (boutique === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading boutique details...</p>
      </div>
    );
  }

  if (boutique === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Store className="w-10 h-10 text-red-400" />
        <h2 className="text-lg font-serif font-bold text-hive-dark">Boutique Not Found</h2>
        <p className="text-xs text-hive-text-muted max-w-sm">
          No boutique registration matches the provided ID: <code className="bg-slate-100 px-1 rounded">{boutiqueId}</code>.
        </p>
        <Link href="/admin/boutiques" className="text-xs underline text-hive-amber mt-2">
          Back to boutiques registry
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <Link href="/admin/boutiques" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Edit Boutique Profile</h1>
          <p className="text-sm text-hive-text-muted">Update contact details, map coordinates, delivery radius, and approval verification status.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="bg-white border border-hive-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <h2 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60 flex items-center gap-2">
            <Store className="w-5 h-5 text-hive-amber" />
            <span>Profile Editor: {boutique.boutiqueName}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Boutique Name</label>
              <input
                type="text"
                required
                value={boutiqueName}
                onChange={(e) => setBoutiqueName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 font-semibold text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Owner Name</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
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
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
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
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Boutique Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 resize-none text-slate-800 leading-relaxed"
            />
          </div>

          {/* Map picker container */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted flex justify-between">
              <span>Boutique Location Coordinates</span>
              <span className="font-mono text-[10px] text-hive-amber font-extrabold">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Pincode</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-hive-cream/10 text-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:max-w-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Verification Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-sm bg-white font-bold text-slate-800"
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
              className="flex items-center justify-center gap-2 py-3 px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </Button>
            
            <Link href="/admin/boutiques">
              <Button type="button" variant="outline" className="py-3 px-6">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
