"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PremiumShoppingBag } from "@/components/shared/PremiumShoppingBag";
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
  Navigation,
  Map,
  Home,
  Briefcase,
  Bookmark,
  Loader2,
  MoreVertical,
  ArrowRightLeft,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useLocation } from "@/context/LocationContext";
import { useCheckoutStore } from "@/store/checkout-store";
import { useOrderStore } from "@/store/order-store";
import { getEffectiveCheckoutItems } from "@/lib/getEffectiveCheckoutItems";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useSessionStore } from "@/context/SessionContext";
import { calculateDistanceKm } from "@/lib/distance";
import { formatRupees } from "@hive/utils";

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
  phone?: string;
  isDefault: boolean;
  eLoc?: string;
};

type MapResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
  eLoc?: string;
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
  const { isAuthenticated, isLoading, token, user } = useSessionStore();
  const sessionLoaded = !isLoading;
  const isSignedIn = isAuthenticated;

  const { latitude: headerLat, longitude: headerLng } = useLocation();

  const convexAddresses = useQuery(api.addresses.list, { token: token || undefined }) ?? [];
  const addAddressMutation = useAction(api.addresses.add);
  const updateAddressMutation = useAction(api.addresses.update);
  const removeAddressMutation = useMutation(api.addresses.remove);
  const setDefaultMutation = useMutation(api.addresses.setDefault);
  const currentUser = user;
  const latestOrder = useOrderStore((state) => state.latestOrder);

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
    phone: a.phone,
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
  const discountAmount = useCheckoutStore((s) => s.discountAmount);
  // Do NOT default to [] — keep undefined so we know when it's still loading
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques);

  const isAddressServiceable = (addr: Address) => {
    // While boutiques are still loading, don't block the user
    if (!dbBoutiques) return true;
    if (dbBoutiques.length === 0) return true;
    const effectiveItems = getEffectiveCheckoutItems(items, checkoutItems);
    if (effectiveItems.length === 0) return true;

    for (const item of effectiveItems) {
      const boutique = dbBoutiques.find(
        (b) => b._id === (item as any).boutiqueId || b.boutiqueName === item.boutiqueName || b.name === item.boutiqueName
      );
      if (!boutique) continue;
      const bLat = boutique.latitude ?? boutique.addressDetails?.lat;
      const bLng = boutique.longitude ?? boutique.addressDetails?.lng;
      if (bLat === undefined || bLng === undefined) return false;
      const dist = calculateDistanceKm(addr.lat, addr.lng, bLat, bLng);
      if (dist > (boutique.deliveryRadiusKm ?? 15)) {
        return false;
      }
    }
    return true;
  };

  const getUnserviceableBoutiques = (addr: Address) => {
    if (!dbBoutiques || dbBoutiques.length === 0) return [];
    const effectiveItems = getEffectiveCheckoutItems(items, checkoutItems);
    const unserviceable: string[] = [];

    for (const item of effectiveItems) {
      const boutique = dbBoutiques.find(
        (b) => b._id === (item as any).boutiqueId || b.boutiqueName === item.boutiqueName || b.name === item.boutiqueName
      );
      if (!boutique) continue;
      const bLat = boutique.latitude ?? boutique.addressDetails?.lat;
      const bLng = boutique.longitude ?? boutique.addressDetails?.lng;
      if (bLat === undefined || bLng === undefined) {
        if (!unserviceable.includes(boutique.boutiqueName || boutique.name || "")) {
          unserviceable.push(boutique.boutiqueName || boutique.name || "");
        }
        continue;
      }
      const dist = calculateDistanceKm(addr.lat, addr.lng, bLat, bLng);
      if (dist > (boutique.deliveryRadiusKm ?? 15)) {
        const name = boutique.boutiqueName || boutique.name || "";
        if (!unserviceable.includes(name)) {
          unserviceable.push(name);
        }
      }
    }
    return unserviceable;
  };

  const isAddressComplete = (addr: Address) => {
    return !!(addr.houseNumber && addr.houseNumber.trim() && addr.phone && addr.phone.trim());
  };

  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
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
  const [formPhone, setFormPhone] = useState("");
  const [formLandmark, setFormLandmark] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<Id<"addresses"> | null>(null);
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);

  // ── CRITICAL FIX: set mounted=true after first render so the guard below passes ──
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── useCallback MUST be above ALL early returns (Rules of Hooks) ──
  const handleReverseGeocode = useCallback(
    (result: { formattedAddress: string; city: string; state: string; pincode: string; eLoc?: string }) => {
      setMapResult({
        lat: mapLat,
        lng: mapLng,
        ...result,
      });
    },
    [mapLat, mapLng]
  );

  if (!mounted || !sessionLoaded) return <AddressSkeleton />;

  if (!isSignedIn) {
    router.replace("/sign-in?redirect_url=" + encodeURIComponent("/checkout/address"));
    return <AddressSkeleton />;
  }

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId) ?? null;
  const isServiceable = selectedAddress ? isAddressServiceable(selectedAddress) : false;
  const orderItems = getEffectiveCheckoutItems(items, checkoutItems);
  const subtotal = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 3000 ? 0 : 99; // rupees
  const tax = 0;
  const total = subtotal + (isServiceable ? deliveryFee : 0);

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueBoutiqueNames = Array.from(
    new Set(orderItems.map((item) => item.boutiqueName).filter(Boolean))
  );
  const boutiqueText =
    uniqueBoutiqueNames.length === 1
      ? `from ${uniqueBoutiqueNames[0]}`
      : uniqueBoutiqueNames.length > 1
      ? `from ${uniqueBoutiqueNames.length} Hive Partners`
      : "";

  // ── GPS Detect ─────────────────────────────────────────────────────────────
  const handleGPSDetect = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFormError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsDetecting(true);
    setFormError("");

    const options = { enableHighAccuracy: true, timeout: 10000 };

    const successCallback = async (pos: GeolocationPosition) => {
      const { latitude: plat, longitude: plng } = pos.coords;
      setMapLat(plat);
      setMapLng(plng);
      
      try {
        const url = `/api/location/reverse?lat=${plat}&lng=${plng}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Reverse geocode failed");
        const data = await res.json();
        setMapResult({
          lat: plat,
          lng: plng,
          formattedAddress: data.formattedAddress,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          eLoc: data.eLoc,
        });
      } catch (err) {
        setFormError("Failed to resolve address details. You can still enter details manually.");
      } finally {
        setGpsDetecting(false);
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      if (options.enableHighAccuracy) {
        console.warn('[Geolocation] High accuracy failed in checkout address. Retrying with enableHighAccuracy: false...');
        navigator.geolocation.getCurrentPosition(
          successCallback,
          (err2) => {
            setGpsDetecting(false);
            setFormError("Location access denied or timeout. Please enter details manually.");
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      } else {
        setGpsDetecting(false);
        setFormError("Location access denied or timeout. Please enter details manually.");
      }
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  };

  // ── Form open/close ───────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingAddress(null);
    setMapResult(null);

    // Fallback chain: Selected header location -> Kochi city center -> Kakkanad
    const initialLat = headerLat ?? 9.9816; // Kochi city center (9.9816, 76.2999)
    const initialLng = headerLng ?? 76.2999;

    setMapLat(initialLat);
    setMapLng(initialLng);
    setFormLabel("Home");
    setFormHouseNumber("");
    setFormPhone("");
    setFormLandmark("");
    setFormIsDefault(addresses.length === 0);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(addr);
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
    setFormPhone(addr.phone || "");
    setFormLandmark(addr.landmark || "");
    setFormIsDefault(addr.isDefault);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setMapResult(null);
    setFormError("");
  };

  // ── Map change handler (not a hook) ──────────────────────────────────────
  const handleMapChange = (lat: number, lng: number) => {
    setMapLat(lat);
    setMapLng(lng);
  };

  // ── Form Save ─────────────────────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!mapResult) {
      setFormError("Please select/detect a location first.");
      return;
    }
    if (!formLabel.trim()) {
      setFormError("Please enter an address label (e.g. Home, Work).");
      return;
    }
    if (!formHouseNumber.trim()) {
      setFormError("House / Flat / Door Number is required.");
      return;
    }
    if (!formPhone.trim() || formPhone.trim().replace(/[^0-9]/g, "").length < 10) {
      setFormError("A valid 10-digit contact phone number is required.");
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
      houseNumber: formHouseNumber.trim(),
      phone: formPhone.trim(),
      landmark: formLandmark.trim() || undefined,
      isDefault: formIsDefault,
      token: token || undefined,
      eLoc: mapResult.eLoc || undefined,
    };

    try {
      if (editingAddress) {
        await updateAddressMutation({ addressId: editingAddress._id, ...payload });
      } else {
        const newId = await addAddressMutation(payload);
        if (newId) setSelectedAddressId(newId as Id<"addresses">);
      }
      closeForm();
    } catch (err: any) {
      setFormError(err.message || "Failed to save address. Please try again.");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: Id<"addresses">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this address?")) {
      await removeAddressMutation({ addressId: id, token: token || undefined });
      if (selectedAddressId === id) setSelectedAddressId(null);
    }
  };

  // Waitlist functionality removed

  if (orderItems.length === 0) {
    const lastBoutiqueId = latestOrder?.items?.[0]?.boutiqueId;
    const exploreUrl = lastBoutiqueId ? `/products?boutiqueId=${lastBoutiqueId}` : "/products";
    return (
      <div className="min-h-screen bg-hive-cream/30 py-20 px-6 flex items-center justify-center text-left animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40">
            <PremiumShoppingBag className="w-6 h-6 text-hive-gold" strokeWidth={1.5} />
          </div>
          <div className="space-y-2 text-center">
            <h1 className="font-serif text-xl font-bold text-hive-dark">Your Hive Bag is empty</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              Please add items to your Hive Bag before proceeding to shipping.
            </p>
          </div>
          <button
            onClick={() => router.push(exploreUrl)}
            className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm focus:outline-none"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hive-cream/30 py-6 sm:py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-6xl mx-auto flex flex-col gap-5 sm:gap-6 pb-24 sm:pb-0">

        {/* Editorial Header */}
        <div className="text-left space-y-1.5 mt-4">
          <h1 className="font-serif text-2xl sm:text-3xl text-hive-dark tracking-tight leading-none">
            Delivery Address
          </h1>
          <p className="text-xs text-hive-text-muted font-medium">
            Choose where you'd like your order delivered.
          </p>
        </div>

        {/* Compressed Mini Order Summary */}
        <div className="bg-white border border-hive-border/30 rounded-2xl px-4 py-2.5 shadow-sm flex items-center justify-between gap-4 h-16 overflow-hidden select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-9 h-9 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0 border border-hive-border/20 flex items-center justify-center">
              {effectiveItems[0]?.imageUrl ? (
                <img
                  src={effectiveItems[0].imageUrl}
                  alt={effectiveItems[0].name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <PremiumShoppingBag className="w-5 h-5 text-hive-text-muted" strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                {totalQuantity} ITEMS • {formatRupees(subtotal)}
              </p>
              <h2 className="text-xs font-bold text-hive-dark truncate">
                {effectiveItems[0]?.name}
                {effectiveItems.length > 1 ? ` +${effectiveItems.length - 1} more` : ""}
              </h2>
            </div>
          </div>
          <Link
            href="/cart"
            className="flex-shrink-0 text-[10px] font-extrabold text-hive-gold hover:text-hive-dark transition-colors uppercase tracking-widest flex items-center gap-0.5"
          >
            Edit Bag →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 text-left items-start">

          {/* LEFT: address cards */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => {
                const isSelected = addr._id === selectedAddressId;
                const serviceable = isAddressServiceable(addr);
                const isComplete = isAddressComplete(addr);
                const labelKey = addr.label.toLowerCase();
                const labelIcon = LABEL_ICONS[labelKey] ?? <MapPin className="w-3.5 h-3.5" />;
                const userName = (currentUser as any)?.name || currentUser?.email?.split("@")[0] || "Customer";

                return (
                  <div
                    key={addr._id}
                    onClick={() => handleSelectAddress(addr._id)}
                    className={`bg-white border rounded-2xl p-5 flex flex-col justify-between relative cursor-pointer transition-all duration-300 min-h-[135px] ${
                      isSelected
                        ? "border-hive-dark shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                        : "border-[#1C1917]/12 hover:border-hive-border/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    {/* Header: Label, Icon, Default Badge, and Menu */}
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-hive-dark flex items-center gap-1.5">
                          {labelIcon}
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[8px] font-bold tracking-[0.12em] text-hive-gold uppercase leading-none ml-2">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      
                      {/* Right-aligned select status and dropdown menu */}
                      <div className="flex items-center gap-2 relative">
                        
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === addr._id ? null : addr._id);
                            }}
                            className="p-1 hover:bg-neutral-100 rounded-full transition-colors text-hive-text-muted hover:text-hive-dark"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {openMenuId === addr._id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                              <div className="absolute right-0 mt-1 bg-white border border-hive-border/40 rounded-xl shadow-lg py-1 z-20 min-w-[90px] text-[11px] font-bold">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    openEditForm(addr, e);
                                  }}
                                  className="w-full text-left px-2.5 py-1 hover:bg-neutral-50 text-hive-text flex items-center gap-1"
                                >
                                  <Edit2 className="w-2.5 h-2.5 text-hive-text-muted" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleDelete(addr._id, e);
                                  }}
                                  className="w-full text-left px-2.5 py-1 hover:bg-red-50 text-red-600 flex items-center gap-1"
                                >
                                  <Trash2 className="w-2.5 h-2.5 text-red-500" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Body: User details, Phone, Address Info & serviceability status */}
                    <div className="flex-1 text-[11px] text-hive-text space-y-1.5 font-semibold">
                      <p className="font-bold text-hive-dark tracking-wide">
                        {userName}
                        {addr.phone && <span className="font-normal text-hive-text-muted"> · {addr.phone}</span>}
                      </p>
                      <div className="text-[11px] text-hive-text-muted leading-relaxed font-normal">
                        <p className="line-clamp-1">
                          {addr.houseNumber ? `${addr.houseNumber}, ` : ""}
                          {addr.line1 || addr.formattedAddress || ""}
                        </p>
                        <p>{addr.city}, {addr.state} {addr.pincode}</p>
                      </div>

                      {/* Serviceability status badge inline, close to address details block */}
                      <div className="mt-1 text-[10px] font-bold">
                        {!isComplete ? (
                          <span className="text-amber-700 flex items-center gap-1 select-none font-semibold">
                            <span>⚠️</span> Incomplete Address Details
                          </span>
                        ) : !serviceable ? (
                          <span className="text-red-600 flex items-center gap-1 select-none font-semibold">
                            <span>✕</span> Unserviceable Location
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add new address card (dashed, h-14 / 56px) */}
              <button
                type="button"
                onClick={openAddForm}
                className="bg-white border border-dashed border-hive-border/60 hover:border-hive-dark rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 h-14 w-full group text-hive-text-muted hover:text-hive-dark focus:outline-none"
              >
                <Plus className="w-4 h-4 stroke-[2] group-hover:scale-110 transition-transform duration-300 text-hive-gold" />
                <span className="text-xs font-bold uppercase tracking-wider">Add Another Address</span>
              </button>
            </div>


          </div>

          {/* RIGHT: Price summary (Desktop Only) */}
          <div className="lg:col-span-4 space-y-6 hidden lg:block">
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Price Details
              </h2>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Cart Subtotal</span>
                  <span>{formatRupees(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Boutique Delivery</span>
                  <span>{isServiceable ? (deliveryFee === 0 ? "FREE" : formatRupees(deliveryFee)) : "₹0.00"}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Estimated Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    {formatRupees(total)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedAddress || !isServiceable || !isAddressComplete(selectedAddress)}
                onClick={() => router.push("/checkout/review")}
                className="w-full h-14 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 active:scale-[0.98] transition-all rounded-lg mt-3 font-semibold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Review Order →</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Summary (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 z-[999] bg-white border-t border-hive-border/30 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] lg:hidden">
        {isPriceExpanded && (
          <div className="px-5 py-4 border-b border-hive-border/20 bg-neutral-50/50 space-y-2.5 text-xs animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center text-hive-text-muted">
              <span>Cart Subtotal</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-green-700">
                <span>Discount</span>
                <span>-{formatRupees(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-hive-text-muted">
              <span>Boutique Delivery</span>
              <span>{isServiceable ? (deliveryFee === 0 ? "FREE" : formatRupees(deliveryFee)) : "₹0.00"}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <button
            type="button"
            onClick={() => setIsPriceExpanded(!isPriceExpanded)}
            className="flex flex-col text-left focus:outline-none"
          >
            <span className="text-[11px] font-bold text-hive-text-muted flex items-center gap-1">
              {totalQuantity} {totalQuantity === 1 ? "item" : "items"} {isPriceExpanded ? "↓" : "↑"}
            </span>
            <span className="text-base font-black text-hive-dark">
              {formatRupees(total)}
            </span>
          </button>

          <button
            type="button"
            disabled={!selectedAddress || !isServiceable || !isAddressComplete(selectedAddress)}
            onClick={() => router.push("/checkout/review")}
            className="flex-1 max-w-[200px] h-14 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 active:scale-[0.98] transition-all rounded-lg font-semibold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-1.5 shadow-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Review Order →</span>
          </button>
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
                  {editingAddress ? "Edit Address" : "Pin your delivery location"}
                </h3>
                <p className="text-xs text-hive-text-muted mt-0.5">
                  Pin your location and enter delivery details below
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

            <div className="px-6 py-5 space-y-4">
              
              {/* GPS Auto-Detect Button */}
              <button
                type="button"
                onClick={handleGPSDetect}
                disabled={gpsDetecting}
                className="w-full h-14 bg-white border border-hive-gold text-hive-dark hover:bg-hive-cream/40 font-semibold uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-2 rounded-lg transition-all select-none disabled:opacity-50"
              >
                {gpsDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Detecting Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Auto-Detect My Location (GPS)</span>
                  </>
                )}
              </button>

              {/* Address Label */}
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

              {/* House Number & Phone Number Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* House Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Flat / House / Door Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 4B, Door No. 12"
                    value={formHouseNumber}
                    onChange={(e) => setFormHouseNumber(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>
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

              {/* Location display if geocoded */}
              {mapResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] space-y-0.5">
                    <p className="font-extrabold text-green-800">Pinned Location: {mapResult.city}, {mapResult.pincode}</p>
                    <p className="text-green-700 leading-relaxed truncate">{mapResult.formattedAddress}</p>
                  </div>
                </div>
              )}

              {/* Map Preview (185px) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                  Adjust Pin Location (Tap/Drag to adjust)
                </label>
                <LocationMapPicker
                  lat={mapLat}
                  lng={mapLng}
                  onChange={handleMapChange}
                  onReverseGeocode={handleReverseGeocode}
                  showCurrentLocation={false}
                  height="185px"
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
                  onClick={closeForm}
                  className="flex-1 h-14 bg-white border border-hive-gold text-hive-dark hover:bg-hive-cream/40 rounded-lg text-xs font-semibold uppercase tracking-[0.15em] focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={formSaving}
                  onClick={handleSaveAddress}
                  className="flex-1 h-14 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 active:scale-[0.98] transition-all rounded-lg text-xs font-semibold uppercase tracking-[0.15em] shadow-sm disabled:opacity-50 focus:outline-none"
                >
                  {formSaving ? "Saving..." : "Save Address"}
                </button>
              </div>
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
