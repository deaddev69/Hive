"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  X,
  ShoppingBag,
  Navigation,
  Map,
  Home,
  Briefcase,
  Bookmark,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useLocation } from "@/context/LocationContext";
import { useCheckoutStore } from "@/store/checkout-store";
import { getEffectiveCheckoutItems } from "@/lib/getEffectiveCheckoutItems";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";

// Dynamically load the map (Leaflet requires browser, SSR disabled)
const LocationMapPicker = dynamic(
  () => import("@/components/location/LocationMapPicker"),
  { ssr: false }
);

// ── Types ──────────────────────────────────────────────────────────────────────
type Address = {
  _id: Id<"addresses">;
  label: string;
  line1?: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
  houseNumber?: string;
  landmark?: string;
  isDefault: boolean;
};

type MapResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
};

// ── Address Card Display ───────────────────────────────────────────────────────
function getDisplayLines(addr: Address): { main: string; sub?: string } {
  if (addr.formattedAddress) {
    const house = addr.houseNumber ? `${addr.houseNumber}, ` : "";
    const landmark = addr.landmark ? ` (Near ${addr.landmark})` : "";
    return {
      main: `${house}${addr.formattedAddress}${landmark}`,
      sub: addr.pincode ? `Pincode: ${addr.pincode}` : undefined,
    };
  }
  // Legacy line1/line2 format
  const lines = [addr.line1, addr.line2].filter(Boolean).join(", ");
  return {
    main: lines || addr.formattedAddress || "—",
    sub: `${addr.city}, ${addr.state} — ${addr.pincode}`,
  };
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="w-3.5 h-3.5" />,
  work: <Briefcase className="w-3.5 h-3.5" />,
  other: <Bookmark className="w-3.5 h-3.5" />,
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CheckoutAddressPage() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();

  const convexAddresses = useQuery(api.addresses.list) ?? [];
  const addAddressMutation = useMutation(api.addresses.add);
  const updateAddressMutation = useMutation(api.addresses.update);
  const removeAddressMutation = useMutation(api.addresses.remove);
  const setDefaultMutation = useMutation(api.addresses.setDefault);

  const addresses: Address[] = convexAddresses.map((a) => ({
    _id: a._id,
    label: a.label,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    lat: a.lat,
    lng: a.lng,
    formattedAddress: a.formattedAddress,
    houseNumber: a.houseNumber,
    landmark: a.landmark,
    isDefault: a.isDefault,
  }));

  const [selectedAddressId, setSelectedAddressId] = useState<Id<"addresses"> | null>(null);
  const setSelectedAddressIdInCheckout = useCheckoutStore((s) => s.setSelectedAddressId);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      if (def) {
        setSelectedAddressId(def._id);
        setSelectedAddressIdInCheckout(def._id);
      }
    }
  }, [addresses.length]);

  const handleSelectAddress = (id: Id<"addresses">) => {
    setSelectedAddressId(id);
    setSelectedAddressIdInCheckout(id);
  };

  const items = useCartStore((s) => s.items);
  const checkoutItems = useCheckoutStore((s) => s.checkoutItems);
  const { isServiceable: isGlobalServiceable } = useLocation();
  const activeZones = useQuery(api.serviceability.getActiveZones) ?? [];
  const requestService = useMutation(api.serviceability.requestService);

  const isAddressServiceable = (addr: Address) => {
    if (!addr.city) return false;
    return activeZones.some(
      (z) => z.city.trim().toLowerCase() === addr.city.trim().toLowerCase()
    );
  };

  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(1); // Step 1: Map, Step 2: Details
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  // Map & geocode state
  const [mapResult, setMapResult] = useState<MapResult | null>(null);
  const [mapLat, setMapLat] = useState(10.0261);
  const [mapLng, setMapLng] = useState(76.3082);

  // Details form state
  const [formLabel, setFormLabel] = useState("Home");
  const [formHouseNumber, setFormHouseNumber] = useState("");
  const [formLandmark, setFormLandmark] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isGlobalServiceable) {
      router.replace("/");
    }
  }, [mounted, isGlobalServiceable, router]);

  if (!mounted || !clerkLoaded) return <AddressSkeleton />;
  if (!isSignedIn) {
    router.replace("/sign-in?redirect_url=" + encodeURIComponent("/checkout/address"));
    return <AddressSkeleton />;
  }

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId) ?? null;
  const isServiceable = selectedAddress ? isAddressServiceable(selectedAddress) : false;
  const effectiveItems = getEffectiveCheckoutItems(items, checkoutItems);
  const subtotal = effectiveItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= 5000 ? 0 : 99;
  const total = subtotal + (isServiceable ? deliveryFee : 0);

  // ── Form open/close ───────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingAddress(null);
    setFormStep(1);
    setMapResult(null);
    setMapLat(10.0261);
    setMapLng(76.3082);
    setFormLabel("Home");
    setFormHouseNumber("");
    setFormLandmark("");
    setFormIsDefault(addresses.length === 0);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(addr);
    setFormStep(addr.formattedAddress ? 2 : 1); // Skip to step 2 if we already have map data
    if (addr.lat && addr.lng) {
      setMapLat(addr.lat);
      setMapLng(addr.lng);
      setMapResult({
        lat: addr.lat,
        lng: addr.lng,
        formattedAddress: addr.formattedAddress || addr.line1 || "",
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      });
    }
    setFormLabel(addr.label);
    setFormHouseNumber(addr.houseNumber || "");
    setFormLandmark(addr.landmark || "");
    setFormIsDefault(addr.isDefault);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormStep(1);
    setMapResult(null);
    setFormError("");
  };

  // ── Map callbacks ─────────────────────────────────────────────────────────
  const handleMapChange = (lat: number, lng: number) => {
    setMapLat(lat);
    setMapLng(lng);
  };

  const handleReverseGeocode = useCallback(
    (result: { formattedAddress: string; city: string; state: string; pincode: string }) => {
      setMapResult({
        lat: mapLat,
        lng: mapLng,
        ...result,
      });
    },
    [mapLat, mapLng]
  );

  // ── Step 2 form submit ────────────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!mapResult) {
      setFormError("Please select a location on the map first.");
      return;
    }
    if (!formLabel.trim()) {
      setFormError("Please enter an address label (e.g. Home, Work).");
      return;
    }
    setFormError("");
    setFormSaving(true);

    const payload = {
      label: formLabel.trim(),
      city: mapResult.city,
      state: mapResult.state,
      pincode: mapResult.pincode,
      lat: mapResult.lat,
      lng: mapResult.lng,
      formattedAddress: mapResult.formattedAddress,
      houseNumber: formHouseNumber.trim() || undefined,
      landmark: formLandmark.trim() || undefined,
      isDefault: formIsDefault,
    };

    try {
      if (editingAddress) {
        await updateAddressMutation({ addressId: editingAddress._id, ...payload });
      } else {
        const newId = await addAddressMutation(payload);
        if (newId) setSelectedAddressId(newId as Id<"addresses">);
      }
      closeForm();
    } catch (err) {
      setFormError("Failed to save address. Please try again.");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: Id<"addresses">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this address?")) {
      await removeAddressMutation({ addressId: id });
      if (selectedAddressId === id) setSelectedAddressId(null);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress) return;
    setIsSubmittingWaitlist(true);
    try {
      await requestService({ city: selectedAddress.city, state: selectedAddress.state });
      setWaitlistSuccess(true);
      setTimeout(() => { setWaitlistSuccess(false); setWaitlistEmail(""); }, 3500);
    } catch { /* silent */ } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  if (effectiveItems.length === 0) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 mx-auto">
            <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-xl font-bold text-hive-dark">Your bag is empty</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              Please add items to your cart before proceeding to shipping.
            </p>
          </div>
          <button
            onClick={() => router.push("/products")}
            className="px-6 h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2 shadow-sm"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bag
        </button>

        {/* Progress */}
        <div className="w-full bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-hive-text-muted">
          <div className="flex items-center gap-2 text-hive-dark">
            <span className="w-5 h-5 rounded-full bg-hive-dark text-hive-gold flex items-center justify-center text-[10px]">1</span>
            <span>Delivery Address</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-hive-border text-hive-text flex items-center justify-center text-[10px]">2</span>
            <span>Delivery Speed & Slot</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-hive-border text-hive-text flex items-center justify-center text-[10px]">3</span>
            <span>Secure Payment</span>
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark text-left mt-2">
          Select Delivery Address
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left items-start">

          {/* LEFT: address cards */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => {
                const isSelected = addr._id === selectedAddressId;
                const serviceable = isAddressServiceable(addr);
                const { main, sub } = getDisplayLines(addr);
                const labelKey = addr.label.toLowerCase();
                const labelIcon = LABEL_ICONS[labelKey] ?? <MapPin className="w-3.5 h-3.5" />;

                return (
                  <div
                    key={addr._id}
                    onClick={() => handleSelectAddress(addr._id)}
                    className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4 relative cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border-hive-dark ring-1 ring-hive-dark"
                        : "border-hive-border/50 hover:border-hive-border"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="selected_address"
                          checked={isSelected}
                          onChange={() => handleSelectAddress(addr._id)}
                          className="w-4 h-4 accent-hive-dark cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5 text-xs font-bold text-hive-dark">
                          {labelIcon}
                          {addr.label}
                        </span>
                      </div>
                      {addr.isDefault && (
                        <span className="text-[9px] font-extrabold uppercase bg-hive-comb text-hive-dark px-2 py-0.5 rounded-lg border border-hive-gold/15">
                          Default
                        </span>
                      )}
                    </div>

                    {/* Address text */}
                    <div className="space-y-1 text-xs text-hive-text leading-relaxed font-medium">
                      <p className="line-clamp-3">{main}</p>
                      {sub && <p className="text-hive-text-muted">{sub}</p>}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1 text-[10px] font-extrabold uppercase tracking-wide">
                      <div>
                        {serviceable ? (
                          <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200/40">
                            Serviceable
                          </span>
                        ) : (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/40">
                            Unserviceable
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => openEditForm(addr, e)}
                          className="flex items-center gap-1 text-hive-text-muted hover:text-hive-dark transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(addr._id, e)}
                          className="flex items-center gap-1 text-hive-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add new address card */}
              <button
                type="button"
                onClick={openAddForm}
                className="bg-transparent border-2 border-dashed border-hive-border hover:border-hive-gold rounded-3xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 min-h-[160px] group text-hive-text-muted hover:text-hive-dark focus:outline-none"
              >
                <Plus className="w-6 h-6 stroke-[1.8] group-hover:scale-110 transition-transform duration-300 text-hive-gold" />
                <span className="text-xs font-bold uppercase tracking-wider">Add New Address</span>
              </button>
            </div>
          </div>

          {/* RIGHT: summary + serviceability */}
          <div className="lg:col-span-4 space-y-6">

            {/* Serviceability */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Serviceability Status
              </h2>
              {selectedAddress ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-5 h-5 text-hive-gold flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-left">
                      <span className="font-extrabold text-hive-dark block">
                        Pincode: {selectedAddress.pincode}
                      </span>
                      <span className="text-hive-text-muted">
                        {selectedAddress.city}{selectedAddress.state ? `, ${selectedAddress.state}` : ""}
                      </span>
                    </div>
                  </div>
                  {isServiceable ? (
                    <div className="bg-green-50 border border-green-200 p-3.5 rounded-2xl space-y-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase bg-green-100 text-green-800 border border-green-200">
                        ✓ Serviceable Zone
                      </span>
                      <p className="text-xs font-bold text-green-700 leading-snug">
                        Same-Day Delivery Available!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl space-y-2 text-left">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200">
                          ✕ Not Available
                        </span>
                        <p className="text-xs font-extrabold text-red-700">
                          We&apos;re not in this area yet.
                        </p>
                        <p className="text-[10px] text-hive-text-muted font-medium">
                          Hive is expanding city by city. We&apos;ll let you know when we arrive!
                        </p>
                      </div>
                      <form onSubmit={handleWaitlistSubmit} className="space-y-2 pt-1 border-t border-hive-border/40">
                        <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                          Request Launch In Pincode {selectedAddress.pincode}
                        </span>
                        {!waitlistSuccess ? (
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="Your email"
                              value={waitlistEmail}
                              onChange={(e) => setWaitlistEmail(e.target.value)}
                              className="flex-1 h-9 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingWaitlist}
                              className="h-9 px-4 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 transition-all text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-sm disabled:opacity-50"
                            >
                              Notify
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            Added to waitlist! We&apos;ll notify you.
                          </div>
                        )}
                      </form>
                      <Link href="/products" className="text-xs text-center font-extrabold uppercase tracking-widest text-hive-dark hover:text-hive-amber transition-colors block border border-hive-border py-2.5 rounded-xl bg-white">
                        Back To Products
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-hive-text-muted bg-hive-gold/5 border border-hive-gold/15 p-4 rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-hive-amber flex-shrink-0" />
                  <span>Please select or add a delivery address.</span>
                </div>
              )}
            </div>

            {/* Price summary */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Price Details
              </h2>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Cart Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Boutique Delivery</span>
                  <span>{isServiceable ? (deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`) : "₹0"}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Estimated Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedAddress || !isServiceable}
                onClick={() => router.push("/checkout/delivery")}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-3 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select Delivery Slot
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Address Form Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-hive-dark/50 backdrop-blur-sm" onClick={closeForm} />

          {/* Modal */}
          <div className="bg-white border border-hive-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto relative z-10 shadow-2xl animate-[scaleUp_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">

            {/* Header */}
            <div className="flex justify-between items-center border-b border-hive-border/40 px-6 py-4 sticky top-0 bg-white z-10">
              <div className="flex flex-col">
                <h3 className="font-serif text-lg font-bold text-hive-dark">
                  {editingAddress ? "Edit Address" : "Add New Address"}
                </h3>
                <p className="text-xs text-hive-text-muted mt-0.5">
                  {formStep === 1 ? "Step 1 of 2 — Pin your location on the map" : "Step 2 of 2 — Add delivery details"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-1.5 rounded-full hover:bg-hive-border/40 text-hive-text-muted hover:text-hive-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* ── STEP 1: Map ────────────────────────────────────────────── */}
              {formStep === 1 && (
                <>
                  <LocationMapPicker
                    lat={mapLat}
                    lng={mapLng}
                    onChange={handleMapChange}
                    onReverseGeocode={handleReverseGeocode}
                    showCurrentLocation={true}
                    height="320px"
                  />

                  {/* Address preview */}
                  {mapResult && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 text-left">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <p className="font-extrabold text-green-800">Location confirmed</p>
                        <p className="text-green-700 leading-relaxed">{mapResult.formattedAddress}</p>
                        <p className="text-green-600 font-semibold">
                          {mapResult.city}{mapResult.state ? `, ${mapResult.state}` : ""} — {mapResult.pincode || "Pincode pending"}
                        </p>
                      </div>
                    </div>
                  )}

                  {!mapResult && (
                    <div className="p-4 bg-hive-cream/40 border border-hive-border/50 rounded-2xl flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-hive-amber flex-shrink-0" />
                      <p className="text-xs text-hive-text-muted font-medium">
                        Tap the map or use "Use Current Location" to pin your delivery address.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-hive-border/40">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="flex-1 h-11 border border-hive-border hover:bg-hive-dark/5 rounded-xl text-xs font-extrabold uppercase tracking-widest text-hive-text"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!mapResult}
                      onClick={() => setFormStep(2)}
                      className="flex-1 h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/90 rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP 2: Details ────────────────────────────────────────── */}
              {formStep === 2 && mapResult && (
                <>
                  {/* Location summary chip */}
                  <div
                    onClick={() => setFormStep(1)}
                    className="p-3 bg-hive-cream/60 border border-hive-border/50 rounded-xl flex items-center gap-3 cursor-pointer hover:border-hive-gold transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-hive-amber flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-hive-dark truncate">{mapResult.formattedAddress}</p>
                      <p className="text-[10px] text-hive-text-muted">{mapResult.city}, {mapResult.pincode} · Tap to change</p>
                    </div>
                    <Map className="w-4 h-4 text-hive-text-muted flex-shrink-0" />
                  </div>

                  {/* Label */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                      Address Label
                    </label>
                    <div className="flex gap-2">
                      {["Home", "Work", "Other"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormLabel(opt)}
                          className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${
                            formLabel === opt
                              ? "bg-hive-dark text-hive-gold border-hive-dark"
                              : "bg-white text-hive-text border-hive-border hover:border-hive-gold"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {!["Home", "Work", "Other"].includes(formLabel) && (
                      <input
                        type="text"
                        placeholder="Custom label (e.g. Gym, Relative)"
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        className="w-full h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                      />
                    )}
                  </div>

                  {/* House Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                      House / Flat / Door Number <span className="normal-case text-hive-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 4B, Door No. 12"
                      value={formHouseNumber}
                      onChange={(e) => setFormHouseNumber(e.target.value)}
                      className="w-full h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                    />
                  </div>

                  {/* Landmark */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                      Nearby Landmark <span className="normal-case text-hive-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Near HDFC Bank, Opp. City Mall"
                      value={formLandmark}
                      onChange={(e) => setFormLandmark(e.target.value)}
                      className="w-full h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                    />
                  </div>

                  {/* Default toggle */}
                  <div className="flex items-center gap-2 select-none text-xs font-semibold text-hive-dark">
                    <input
                      id="form-default"
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="w-4 h-4 accent-hive-dark cursor-pointer"
                    />
                    <label htmlFor="form-default" className="cursor-pointer">
                      Make this my default delivery address
                    </label>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {formError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-hive-border/40">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="h-11 px-5 border border-hive-border hover:bg-hive-dark/5 rounded-xl text-xs font-extrabold uppercase tracking-widest text-hive-text"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      disabled={formSaving}
                      onClick={handleSaveAddress}
                      className="flex-1 h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/90 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-sm disabled:opacity-50"
                    >
                      {formSaving ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function AddressSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="h-4 w-24 bg-hive-comb/10 rounded-lg" />
        <div className="h-14 w-full bg-white border border-hive-border/20 rounded-3xl" />
        <div className="h-8 w-60 bg-hive-comb/15 rounded-xl mt-4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[220px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
