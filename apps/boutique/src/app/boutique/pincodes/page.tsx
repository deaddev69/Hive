"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Button, Card, CardContent, LoadingState } from "@hive/ui";
import { toast } from "@hive/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  MapPin,
  ShieldCheck,
  ShieldX,
  Search,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";

export default function PincodeManagementPage() {
  const me = useQuery(api.users.getMe);
  const pincodes = useQuery(api.serviceablePincodes.listAllPincodes);
  const togglePincode = useMutation(api.serviceablePincodes.togglePincodeActive);
  const addPincode = useMutation(api.serviceablePincodes.addPincode);
  const deletePincode = useMutation(api.serviceablePincodes.deletePincode);
  const blockPincode = useMutation(api.serviceablePincodes.blockPincode);

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickBlockInput, setQuickBlockInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add form state
  const [newPincode, setNewPincode] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("Kerala");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newZoneCode, setNewZoneCode] = useState("KOCHI_CORE");
  const [newActive, setNewActive] = useState(true);

  if (!me || me.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <ShieldX className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-slate-500 text-sm">Admin access required</p>
        </div>
      </div>
    );
  }

  if (pincodes === undefined) {
    return <LoadingState label="Loading pincodes..." />;
  }

  const filteredPincodes = searchQuery
    ? pincodes.filter(
        (p) =>
          p.pincode.includes(searchQuery) ||
          p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.zoneCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pincodes;

  const activeCount = pincodes.filter((p) => p.active).length;
  const blockedCount = pincodes.filter((p) => !p.active).length;

  const handleToggle = async (id: Id<"serviceablePincodes">, currentActive: boolean) => {
    try {
      await togglePincode({ id, active: !currentActive });
      toast.success(`Pincode ${currentActive ? "blocked" : "activated"} successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pincode");
    }
  };

  const handleDelete = async (id: Id<"serviceablePincodes">, pincode: string) => {
    if (!confirm(`Are you sure you want to permanently delete pincode ${pincode}?`)) return;
    try {
      await deletePincode({ id });
      toast.success(`Pincode ${pincode} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pincode");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPincode.trim() || newPincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setIsSubmitting(true);
    try {
      await addPincode({
        pincode: newPincode.trim(),
        city: newCity.trim() || "Unknown",
        state: newState.trim() || "Unknown",
        lat: parseFloat(newLat) || 0,
        lng: parseFloat(newLng) || 0,
        zoneCode: newZoneCode,
        active: newActive,
      });
      toast.success(`Pincode ${newPincode} added`);
      setNewPincode("");
      setNewCity("");
      setNewLat("");
      setNewLng("");
      setShowAddForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add pincode");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickBlock = async () => {
    const pin = quickBlockInput.trim();
    if (!pin || pin.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    try {
      await blockPincode({ pincode: pin });
      toast.success(`Pincode ${pin} blocked`);
      setQuickBlockInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to block pincode");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/boutique/profile" className="p-1.5 rounded-xl hover:bg-slate-100 transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">Pincode Management</h1>
            <p className="text-[11px] text-slate-400">
              {pincodes.length} total · {activeCount} active · {blockedCount} blocked
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-xl hover:bg-stone-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Quick Block */}
        <Card className="border-red-100 bg-red-50/30">
          <CardContent className="p-3">
            <p className="text-[11px] font-medium text-red-700 mb-2">⛔ Quick Block a Pincode</p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={quickBlockInput}
                onChange={(e) => setQuickBlockInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit pincode"
                className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                onClick={handleQuickBlock}
                disabled={quickBlockInput.length !== 6}
                className="px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-xl hover:bg-red-700 transition disabled:opacity-40"
              >
                Block
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-emerald-800">Add Serviceable Pincode</p>
                <button onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Pincode *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      placeholder="682301"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">City</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      placeholder="Kochi"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">State</label>
                    <input
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      placeholder="Kerala"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Zone Code</label>
                    <select
                      value={newZoneCode}
                      onChange={(e) => setNewZoneCode(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                    >
                      <option value="KOCHI_CORE">KOCHI_CORE</option>
                      <option value="KOCHI_EXTENDED">KOCHI_EXTENDED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      placeholder="10.0261"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      placeholder="76.3082"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newActive"
                    checked={newActive}
                    onChange={(e) => setNewActive(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="newActive" className="text-xs text-slate-600">
                    Active (serviceable immediately)
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || newPincode.length !== 6}
                  className="w-full py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Pincode
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by pincode, city, or zone..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </div>

        {/* Pincode List */}
        <div className="space-y-2">
          {filteredPincodes.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {searchQuery ? "No pincodes match your search" : "No pincodes configured yet"}
              </p>
            </div>
          )}

          {filteredPincodes.map((p) => (
            <Card
              key={p._id}
              className={`border transition ${
                p.active
                  ? "border-emerald-100 bg-white"
                  : "border-red-100 bg-red-50/20"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        p.active
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          {p.pincode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            p.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.active ? "ACTIVE" : "BLOCKED"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {p.city}, {p.state} · Zone: {p.zoneCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(p._id, p.active)}
                      className={`p-2 rounded-xl transition ${
                        p.active
                          ? "hover:bg-red-50 text-slate-400 hover:text-red-500"
                          : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                      }`}
                      title={p.active ? "Block this pincode" : "Activate this pincode"}
                    >
                      {p.active ? (
                        <ShieldX className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(p._id, p.pincode)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
                      title="Delete pincode"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
