"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Card, CardContent, LoadingState } from "@hive/ui";
import { toast } from "@hive/utils";
import {
  MapPin,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Search,
  Loader2,
  X,
  CheckCircle2,
  Navigation,
  Globe,
  Filter,
  Check,
} from "lucide-react";

export default function AdminPincodesPage() {
  const me = useQuery(api.users.getMe);
  const pincodes = useQuery(api.serviceablePincodes.listAllPincodes);
  const togglePincode = useMutation(api.serviceablePincodes.togglePincodeActive);
  const addPincode = useMutation(api.serviceablePincodes.addPincode);
  const deletePincode = useMutation(api.serviceablePincodes.deletePincode);
  const blockPincode = useMutation(api.serviceablePincodes.blockPincode);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [quickBlockInput, setQuickBlockInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Add form state
  const [newPincode, setNewPincode] = useState("");
  const [newCity, setNewCity] = useState("Kochi");
  const [newState, setNewState] = useState("Kerala");
  const [newLat, setNewLat] = useState("10.0261");
  const [newLng, setNewLng] = useState("76.3082");
  const [newZoneCode, setNewZoneCode] = useState("KOCHI_CORE");
  const [newActive, setNewActive] = useState(true);

  const filteredPincodes = useMemo(() => {
    if (!pincodes) return [];
    return pincodes.filter((p) => {
      const matchesSearch =
        p.pincode.includes(searchQuery) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.zoneCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? p.active
          : !p.active;

      return matchesSearch && matchesStatus;
    });
  }, [pincodes, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!pincodes) return { total: 0, active: 0, blocked: 0, zones: 0 };
    const zonesSet = new Set(pincodes.map((p) => p.zoneCode));
    return {
      total: pincodes.length,
      active: pincodes.filter((p) => p.active).length,
      blocked: pincodes.filter((p) => !p.active).length,
      zones: zonesSet.size,
    };
  }, [pincodes]);

  if (pincodes === undefined) {
    return <LoadingState label="Loading serviceable pincodes..." />;
  }

  const handleToggle = async (id: Id<"serviceablePincodes">, currentActive: boolean, pin: string) => {
    setTogglingId(id);
    try {
      await togglePincode({ id, active: !currentActive });
      toast.success(
        !currentActive ? `Pincode ${pin} Activated` : `Pincode ${pin} Blocked`,
        !currentActive
          ? "Deliveries to this pincode are now allowed."
          : "Deliveries to this pincode are now restricted."
      );
    } catch (err: any) {
      toast.error("Couldn't Update Pincode", err.message || "Failed to toggle status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: Id<"serviceablePincodes">, pincode: string) => {
    if (!confirm(`Are you sure you want to permanently delete pincode ${pincode}?`)) return;
    try {
      await deletePincode({ id });
      toast.success("Pincode Deleted", `Pincode ${pincode} was removed from the database.`);
    } catch (err: any) {
      toast.error("Delete Failed", err.message || "Failed to delete pincode.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = newPincode.trim();
    if (!pin || pin.length !== 6) {
      toast.error("Invalid Pincode", "Please enter a valid 6-digit Indian pincode.");
      return;
    }
    setIsSubmitting(true);
    try {
      await addPincode({
        pincode: pin,
        city: newCity.trim() || "Kochi",
        state: newState.trim() || "Kerala",
        lat: parseFloat(newLat) || 10.0261,
        lng: parseFloat(newLng) || 76.3082,
        zoneCode: newZoneCode,
        active: newActive,
      });
      toast.success("Pincode Added", `Serviceable pincode ${pin} has been created.`);
      setNewPincode("");
      setShowAddModal(false);
    } catch (err: any) {
      toast.error("Failed to Add Pincode", err.message || "Pincode may already exist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickBlock = async () => {
    const pin = quickBlockInput.trim();
    if (!pin || pin.length !== 6) {
      toast.error("Invalid Pincode", "Please enter a valid 6-digit pincode.");
      return;
    }
    try {
      await blockPincode({ pincode: pin });
      toast.success("Pincode Blocked", `Pincode ${pin} is now actively restricted from delivery checkout.`);
      setQuickBlockInput("");
    } catch (err: any) {
      toast.error("Quick Block Failed", err.message || "Failed to block pincode.");
    }
  };

  const seedKochi = useMutation(api.serviceablePincodes.seedKochiPincodes);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedKochi = async () => {
    setIsSeeding(true);
    try {
      const res = await seedKochi();
      toast.success(
        "Kochi Pincodes Synced",
        `Configured ${res.total} primary delivery zones (${res.inserted} added, ${res.updated} updated).`
      );
    } catch (err: any) {
      toast.error("Sync Failed", err.message || "Failed to seed pincodes.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-8 pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-hive-dark flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-amber-500" />
            <span>Serviceable Pincodes & Zones</span>
          </h1>
          <p className="text-sm text-hive-text-muted mt-1">
            Global delivery serviceability control tower. Whitelist coverage areas or instantly block restricted zones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedKochi}
            disabled={isSeeding}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100/80 active:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
            title="Populate all primary Kochi Central, North, and South pincodes"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin text-amber-700" /> : <Navigation className="w-4 h-4 text-amber-700" />}
            <span>Sync Greater Kochi (21 Pincodes)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pincode</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-stone-200/80 bg-white rounded-2xl shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Registered</p>
              <p className="text-2xl font-black text-stone-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200/60 bg-emerald-50/30 rounded-2xl shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Serviceable</p>
              <p className="text-2xl font-black text-emerald-900 mt-1">{stats.active}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-rose-200/60 bg-rose-50/30 rounded-2xl shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Blocked / Restricted</p>
              <p className="text-2xl font-black text-rose-900 mt-1">{stats.blocked}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100/80 flex items-center justify-center text-rose-700">
              <ShieldX className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-200/60 bg-amber-50/30 rounded-2xl shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Delivery Zones</p>
              <p className="text-2xl font-black text-amber-900 mt-1">{stats.zones}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700">
              <Navigation className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Block Emergency Tool */}
      <Card className="border border-rose-200/80 bg-gradient-to-r from-rose-50/50 via-white to-rose-50/30 rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">Quick Emergency Pincode Restriction</h3>
              <p className="text-xs text-rose-700">
                Immediately block any pincode from customer checkout without filling coordinates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              maxLength={6}
              value={quickBlockInput}
              onChange={(e) => setQuickBlockInput(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 682001"
              className="px-3.5 py-2 text-sm font-mono font-bold border border-rose-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 w-full md:w-44"
            />
            <button
              onClick={handleQuickBlock}
              disabled={quickBlockInput.length !== 6}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              Block Pincode
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Controls & Data Table */}
      <Card className="border border-stone-200/80 bg-white rounded-3xl shadow-xs overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-4 border-b border-stone-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-stone-50/40">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pincode, city, or zone..."
              className="w-full pl-10 pr-4 py-2 text-xs font-medium border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Segment Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "all" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "active" ? "bg-white text-emerald-700 shadow-2xs" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("blocked")}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === "blocked" ? "bg-white text-rose-700 shadow-2xs" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Blocked ({stats.blocked})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-200/60 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 select-none">
                <th className="px-6 py-3.5">Pincode</th>
                <th className="px-6 py-3.5">City & State</th>
                <th className="px-6 py-3.5">Delivery Zone</th>
                <th className="px-6 py-3.5">Coordinates</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {filteredPincodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MapPin className="w-8 h-8 text-stone-300" />
                      <p className="text-sm font-semibold text-stone-600">No pincodes found</p>
                      <p className="text-xs text-stone-400">
                        {searchQuery ? "Try refining your search filter." : "Add your first serviceable pincode above."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPincodes.map((p) => (
                  <tr key={p._id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Pincode */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            p.active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-black text-sm text-stone-900 tracking-tight">
                          {p.pincode}
                        </span>
                      </div>
                    </td>

                    {/* City & State */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">{p.city}</span>
                        <span className="text-[11px] text-stone-500">{p.state}</span>
                      </div>
                    </td>

                    {/* Delivery Zone */}
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 font-mono text-[10px] font-bold">
                        {p.zoneCode}
                      </span>
                    </td>

                    {/* Coordinates */}
                    <td className="px-6 py-4 font-mono text-[11px] text-stone-500">
                      {p.lat && p.lng ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "--"}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          p.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-rose-50 text-rose-700 border border-rose-200/60"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          }`}
                        />
                        {p.active ? "Active" : "Blocked"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggle(p._id, p.active, p.pincode)}
                          disabled={togglingId === p._id}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            p.active
                              ? "border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                              : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          }`}
                          title={p.active ? "Block this pincode" : "Activate this pincode"}
                        >
                          {togglingId === p._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : p.active ? (
                            <ShieldX className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(p._id, p.pincode)}
                          className="p-2 rounded-xl border border-stone-200 hover:border-rose-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-all cursor-pointer"
                          title="Delete pincode permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Pincode Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-7 w-full max-w-lg shadow-2xl border border-stone-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-serif font-black text-stone-900">Add Serviceable Pincode</h3>
                <p className="text-xs text-stone-500 mt-0.5">Register a new delivery coverage area</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700">Pincode *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full mt-1 px-3.5 py-2.5 text-sm font-mono font-bold border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="682301"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">City</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Kochi"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">State</label>
                  <input
                    type="text"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Kerala"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Delivery Zone</label>
                  <select
                    value={newZoneCode}
                    onChange={(e) => setNewZoneCode(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono"
                  >
                    <option value="KOCHI_CORE">KOCHI_CORE</option>
                    <option value="KOCHI_EXTENDED">KOCHI_EXTENDED</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="10.0261"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="76.3082"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="newActiveCheckbox"
                  checked={newActive}
                  onChange={(e) => setNewActive(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="newActiveCheckbox" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Activate immediately for live checkout
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPincode.length !== 6}
                  className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Pincode</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
