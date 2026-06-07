"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
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
} from "lucide-react";

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
  isDefault: boolean;
};

const EMPTY_FORM: AddressFormData = {
  label: "Home",
  houseNumber: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  isDefault: false,
};

const LABEL_OPTIONS = ["Home", "Work", "Other"];

// ── Label Icon ─────────────────────────────────────────────────────────────────
function LabelIcon({ label }: { label: string }) {
  if (label === "Work") return <Briefcase className="w-4 h-4" />;
  if (label === "Other") return <Bookmark className="w-4 h-4" />;
  return <Home className="w-4 h-4" />;
}

// ── Address Display ────────────────────────────────────────────────────────────
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold font-serif text-hive-dark">
            {initial.houseNumber || initial.line1 ? "Edit Address" : "Add Address"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-hive-dark uppercase tracking-wider">
              Address Label
            </label>
            <div className="flex gap-2">
              {LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, label: opt }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                    form.label === opt
                      ? "bg-hive-dark text-hive-gold border-hive-dark"
                      : "bg-white text-hive-text-muted border-hive-border/60 hover:border-hive-gold"
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
          <div className="grid grid-cols-2 gap-3">
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

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-hive-border/40 hover:border-hive-gold/40 transition-colors">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                form.isDefault
                  ? "bg-hive-dark border-hive-dark"
                  : "bg-white border-slate-300"
              }`}
            >
              {form.isDefault && <Check className="w-3 h-3 text-hive-gold" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-hive-dark">Set as default address</span>
              <span className="text-xs text-hive-text-muted">Used by default in checkout</span>
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
            className="w-full h-12 bg-hive-dark text-hive-gold rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-hive-dark/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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

// ── Reusable Field ─────────────────────────────────────────────────────────────
function Field({
  label,
  ...inputProps
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-hive-dark uppercase tracking-wider">
        {label}
      </label>
      <input
        {...inputProps}
        className="w-full h-11 px-3.5 rounded-xl border border-hive-border/60 bg-slate-50 text-sm font-medium text-hive-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hive-gold/40 focus:border-hive-gold transition-all"
      />
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-hive-dark font-serif">Delete Address?</h3>
            <p className="text-xs text-hive-text-muted mt-1 leading-relaxed">
              This will permanently remove your <strong>{address.label}</strong> address.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-2xl border border-hive-border/60 text-sm font-bold text-hive-text hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-11 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
  onEdit,
  onDelete,
  onSetDefault,
  settingDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  settingDefault: boolean;
}) {
  return (
    <div
      className={`relative bg-white border rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all ${
        address.isDefault
          ? "border-hive-gold ring-1 ring-hive-gold/30"
          : "border-hive-border/60 hover:border-hive-gold/40"
      }`}
    >
      {/* Default badge */}
      {address.isDefault && (
        <div className="absolute top-3.5 right-4 flex items-center gap-1 px-2 py-0.5 bg-hive-gold/15 text-hive-amber rounded-full text-[10px] font-extrabold uppercase tracking-wider">
          <Star className="w-2.5 h-2.5 fill-hive-amber" />
          Default
        </div>
      )}

      {/* Label row */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-hive-comb/20 text-hive-amber flex items-center justify-center">
          <LabelIcon label={address.label} />
        </div>
        <span className="font-extrabold text-sm text-hive-dark font-serif">{address.label}</span>
      </div>

      {/* Address text */}
      <p className="text-xs text-hive-text-muted leading-relaxed">
        {formatAddressDisplay(address)}
      </p>

      {/* Action row */}
      <div className="flex items-center gap-2 pt-1 border-t border-hive-border/30">
        {!address.isDefault && (
          <button
            onClick={onSetDefault}
            disabled={settingDefault}
            className="flex items-center gap-1 text-[11px] font-bold text-hive-amber hover:text-hive-gold transition-colors disabled:opacity-50"
          >
            {settingDefault ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Star className="w-3 h-3" />
            )}
            Set as Default
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-hive-dark transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, isLoaded } = useUser();
  const dbUser = useQuery(api.users.getMe);

  if (!isLoaded || dbUser === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-hive-amber" />
      </div>
    );
  }

  const createdDate = dbUser?.createdAt
    ? new Date(dbUser.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const fields = [
    {
      icon: <User className="w-4 h-4" />,
      label: "Full Name",
      value: user?.fullName || "—",
    },
    {
      icon: <Mail className="w-4 h-4" />,
      label: "Email Address",
      value: user?.primaryEmailAddress?.emailAddress || "—",
      note: "Managed via Clerk",
    },
    {
      icon: <Phone className="w-4 h-4" />,
      label: "Phone Number",
      value:
        user?.primaryPhoneNumber?.phoneNumber || dbUser?.phone || "Not added",
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Member Since",
      value: createdDate,
    },
    {
      icon: <Shield className="w-4 h-4" />,
      label: "Account Type",
      value:
        dbUser?.role === "boutique_owner"
          ? "Boutique Owner"
          : dbUser?.role === "admin"
          ? "Administrator"
          : "Customer",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar header */}
      <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-hive-comb/30 to-transparent rounded-2xl border border-hive-border/40">
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt={user.fullName || "Profile"}
            className="w-16 h-16 rounded-full border-2 border-hive-gold/40 object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-hive-gold/20 border-2 border-hive-gold/40 flex items-center justify-center">
            <User className="w-8 h-8 text-hive-amber" />
          </div>
        )}
        <div>
          <p className="font-extrabold font-serif text-hive-dark text-lg leading-tight">
            {user?.fullName || "Your Name"}
          </p>
          <p className="text-xs text-hive-text-muted mt-0.5">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Active
          </div>
        </div>
      </div>

      {/* Profile fields */}
      <div className="flex flex-col gap-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-start gap-3 p-4 bg-white border border-hive-border/50 rounded-xl"
          >
            <div className="w-8 h-8 rounded-lg bg-hive-comb/15 text-hive-amber flex items-center justify-center flex-shrink-0 mt-0.5">
              {field.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                {field.label}
              </p>
              <p className="text-sm font-semibold text-hive-dark mt-0.5 break-all">
                {field.value}
              </p>
              {field.note && (
                <p className="text-[10px] text-slate-400 mt-0.5">{field.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Manage via Clerk note */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
        <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          To update your name, email, or password, use the{" "}
          <button
            onClick={() => {
              // Open Clerk user profile portal
              window.open("https://accounts.clerk.dev", "_blank");
            }}
            className="underline text-hive-amber font-semibold hover:text-hive-gold"
          >
            account settings
          </button>
          .
        </p>
      </div>
    </div>
  );
}

// ── Addresses Tab ──────────────────────────────────────────────────────────────
function AddressesTab() {
  const addresses = useQuery(api.addresses.list) as Address[] | undefined;
  const addAddress = useMutation(api.addresses.add);
  const updateAddress = useMutation(api.addresses.update);
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
        lat: 0,
        lng: 0,
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
      await removeAddress({ addressId: deleteTarget._id });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (id: Id<"addresses">) => {
    setSettingDefaultId(id);
    try {
      await setDefaultAddress({ addressId: id });
    } finally {
      setSettingDefaultId(null);
    }
  };

  if (addresses === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-hive-amber" />
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
        isDefault: editTarget.isDefault,
      }
    : EMPTY_FORM;

  return (
    <div className="flex flex-col gap-4">
      {/* Add button */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full h-12 rounded-2xl border-2 border-dashed border-hive-gold/40 text-hive-amber font-bold text-sm flex items-center justify-center gap-2 hover:border-hive-gold hover:bg-hive-gold/5 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add New Address
      </button>

      {/* Empty state */}
      {addresses.length === 0 && (
        <div className="text-center py-14 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-slate-400" />
          </div>
          <p className="font-extrabold font-serif text-hive-dark">No saved addresses</p>
          <p className="text-xs text-hive-text-muted max-w-xs">
            Add a delivery address to speed up your checkout.
          </p>
        </div>
      )}

      {/* Address list */}
      {addresses.length > 0 && (
        <div className="flex flex-col gap-3">
          {addresses.map((addr) => (
            <AddressCard
              key={addr._id}
              address={addr}
              onEdit={() => setEditTarget(addr)}
              onDelete={() => setDeleteTarget(addr)}
              onSetDefault={() => handleSetDefault(addr._id)}
              settingDefault={settingDefaultId === addr._id}
            />
          ))}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <AddressFormModal
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Edit form modal */}
      {editTarget && (
        <AddressFormModal
          initial={editForm}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
          saving={saving}
        />
      )}

      {/* Delete confirm */}
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

// ── Main Account Page ──────────────────────────────────────────────────────────
const TABS = [
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  { id: "addresses", label: "Addresses", icon: <MapPin className="w-4 h-4" /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AccountPage() {
  return (
    <>
      <SignedIn>
        <AccountPageContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function AccountPageContent() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-[#FFFDF9]/60">
      {/* Page Header */}
      <div className="w-full bg-white border-b border-hive-border/50 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-hive-text-muted mb-3">
            <a href="/" className="hover:text-hive-amber transition-colors">Home</a>
            <ChevronRight className="w-3 h-3" />
            <span className="text-hive-dark font-semibold">Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-hive-dark">
            My Account
          </h1>
          <p className="text-sm text-hive-text-muted mt-1">
            {user?.fullName
              ? `Welcome back, ${user.fullName.split(" ")[0]}.`
              : "Manage your profile and delivery addresses."}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white border border-hive-border/50 rounded-2xl mb-6 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-hive-dark text-hive-gold shadow-sm"
                  : "text-hive-text-muted hover:text-hive-dark"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "addresses" && <AddressesTab />}
      </div>
    </div>
  );
}
