"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSessionStore } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  User,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Home,
  Briefcase,
  Bookmark,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  Shield,
  Loader2,
  ShoppingBag,
  Heart,
  Bell,
  Settings,
  ArrowRight,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toTitleCase(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function LabelIcon({ label }: { label: string }) {
  if (label === "Work") return <Briefcase className="w-3.5 h-3.5" />;
  if (label === "Other") return <Bookmark className="w-3.5 h-3.5" />;
  return <Home className="w-3.5 h-3.5" />;
}

function formatAddressDisplay(addr: Address): string {
  const parts: string[] = [];
  if (addr.houseNumber) parts.push(addr.houseNumber);
  if (addr.line1) parts.push(addr.line1);
  if (addr.formattedAddress && !addr.line1) parts.push(addr.formattedAddress);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.pincode) parts.push(addr.pincode);
  if (addr.landmark) parts.push(`Near ${addr.landmark}`);
  return parts.join(", ");
}

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
  _creationTime?: number;
};

type AddressFormData = {
  label: string;
  houseNumber: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  phone: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressFormData = {
  label: "Home",
  houseNumber: "",
  line1: "",
  city: "Kochi",
  state: "Kerala",
  pincode: "",
  landmark: "",
  phone: "",
  isDefault: false,
};

const LABEL_OPTIONS = ["Home", "Work", "Other"];

// ── Reusable Field ─────────────────────────────────────────────────────────────
function Field({
  label,
  ...inputProps
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
        {label}
      </label>
      <input
        {...inputProps}
        className="w-full h-11 px-4 rounded-xl border border-[#1c1917]/[0.08] bg-[#FAF8F4]/30 text-xs font-semibold text-[#1C1917] placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#1C1917] focus:border-[#1C1917] transition-all"
      />
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirm({
  address,
  onConfirm,
  onCancel,
  deleting,
}: {
  address: Address;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1C1917]/25 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl border border-[#1c1917]/[0.08] shadow-2xl p-6 max-w-sm w-full flex flex-col gap-5 text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-[#1C1917]">Delete Address?</h3>
            <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
              This will permanently remove your <strong>{address.label}</strong> address.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-[#1c1917]/[0.08] text-xs font-bold text-[#78716C] hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Address Card ───────────────────────────────────────────────────────────────
function AddressCard({
  address,
  userName,
  onEdit,
  onDelete,
  onSetDefault,
  settingDefault,
}: {
  address: Address;
  userName: string;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  settingDefault: boolean;
}) {
  return (
    <div
      className={`relative bg-[#FFFFFF] border rounded-xl p-6 flex flex-col justify-between min-h-[190px] transition-all duration-300 ${
        address.isDefault
          ? "border-[#1C1917] shadow-sm"
          : "border-[#1c1917]/[0.08] hover:border-[#1c1917]/20"
      }`}
    >
      <div className="space-y-4">
        {/* Top row: Label & Default Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C] bg-[#1c1917]/[0.04] px-2 py-0.5 rounded">
              {address.label}
            </span>
          </div>
          {address.isDefault && (
            <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-[#D97706] bg-[#FAF8F4] border border-[#1c1917]/[0.08] px-2.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5 fill-[#D97706] text-[#D97706]" />
              Default
            </span>
          )}
        </div>

        {/* Clean Hierarchy: Name, Phone, Address */}
        <div className="space-y-2 text-left">
          {/* Recipient Name */}
          <h4 className="text-sm font-medium text-[#1C1917]">{toTitleCase(userName)}</h4>
          
          {/* Phone */}
          <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
            <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{address.phone || "No phone added"}</span>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5 text-xs text-[#78716C] pt-1">
            <MapPin className="w-3.5 h-3.5 stroke-[1.5] mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">{formatAddressDisplay(address)}</p>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1c1917]/[0.06] mt-4">
        <div>
          {!address.isDefault && (
            <button
              onClick={onSetDefault}
              disabled={settingDefault}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#D97706] hover:text-[#F5A623] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {settingDefault ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Star className="w-3 h-3" />
              )}
              Set Default
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-755 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Address Form Modal ─────────────────────────────────────────────────────────
function AddressFormModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: AddressFormData;
  onSave: (data: AddressFormData) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AddressFormData>(initial);

  const set = (field: keyof AddressFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((prev) => ({ ...prev, [field]: val }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city.trim() || !form.state.trim() || !form.pincode.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1C1917]/25 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-[#1c1917]/[0.08] shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1c1917]/[0.08] flex items-center justify-between">
          <h3 className="text-base font-serif font-bold text-[#1C1917]">
            {initial.houseNumber || initial.line1 ? "Edit Address" : "Add Address"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F4] hover:bg-[#1c1917]/[0.04] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
              Address Label
            </label>
            <div className="flex gap-2.5">
              {LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, label: opt }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    form.label === opt
                      ? "bg-[#1C1917] text-[#F5A623] border-[#1C1917]"
                      : "bg-white text-[#78716C] border-[#1c1917]/[0.08] hover:border-[#1c1917]/20"
                  }`}
                >
                  <LabelIcon label={opt} />
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* House / Building */}
          <Field
            label="House / Flat / Building"
            placeholder="e.g. Flat 4B, Sunshine Apartments"
            value={form.houseNumber}
            onChange={set("houseNumber")}
          />

          {/* Street */}
          <Field
            label="Street / Area"
            placeholder="e.g. MG Road, Indiranagar"
            value={form.line1}
            onChange={set("line1")}
            required
          />

          {/* City + State row */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="City"
              placeholder="City"
              value={form.city}
              onChange={set("city")}
              required
            />
            <Field
              label="State"
              placeholder="State"
              value={form.state}
              onChange={set("state")}
              required
            />
          </div>

          {/* Pincode */}
          <Field
            label="Pincode"
            placeholder="6-digit pincode"
            value={form.pincode}
            onChange={set("pincode")}
            inputMode="numeric"
            maxLength={6}
            required
          />

          {/* Landmark */}
          <Field
            label="Landmark (optional)"
            placeholder="e.g. Near Metro Station"
            value={form.landmark}
            onChange={set("landmark")}
          />

          {/* Phone Number */}
          <Field
            label="Contact Phone Number"
            placeholder="e.g. +91 98765 43210"
            value={form.phone}
            onChange={set("phone")}
            required
          />

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#1c1917]/[0.08] hover:border-[#1c1917]/20 transition-colors">
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                form.isDefault
                  ? "bg-[#1C1917] border-[#1C1917]"
                  : "bg-white border-[#1c1917]/[0.08]"
              }`}
            >
              {form.isDefault && <Check className="w-3 h-3 text-[#F5A623]" />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#1C1917]">Set as default address</span>
              <span className="text-[10px] text-[#78716C] mt-0.5">Used by default during checkout</span>
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={form.isDefault}
              onChange={set("isDefault")}
            />
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-[#1C1917] hover:bg-[#1c1917]/90 text-[#F5A623] rounded-xl font-bold text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Address
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({
  addresses,
  user,
  setActiveTab,
}: {
  addresses: Address[];
  user: any;
  setActiveTab: (tab: NavId) => void;
}) {
  const router = useRouter();
  const { token } = useSessionStore();

  const SELLER_PORTAL_URL = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || "http://seller.localhost:3001";

  // Fetch boutique status
  const boutiqueSafe = useQuery(api.boutiques.getMyBoutiqueSafeCustomer, { token: token || undefined });
  const boutique = boutiqueSafe?.boutique;
  const isApprovedMerchant = boutiqueSafe?.exists && boutique && boutique.status === "APPROVED";

  const updateDisplayName = useMutation(api.users.updateProfileDisplayName);

  // Load orders to build Journey stats
  const orders = useQuery(api.orders.listMyOrders, { token: token || undefined }) || [];

  // Local Fashion Supported journey stats calculation
  const completedOrdersCount = useMemo(() => {
    return orders.filter((o: any) => o.status === "delivered" || o.status === "completed" || o.status === "received").length;
  }, [orders]);

  const uniquePartnersCount = useMemo(() => {
    const ids = orders.map((o: any) => o.boutiqueId).filter(Boolean);
    return new Set(ids).size;
  }, [orders]);



  // Member registration formatted date
  const memberSinceStr = useMemo(() => {
    if (!user?.createdAt) return "June 2026";
    return new Date(user.createdAt).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }, [user]);

  // Load preferred shopping details from localStorage
  const [defaultSize, setDefaultSize] = useState("M");
  const [prefArea, setPrefArea] = useState("Kakkanad, Kochi");
  const [prefPhone, setPrefPhone] = useState("");

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState("");

  const [isEditingArea, setIsEditingArea] = useState(false);
  const [areaVal, setAreaVal] = useState("");

  useEffect(() => {
    if (user?.name) {
      setNameVal(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSize = localStorage.getItem("hive_pref_size");
      if (storedSize) setDefaultSize(storedSize);

      const storedArea = localStorage.getItem("hive_pref_area");
      if (storedArea) {
        setPrefArea(storedArea);
        setAreaVal(storedArea);
      } else {
        const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
        if (defaultAddr) {
          const defaultStr = `${defaultAddr.city}, ${defaultAddr.state}`;
          setPrefArea(defaultStr);
          setAreaVal(defaultStr);
        }
      }

      const storedPhone = localStorage.getItem("hive_pref_phone");
      if (storedPhone) {
        setPrefPhone(storedPhone);
        setPhoneVal(storedPhone);
      } else if (user?.phone) {
        setPrefPhone(user.phone);
        setPhoneVal(user.phone);
      }
    }
  }, [addresses, user]);

  const handleSizeChange = (val: string) => {
    setDefaultSize(val);
    localStorage.setItem("hive_pref_size", val);
  };

  const handleAreaChange = (val: string) => {
    setPrefArea(val);
    localStorage.setItem("hive_pref_area", val);
  };

  const handlePhoneChange = (val: string) => {
    setPrefPhone(val);
    localStorage.setItem("hive_pref_phone", val);
  };

  // Profile completeness count out of 4
  const completedCount = useMemo(() => {
    return [
      true, // Email verified
      !!user?.name, // Profile created
      addresses.length > 0, // Address added
      !!prefPhone || !!user?.phone, // Phone added
    ].filter(Boolean).length;
  }, [user, addresses, prefPhone]);

  // Recently Viewed Local Storage shelf
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hive_recently_viewed");
      if (stored) {
        try {
          setRecentlyViewed(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const recentlyViewedDisplay = recentlyViewed.length > 0 ? recentlyViewed.slice(0, 3) : [
    { id: "rv-1", name: "Linen Kurti", boutiqueName: "Cochin Couture", price: "₹2,450", img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80" },
    { id: "rv-2", name: "Cotton Dupatta", boutiqueName: "Kakkanad Handloom", price: "₹950", img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80" },
    { id: "rv-3", name: "Relaxed Co-ord Set", boutiqueName: "Palarivattom Threads", price: "₹3,200", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80" },
  ];

  return (
    <div className="flex flex-col gap-10 text-left animate-fadeIn">
      {/* ── SECTION 1 — WELCOME HEADER (Desktop Only) ── */}
      <section className="hidden lg:block space-y-2 pb-2">
        <h1 className="text-3xl font-serif font-light text-[#1C1917] leading-tight">
          Welcome back, {toTitleCase(user?.name?.split(" ")[0]) || "Athul"} 👋
        </h1>
        <div className="flex items-center gap-2 text-xs text-[#78716C] font-medium">
          <span className="text-[#4D7C0F]">Verified Hive Member</span>
          <span className="text-[#1c1917]/[0.12]">•</span>
          <span>Supporting Local Fashion Since 2026</span>
        </div>
      </section>

      {/* ── SECTION 2 — MEMBERSHIP PROGRESS (Setup) ── */}
      <section className="bg-white border border-[#1c1917]/[0.08] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">Membership Setup</h4>
            <p className="text-xs text-[#78716C] font-medium">{completedCount} of 4 Complete</p>
          </div>
          {completedCount < 4 && (
            <button
              onClick={() => {
                if (!user?.name) {
                  setIsEditingName(true);
                  const nameCard = document.getElementById("profile-name-card");
                  if (nameCard) {
                    nameCard.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                } else if (!prefPhone && !user?.phone) {
                  setIsEditingPhone(true);
                  const phoneCard = document.getElementById("profile-phone-card");
                  if (phoneCard) {
                    phoneCard.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                } else if (addresses.length === 0) {
                  setActiveTab("addresses");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="h-10 px-4 rounded-lg bg-[#1C1917] hover:bg-[#1c1917]/90 text-white font-medium text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center self-start sm:self-center"
            >
              Complete Profile →
            </button>
          )}
        </div>
        
        {/* Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-4 border-t border-[#1c1917]/[0.04]">
          <div className="flex items-center gap-2 text-xs text-[#1C1917] font-medium">
            <span className="text-[#4D7C0F] font-bold">✓</span>
            <span>Email Verified</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#1C1917] font-medium">
            {addresses.length > 0 ? (
              <span className="text-[#4D7C0F] font-bold">✓</span>
            ) : (
              <span className="text-[#78716C] font-light">○</span>
            )}
            <span>Address Added</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#1C1917] font-medium">
            {user?.name ? (
              <span className="text-[#4D7C0F] font-bold">✓</span>
            ) : (
              <span className="text-[#78716C] font-light">○</span>
            )}
            <span>Profile Created</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#1C1917] font-medium">
            {prefPhone || user?.phone ? (
              <span className="text-[#4D7C0F] font-bold">✓</span>
            ) : (
              <span className="text-[#78716C] font-light">○</span>
            )}
            <span>Phone Number Added</span>
          </div>
        </div>
      </section>

      {/* ── SECTION 2.5 — MERCHANT ACCESS (YOUR BOUTIQUE) ── */}
      {isApprovedMerchant && boutique && (
        <section className="bg-white border border-[#1c1917]/[0.08] rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D97706] bg-[#FAF8F4] border border-[#1c1917]/[0.08] px-2.5 py-0.5 rounded-full">
              Your Boutique
            </span>
            <h4 className="text-base font-serif font-bold text-[#1C1917] pt-1">
              {boutique.boutiqueName}
            </h4>
            <p className="text-xs text-[#78716C] font-medium">
              Manage products, orders, and payouts
            </p>
          </div>
          <a
            href={SELLER_PORTAL_URL}
            className="h-10 px-5 rounded-lg bg-[#1C1917] hover:bg-[#1c1917]/90 text-[#F5A623] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center self-start sm:self-center"
          >
            Open Seller Portal
          </a>
        </section>
      )}

      {/* ── SECTION 6 — PROFILE DETAILS (Single Elegant Container) ── */}
      <section className="space-y-4 text-left">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Profile Details</h3>
        
        <div className="bg-white border border-[#1c1917]/[0.08] rounded-xl divide-y divide-[#1c1917]/[0.06] shadow-sm overflow-hidden">
          
          {/* Field 1: Full Name */}
          <div 
            id="profile-name-card"
            className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left transition-colors duration-200 hover:bg-stone-50/30"
          >
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C]">Full Name</span>
              {!isEditingName && (
                <div className="text-xs font-semibold text-[#1C1917]">
                  {user?.name || <span className="text-stone-300 italic font-normal">No name added</span>}
                </div>
              )}
            </div>
            {isEditingName ? (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!nameVal.trim()) return;
                  try {
                    await updateDisplayName({ displayName: nameVal, token: token || undefined });
                  } catch (err) {
                    console.error("Failed to update display name:", err);
                  }
                  setIsEditingName(false);
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <input 
                  type="text" 
                  value={nameVal} 
                  onChange={(e) => setNameVal(e.target.value)}
                  className="bg-[#FAF8F4]/30 border border-[#1c1917]/[0.1] rounded px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#1C1917] flex-1 sm:w-64"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-[#1C1917] text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-stone-850 cursor-pointer"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setNameVal(user?.name || "");
                    setIsEditingName(false);
                  }}
                  className="px-2 py-1.5 border border-[#1c1917]/[0.15] text-[#78716C] rounded text-[10px] font-bold uppercase hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setIsEditingName(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer self-start sm:self-center"
              >
                {user?.name ? "Edit" : "Add name →"}
              </button>
            )}
          </div>

          {/* Field 2: Email */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left transition-colors duration-200 hover:bg-stone-50/30">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C]">Email</span>
              <div className="text-xs font-semibold text-[#1C1917] break-all">{user?.email || "—"}</div>
            </div>
          </div>

          {/* Field 3: Phone */}
          <div 
            id="profile-phone-card"
            className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left transition-colors duration-200 hover:bg-stone-50/30"
          >
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C]">Phone Number</span>
              {!isEditingPhone && (
                <div className="text-xs font-semibold text-[#1C1917]">
                  {prefPhone || <span className="text-stone-300 italic font-normal">No phone added</span>}
                </div>
              )}
            </div>
            {isEditingPhone ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePhoneChange(phoneVal);
                  setIsEditingPhone(false);
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <input 
                  type="text" 
                  value={phoneVal} 
                  onChange={(e) => setPhoneVal(e.target.value)}
                  className="bg-[#FAF8F4]/30 border border-[#1c1917]/[0.1] rounded px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#1C1917] flex-1 sm:w-64"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-[#1C1917] text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-stone-850 cursor-pointer"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setPhoneVal(prefPhone);
                    setIsEditingPhone(false);
                  }}
                  className="px-2 py-1.5 border border-[#1c1917]/[0.15] text-[#78716C] rounded text-[10px] font-bold uppercase hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setIsEditingPhone(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer self-start sm:self-center"
              >
                {prefPhone ? "Edit" : "Add phone number →"}
              </button>
            )}
          </div>

          {/* Field 4: Preferred Delivery Area */}
          <div 
            id="profile-area-card"
            className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left transition-colors duration-200 hover:bg-stone-50/30"
          >
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C]">Preferred Delivery Area</span>
              {!isEditingArea && (
                <div className="text-xs font-semibold text-[#1C1917]">
                  {prefArea || <span className="text-stone-300 italic font-normal">No delivery area added</span>}
                </div>
              )}
            </div>
            {isEditingArea ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAreaChange(areaVal);
                  setIsEditingArea(false);
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <input 
                  type="text" 
                  value={areaVal} 
                  onChange={(e) => setAreaVal(e.target.value)}
                  className="bg-[#FAF8F4]/30 border border-[#1c1917]/[0.1] rounded px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#1C1917] flex-1 sm:w-64"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-[#1C1917] text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-stone-850 cursor-pointer"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setAreaVal(prefArea);
                    setIsEditingArea(false);
                  }}
                  className="px-2 py-1.5 border border-[#1c1917]/[0.15] text-[#78716C] rounded text-[10px] font-bold uppercase hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setIsEditingArea(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer self-start sm:self-center"
              >
                {prefArea ? "Edit" : "Add delivery area →"}
              </button>
            )}
          </div>

          {/* Field 5: Default Size */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left transition-colors duration-200 hover:bg-stone-50/30">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C]">Default Size</span>
              <div className="flex items-center gap-1.5">
                <select 
                  value={defaultSize} 
                  onChange={(e) => handleSizeChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#1C1917] focus:outline-none cursor-pointer pr-4 appearance-none hover:underline"
                >
                  {["XS", "S", "M", "L", "XL", "XXL", "Free"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <span className="text-[9px] text-[#78716C] font-bold uppercase tracking-widest self-start sm:self-center">Select size</span>
          </div>

          {/* Field 6: Account Status */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left transition-colors duration-200 hover:bg-stone-50/30">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C]">Account Status</span>
              <span className="text-xs font-bold text-[#4D7C0F] flex items-center gap-1.5 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4D7C0F]" />
                Verified Hive Member
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ── SECTION 3 — YOUR HIVE JOURNEY ── */}
      <section className="space-y-4 text-left">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Your Hive Journey</h3>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-[#1c1917]/[0.08]">
          <div className="flex flex-wrap gap-x-12 gap-y-6 items-baseline">
            <div className="space-y-0.5">
              <div className="text-4xl font-sans font-light text-[#1C1917] tracking-tight">{completedOrdersCount}</div>
              <div className="text-xs text-[#78716C] font-medium tracking-wide">Orders Completed</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-4xl font-sans font-light text-[#1C1917] tracking-tight">{uniquePartnersCount}</div>
              <div className="text-xs text-[#78716C] font-medium tracking-wide">Partners Supported</div>
            </div>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#78716C] mt-2 md:mt-0">
            Member Since {memberSinceStr}
          </div>
        </div>

        {/* Empty state supportive copy */}
        {completedOrdersCount === 0 && (
          <p className="text-xs text-[#78716C] leading-relaxed max-w-xl font-medium pt-1">
            Your journey with local fashion starts here. Explore curated pieces from independent Hive Partners across your city.
          </p>
        )}
      </section>

      {/* ── SECTION 4 — YOUR IMPACT ── */}
      <section className="bg-[#FAF8F4] border-l border-[#D97706] p-8 text-left space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Your Impact</span>
        <h3 className="text-lg font-serif font-light text-[#1C1917] leading-relaxed max-w-2xl">
          {uniquePartnersCount > 0 ? (
            <>
              You have supported {uniquePartnersCount} Local Fashion {uniquePartnersCount === 1 ? "Business" : "Businesses"} through Hive.
            </>
          ) : (
            <>
              Explore verified independent designers across your city. Every purchase supports local creative entrepreneurship.
            </>
          )}
        </h3>
        {uniquePartnersCount > 0 && (
          <p className="text-xs text-[#78716C] leading-relaxed max-w-xl font-medium">
            Supporting independent designers helps build a thriving creative community.
          </p>
        )}
      </section>

      {/* ── SECTION 5 — RECENTLY VIEWED (Horizontal Scroll) ── */}
      <section className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Recently Viewed</h3>
          {recentlyViewed.length === 0 && (
            <span className="text-[10px] text-[#78716C] font-normal italic">Curated pieces are waiting for you.</span>
          )}
        </div>

        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x snap-mandatory">
          {recentlyViewedDisplay.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className="w-[200px] sm:w-[220px] flex-shrink-0 snap-start space-y-3 group cursor-pointer" 
              onClick={() => {
                if (item.slug) {
                  router.push(`/products/${item.slug}`);
                } else {
                  router.push("/products");
                }
              }}
            >
              <div className="relative aspect-[3/4] bg-[#FAF8F4] rounded-lg overflow-hidden border border-[#1c1917]/[0.08]">
                <img 
                  src={item.img || item.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80"} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                />
              </div>
              <div className="text-left space-y-1">
                <p className="text-xs font-serif font-medium text-[#1C1917] group-hover:underline truncate">{item.name}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#78716C] truncate">{item.boutiqueName || item.partnerName}</p>
                <p className="text-xs font-semibold text-[#1C1917]">{typeof item.price === "number" ? `₹${item.price.toLocaleString("en-IN")}` : item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 7 — CONTINUE EXPLORING ── */}
      <section className="space-y-4 text-left">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Continue Exploring</h3>
        <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Browse New Arrivals →",
              desc: "Latest seasonal collections from Kochi",
              img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
              url: "/products",
            },
            {
              title: "Discover Local Partners →",
              desc: "Explore verified independent designers",
              img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
              url: "/products",
            },
            {
              title: "View Wishlist →",
              desc: "Return to your curated collection",
              img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
              url: "/wishlist",
            },
          ].map((card, idx) => (
            <Link 
              key={idx} 
              href={card.url}
              className="relative block w-full h-[200px] md:aspect-[4/3] md:h-auto rounded-xl overflow-hidden group shadow-sm active:scale-[0.99] transition-all border border-[#1c1917]/[0.08]"
            >
              <img 
                src={card.img} 
                alt={card.title} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/95 via-[#1C1917]/25 to-transparent" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-left select-none space-y-1">
                <h4 className="text-xl font-serif font-light text-[#FAF8F4] leading-tight tracking-wide">
                  {card.title}
                </h4>
                <p className="text-[10px] text-[#FAF8F4]/70 font-semibold uppercase tracking-widest">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Addresses Tab Component ──────────────────────────────────────────────────
function AddressesTab({ userName }: { userName: string }) {
  const { token } = useSessionStore();
  const addresses = useQuery(api.addresses.list, { token: token || undefined }) as Address[] | undefined;
  const addAddress = useAction(api.addresses.add);
  const updateAddress = useAction(api.addresses.update);
  const removeAddress = useMutation(api.addresses.remove);
  const setDefaultAddress = useMutation(api.addresses.setDefault);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleAdd = async (data: AddressFormData) => {
    setSaving(true);
    try {
      await addAddress({
        label: data.label,
        houseNumber: data.houseNumber || undefined,
        line1: data.line1 || undefined,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        landmark: data.landmark || undefined,
        isDefault: data.isDefault,
        phone: data.phone || undefined,
        lat: 10.0159,
        lng: 76.3419,
        token: token || undefined,
      });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: AddressFormData) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateAddress({
        addressId: editTarget._id,
        label: data.label,
        houseNumber: data.houseNumber || undefined,
        line1: data.line1 || undefined,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        landmark: data.landmark || undefined,
        isDefault: data.isDefault,
        phone: data.phone || undefined,
        lat: editTarget.lat || 10.0159,
        lng: editTarget.lng || 76.3419,
        token: token || undefined,
      });
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeAddress({ addressId: deleteTarget._id, token: token || undefined });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: Id<"addresses">) => {
    setSettingDefaultId(id);
    try {
      await setDefaultAddress({ addressId: id, token: token || undefined });
    } finally {
      setSettingDefaultId(null);
    }
  };

  if (addresses === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#78716C]" />
      </div>
    );
  }

  const editForm: AddressFormData = editTarget
    ? {
        label: editTarget.label,
        houseNumber: editTarget.houseNumber || "",
        line1: editTarget.line1 || "",
        city: editTarget.city,
        state: editTarget.state,
        pincode: editTarget.pincode,
        landmark: editTarget.landmark || "",
        phone: editTarget.phone || "",
        isDefault: editTarget.isDefault,
      }
    : EMPTY_FORM;

  return (
    <div className="flex flex-col gap-6 text-left animate-fadeIn">
      <div className="flex justify-between items-center border-b border-[#1c1917]/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-serif font-medium text-[#1C1917]">Delivery Addresses</h2>
          <p className="text-xs text-[#78716C] mt-1">Manage physical locations for courier hand-offs.</p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="h-10 px-4 rounded-lg bg-[#1C1917] text-[#FAF8F4] hover:bg-[#1c1917]/90 font-medium text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Address
        </button>
      </div>

      {addresses.length === 0 && (
        <div className="text-center py-16 bg-white border border-[#1c1917]/[0.08] rounded-xl flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#1c1917]/[0.08] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#78716C]" />
          </div>
          <p className="font-serif font-medium text-[#1C1917]">No saved addresses</p>
          <p className="text-xs text-[#78716C] max-w-xs leading-relaxed">
            Add a shipping location to speed up delivery bookings and checkout.
          </p>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <AddressCard
              key={addr._id}
              address={addr}
              userName={userName}
              onEdit={() => setEditTarget(addr)}
              onDelete={() => setDeleteTarget(addr)}
              onSetDefault={() => handleSetDefault(addr._id)}
              settingDefault={settingDefaultId === addr._id}
            />
          ))}
        </div>
      )}

      {showForm && (
        <AddressFormModal
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {editTarget && (
        <AddressFormModal
          initial={editForm}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          address={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// ── Notifications Tab Component ──────────────────────────────────────────────
function NotificationsTab() {
  return (
    <div className="flex flex-col gap-6 text-left animate-fadeIn">
      <div className="border-b border-[#1c1917]/[0.08] pb-4">
        <h2 className="text-xl font-serif font-medium text-[#1C1917]">Notifications</h2>
        <p className="text-xs text-[#78716C] mt-1">Stay updated with order logs and new collections.</p>
      </div>

      <div className="text-center py-20 bg-white border border-[#1c1917]/[0.08] rounded-xl flex flex-col items-center gap-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#1c1917]/[0.08] flex items-center justify-center">
          <Bell className="w-5 h-5 text-[#78716C]" />
        </div>
        <p className="font-serif font-medium text-[#1C1917]">No new notifications</p>
        <p className="text-xs text-[#78716C] max-w-xs leading-relaxed">
          We'll let you know when new collections and order updates arrive.
        </p>
      </div>
    </div>
  );
}

// ── Settings Tab Component ───────────────────────────────────────────────────
function SettingsTab() {
  const { logout } = useSessionStore();
  const router = useRouter();
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [privacyShare, setPrivacyShare] = useState(true);

  return (
    <div className="flex flex-col gap-6 text-left animate-fadeIn">
      <div className="border-b border-[#1c1917]/[0.08] pb-4">
        <h2 className="text-xl font-serif font-medium text-[#1C1917]">Settings</h2>
        <p className="text-xs text-[#78716C] mt-1">Manage your notification and privacy configurations.</p>
      </div>

      <div className="bg-white border border-[#1c1917]/[0.08] rounded-xl divide-y divide-[#1c1917]/[0.08] overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Communication Preferences</h4>
            <p className="text-xs text-[#78716C]">Receive order invoices and receipts via email</p>
          </div>
          <button
            onClick={() => setNotifEmail(!notifEmail)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              notifEmail ? "bg-[#1C1917] flex justify-end" : "bg-[#1c1917]/[0.08] flex justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200" />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Notification Preferences</h4>
            <p className="text-xs text-[#78716C]">Receive delivery ETA and driver contacts on phone SMS / WhatsApp</p>
          </div>
          <button
            onClick={() => setNotifSMS(!notifSMS)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              notifSMS ? "bg-[#1C1917] flex justify-end" : "bg-[#1c1917]/[0.08] flex justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200" />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Privacy Settings</h4>
            <p className="text-xs text-[#78716C]">Permit local boutiques to read profile measurements for alterations</p>
          </div>
          <button
            onClick={() => setPrivacyShare(!privacyShare)}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              privacyShare ? "bg-[#1C1917] flex justify-end" : "bg-[#1c1917]/[0.08] flex justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200" />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wide">Sign Out</h4>
            <p className="text-xs text-[#78716C]">Disconnect this session from your current device</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-500 font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Account Page ──────────────────────────────────────────────────────────
const NAVIGATION_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "addresses", label: "Addresses" },
  { id: "orders", label: "Orders", route: "/orders" },
  { id: "wishlist", label: "Wishlist", route: "/wishlist" },
  { id: "notifications", label: "Notifications" },
  { id: "settings", label: "Settings" },
] as const;

type NavId = (typeof NAVIGATION_ITEMS)[number]["id"];

export default function AccountPage() {
  const { isAuthenticated, isLoading } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in?redirect_url=/account");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#78716C]" />
      </div>
    );
  }

  return <AccountPageContent />;
}

function AccountPageContent() {
  const [activeTab, setActiveTab] = useState<NavId>("overview");
  const { user, token } = useSessionStore();
  const router = useRouter();

  const addresses = useQuery(api.addresses.list, { token: token || undefined }) as Address[] || [];

  const createdYear = useMemo(() => {
    if (!user?.createdAt) return 2026;
    return new Date(user.createdAt).getFullYear();
  }, [user]);

  // Monogram initials for profile avatar
  const initials = useMemo(() => {
    if (!user?.name) return "AK";
    return user.name
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const handleNavClick = (tab: typeof NAVIGATION_ITEMS[number]) => {
    const route = (tab as any).route;
    if (route) {
      router.push(route);
    } else {
      setActiveTab(tab.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1C1917] font-sans pb-24 antialiased selection:bg-[#F5A623]/20">
      
      {/* Mobile Top Profile Identity (compact layout visible only on mobile) */}
      <div className="lg:hidden bg-white border-b border-[#1c1917]/[0.08] px-6 pt-6 pb-4 text-left space-y-2">
        <h2 className="text-xl font-serif font-light text-[#1C1917] leading-tight">
          Welcome back, {toTitleCase(user?.name?.split(" ")[0]) || "Athul"} 👋
        </h2>
        <div className="flex items-center gap-2 text-xs text-[#78716C] font-medium">
          <span className="text-[#4D7C0F]">Verified Hive Member</span>
          <span className="text-[#1c1917]/[0.12]">•</span>
          <span>Supporting Local Fashion Since 2026</span>
        </div>
      </div>

      {/* Mobile Navigation Pills sticky container (replaces vertical list) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#1c1917]/[0.08] px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory lg:hidden">
        {NAVIGATION_ITEMS.map((tab) => {
          const isTabActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab)}
              className={`snap-center flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                isTabActive
                  ? "bg-[#1C1917] border-[#1C1917] text-[#FAF8F4]"
                  : "bg-white border-[#1c1917]/[0.08] text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-10 flex flex-col lg:flex-row gap-12 relative items-stretch">
        
        {/* ── LEFT PROFILE RAIL ── (hidden on mobile) */}
        <aside className="hidden lg:flex w-full lg:w-[320px] flex-shrink-0 flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1c1917]/[0.08] pb-8 lg:pb-0 lg:pr-10 text-left">
          <div className="space-y-8 sticky top-24">
            
            {/* Identity card */}
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-[#FAF8F4] border border-[#F5A623] flex items-center justify-center shadow-sm select-none">
                <span className="font-serif text-2xl font-light text-[#1C1917] tracking-wider">
                  {initials}
                </span>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-serif font-medium text-[#1C1917] tracking-wide">
                  {toTitleCase(user?.name) || "Athul Krishna"}
                </h2>
                
                <div className="flex flex-col gap-1 items-start">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#4D7C0F]/5 border border-[#4D7C0F]/10 text-[8.5px] font-extrabold uppercase tracking-widest text-[#4D7C0F]">
                    Verified Hive Member
                  </span>
                  
                  {/* Founding Member badge if registered early */}
                  {createdYear <= 2026 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D97706]/5 border border-[#D97706]/10 text-[8.5px] font-extrabold uppercase tracking-widest text-[#D97706] mt-1">
                      Founding Member
                    </span>
                  )}
                </div>
                
                <p className="text-[10px] text-[#78716C] italic font-semibold pt-1">
                  Supporting Local Fashion Since {createdYear || 2026}
                </p>
              </div>
            </div>

            {/* Sidebar navigation */}
            <nav className="flex flex-col gap-1 border-t border-[#1c1917]/[0.08] pt-6">
              {NAVIGATION_ITEMS.map((tab) => {
                const isTabActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavClick(tab)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all w-full cursor-pointer text-left ${
                      isTabActive
                        ? "bg-white text-[#1C1917] font-medium border border-[#1c1917]/[0.08] shadow-sm"
                        : "text-[#78716C] hover:bg-white/40 hover:text-[#1C1917]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {!(tab as any).route && <ChevronRight className="w-3.5 h-3.5 text-[#78716C]" />}
                  </button>
                );
              })}
            </nav>

            {/* Support Card widget */}
            <div className="bg-white border border-[#1c1917]/[0.08] rounded-xl p-5 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#78716C]" />
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-[#78716C]">Need Help?</h5>
              </div>
              
              <a 
                href="mailto:support@tailorbee.in"
                className="text-xs font-bold text-[#1C1917] hover:text-[#F5A623] flex items-center gap-0.5 transition-colors group"
              >
                Contact Hive Support →
              </a>
              
              <p className="text-[10px] text-[#78716C] leading-normal font-medium">
                Our team typically replies within one business day.
              </p>
            </div>

          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT AREA ── */}
        <main className="flex-1 max-w-[900px] min-h-[60vh] flex flex-col gap-10">
          {activeTab === "overview" && (
            <OverviewTab addresses={addresses} user={user} setActiveTab={setActiveTab} />
          )}

          {activeTab === "addresses" && (
            <AddressesTab userName={user?.name || "Athul Krishna"} />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab />
          )}

          {activeTab === "settings" && (
            <SettingsTab />
          )}

          {/* Support Card at bottom on mobile */}
          <div className="bg-white border border-[#1c1917]/[0.08] rounded-xl p-6 shadow-sm space-y-3 lg:hidden mt-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#78716C]" />
              <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-[#78716C]">Need Help?</h5>
            </div>
            
            <a 
              href="mailto:support@tailorbee.in"
              className="text-xs font-bold text-[#1C1917] hover:text-[#F5A623] flex items-center gap-0.5 transition-colors group"
            >
              Contact Hive Support →
            </a>
            
            <p className="text-[10px] text-[#78716C] leading-normal font-medium">
              Our team typically replies within one business day.
            </p>
          </div>
        </main>

      </div>

    </div>
  );
}
