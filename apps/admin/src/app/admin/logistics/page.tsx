"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@hive/ui";
import {
  Truck,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  Database,
  ArrowRight,
  ShieldAlert,
  Archive,
  Ban,
  Filter,
  FileText,
  MapPin,
  Clock,
  ThumbsUp
} from "lucide-react";
import Link from "next/link";

export default function LogisticsControlTowerPage() {
  const isProduction = process.env.NODE_ENV === "production";
  const showSimulator = !isProduction && process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true";
  const data = useQuery(api.adminLogistics.getLogisticsQueueAdmin);
  const seedLogistics = useMutation(api.adminLogistics.seedLogisticsMockDataAdmin);
  const simulateWebhook = useMutation(api.adminLogistics.simulateLogisticsWebhookAdmin);
  const resolveException = useMutation(api.adminLogistics.resolveLogisticsExceptionAdmin);
  const confirmRtoReceipt = useMutation(api.adminLogistics.confirmRtoReceiptAdmin);

  // UI state
  const [activeTab, setActiveTab] = useState<"queue" | "exceptions" | "rto">("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [seeding, setSeeding] = useState(false);

  // Webhook Simulator state
  const [simAwb, setSimAwb] = useState("");
  const [simStatus, setSimStatus] = useState<any>("pickup_scheduled");
  const [simException, setSimException] = useState<any>("customer_unreachable");
  const [simRemarks, setSimRemarks] = useState("");
  const [simLocation, setSimLocation] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  // Exception Action Modal/Card state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<"reattempt" | "update_address" | "force_rto">("reattempt");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // RTO Action state
  const [rtoConfirmNotes, setRtoConfirmNotes] = useState("");
  const [confirmingRtoId, setConfirmingRtoId] = useState<string | null>(null);
  const [rtoLoading, setRtoLoading] = useState(false);

  const formatCurrency = (paise?: number) => {
    if (paise === undefined) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const formatDateTime = (ts?: number) => {
    if (!ts) return "--";
    return new Date(ts).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleSeedMockData = async () => {
    setSeeding(true);
    try {
      const res = await seedLogistics();
      alert(`Seeded logistics tracking files for ${res.count} paid orders successfully.`);
    } catch (err: any) {
      alert("Failed to seed: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAwb.trim()) {
      alert("Please enter a valid AWB Number.");
      return;
    }

    setSimLoading(true);
    try {
      const res = await simulateWebhook({
        awbNumber: simAwb,
        status: simStatus,
        exceptionType: simStatus === "failed" ? simException : undefined,
        remarks: simRemarks || undefined,
        location: simLocation || undefined,
      });
      alert(`Simulation success! Transitioned shipment from '${res.fromStatus}' -> '${res.toStatus}'.`);
      // Clear simulator fields
      setSimRemarks("");
      setSimLocation("");
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleResolveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId) return;

    setResolvingLoading(true);
    try {
      await resolveException({
        shipmentId: resolvingId as any,
        action: resolveAction,
        notes: resolveNotes || `Manually resolved using action ${resolveAction}`,
      });
      alert(`Successfully submitted exception resolution: ${resolveAction}.`);
      setResolvingId(null);
      setResolveNotes("");
    } catch (err: any) {
      alert("Failed to resolve exception: " + err.message);
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleConfirmRtoReceipt = async (shipmentId: string) => {
    if (!confirm(`Are you sure you want to confirm RTO receipt? This will restore inventory stock to the boutique.`)) {
      return;
    }

    setRtoLoading(true);
    setConfirmingRtoId(shipmentId);
    try {
      await confirmRtoReceipt({
        shipmentId: shipmentId as any,
        notes: rtoConfirmNotes || "Confirmed receipt at merchant boutique.",
      });
      alert("RTO receipt processed, stock restored, and order cancelled successfully.");
      setConfirmingRtoId(null);
      setRtoConfirmNotes("");
    } catch (err: any) {
      alert("Failed to confirm RTO: " + err.message);
    } finally {
      setRtoLoading(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Gathering logistics records...</p>
      </div>
    );
  }

  const { shipments, metrics } = data;

  // Filter logic
  const filteredShipments = shipments.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      s.awbNumber.toLowerCase().includes(query) ||
      (s.orderNumber && s.orderNumber.toLowerCase().includes(query)) ||
      (s.boutiqueName && s.boutiqueName.toLowerCase().includes(query));

    if (!matchSearch) return false;

    if (activeTab === "exceptions") {
      return s.status === "failed";
    }
    if (activeTab === "rto") {
      return s.status.startsWith("rto_") || s.status === "returned";
    }
    return true; // "queue" Tab shows all
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      created: "bg-slate-100 text-slate-700 border-slate-200",
      pickup_scheduled: "bg-amber-50 text-amber-700 border-amber-200",
      picked_up: "bg-blue-50 text-blue-700 border-blue-200",
      in_transit: "bg-indigo-50 text-indigo-700 border-indigo-200",
      out_for_delivery: "bg-purple-50 text-purple-700 border-purple-200",
      delivered: "bg-green-50 text-green-700 border-green-200",
      failed: "bg-red-50 text-red-700 border-red-200",
      rto_initiated: "bg-orange-50 text-orange-700 border-orange-200",
      rto_in_transit: "bg-orange-100 text-orange-800 border-orange-200",
      rto_delivered: "bg-orange-200 text-orange-900 border-orange-300",
      returned: "bg-emerald-100 text-emerald-800 border-emerald-200",
      lost: "bg-rose-100 text-rose-800 border-rose-200",
      cancelled: "bg-gray-100 text-gray-500 border-gray-200",
    };

    const label = status.replace(/_/g, " ").toUpperCase();
    return (
      <span className={`inline-flex px-2 py-1 text-[10px] font-black border rounded-lg tracking-wider ${styles[status] || "bg-slate-100"}`}>
        {label}
      </span>
    );
  };

  const getExceptionLabel = (type?: string) => {
    if (!type) return "N/A";
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="flex flex-col gap-8 text-left">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark flex items-center gap-2">
            <Truck className="w-8 h-8 text-hive-amber" /> Logistics Control Tower
          </h1>
          <p className="text-sm text-hive-text-muted">
            Monitor shipments, handle courier delivery exceptions, verify RTO returns, and simulate tracking webhooks.
          </p>
        </div>
        <div className="flex gap-3">
          {!isProduction && (
            <button
              onClick={handleSeedMockData}
              disabled={seeding}
              className="flex items-center gap-2 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 disabled:opacity-50 rounded-xl text-xs py-2.5 px-4 font-extrabold transition-all shadow-sm shadow-hive-gold/10"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              <span>Seed Mock Shipments</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Dashboard widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {[
          { label: "Ready To Ship", value: metrics.readyToShip, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "In Transit", value: metrics.inTransit, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Exceptions", value: metrics.exceptions, color: "text-red-600 bg-red-50 border-red-100", highlight: metrics.exceptions > 0 },
          { label: "RTO Queue", value: metrics.rtoQueue, color: "text-orange-600 bg-orange-50 border-orange-100" },
          { label: "Lost Shipments", value: metrics.lostShipments, color: "text-rose-600 bg-rose-50 border-rose-100" },
        ].map((m) => (
          <Card
            key={m.label}
            className={`border bg-white shadow-sm overflow-hidden p-4 sm:p-5 flex flex-col justify-between min-h-[100px] ${
              m.highlight ? "ring-2 ring-red-400" : ""
            }`}
          >
            <span className="text-[10px] sm:text-xs font-bold text-hive-text-muted uppercase tracking-wider">
              {m.label}
            </span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-2xl font-black text-hive-dark tracking-tight">
                {m.value}
              </span>
              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${m.color.split(" ")[1]}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid: Workspace Left (2/3), Webhook Simulator Right (1/3) */}
      <div className={`grid grid-cols-1 ${isProduction ? "" : "lg:grid-cols-3"} gap-6`}>
        
        {/* Left Side: Tables and Actions */}
        <div className={`${isProduction ? "lg:col-span-3" : "lg:col-span-2"} flex flex-col gap-6`}>
          <Card className="border border-hive-border bg-white shadow-sm rounded-2xl">
            {/* Tab header */}
            <div className="border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {[
                  { id: "queue", label: "Shipment Queue", count: shipments.length },
                  { id: "exceptions", label: "Exceptions", count: metrics.exceptions },
                  { id: "rto", label: "RTO Queue & Returns", count: metrics.rtoQueue },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
                      setSearchQuery("");
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeTab === t.id
                        ? "bg-white text-hive-dark shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search AWB, Order, Boutique..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hive-amber/30 text-slate-800"
                />
              </div>
            </div>

            {/* Tab Body */}
            <CardContent className="p-0">
              {filteredShipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <Archive className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-600">No shipments found</p>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Try adjusting your search criteria, selecting a different tab, or seeding mock shipment data.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans">
                    <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 font-extrabold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-3 text-left">AWB & Courier</th>
                        <th className="px-6 py-3 text-left">Order & Boutique</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        {activeTab === "exceptions" && <th className="px-6 py-3 text-left">Category</th>}
                        {activeTab === "rto" && <th className="px-6 py-3 text-left">Stock State</th>}
                        <th className="px-6 py-3 text-left">Last Update</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-850">
                      {filteredShipments.map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 font-mono text-xs">
                                {s.awbNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {s.provider}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{s.orderNumber || "No Order"}</span>
                              <span className="text-[10px] text-slate-400">{s.boutiqueName || "Unknown Boutique"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(s.status)}</td>
                          
                          {activeTab === "exceptions" && (
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] uppercase">
                                {getExceptionLabel(s.exceptionType)}
                              </span>
                            </td>
                          )}

                          {activeTab === "rto" && (
                            <td className="px-6 py-4">
                              {s.inventoryRestored ? (
                                <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Restored
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold italic">Pending Receipt</span>
                              )}
                            </td>
                          )}

                          <td className="px-6 py-4 text-slate-500 font-normal">
                            {formatDateTime(s.updatedAt)}
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {/* Resolve Exception Trigger */}
                              {s.status === "failed" && (
                                <button
                                  onClick={() => {
                                    setResolvingId(s._id);
                                    setResolveNotes("");
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                                >
                                  Resolve
                                </button>
                              )}

                              {/* Confirm RTO receipt trigger */}
                              {s.status.startsWith("rto_") && !s.inventoryRestored && (
                                <button
                                  onClick={() => setConfirmingRtoId(s._id)}
                                  className="px-2.5 py-1 text-[10px] font-extrabold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-sm"
                                >
                                  Confirm RTO
                                </button>
                              )}

                              <Link href={`/admin/logistics/${s._id}`}>
                                <button className="px-2.5 py-1 text-[10px] font-extrabold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-all shadow-sm">
                                  View
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exception Resolve Modal Card */}
          {resolvingId && (
            <Card className="border border-red-200 bg-red-50/50 shadow-md rounded-2xl text-left">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-red-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Resolve Delivery Exception
                </CardTitle>
                <CardDescription className="text-xs text-red-800">
                  Select a compensatory action to route the shipment back on track.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResolveException} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-1.5">
                        Fulfillment Action
                      </label>
                      <select
                        value={resolveAction}
                        onChange={(e) => setResolveAction(e.target.value as any)}
                        className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="reattempt">Trigger Courier Reattempt</option>
                        <option value="update_address">Update Customer Address</option>
                        <option value="force_rto">Initiate Return to Origin (Force RTO)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-1.5">
                        Resolution Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Provide details on address updates or contact log..."
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        required
                        className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setResolvingId(null)}
                      className="px-3.5 py-2 text-xs font-bold text-red-850 hover:bg-red-100 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resolvingLoading}
                      className="px-3.5 py-2 text-xs font-extrabold bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-red-700/10"
                    >
                      {resolvingLoading ? "Submitting..." : "Apply Resolution"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* RTO Receipt confirmation notes card */}
          {confirmingRtoId && (
            <Card className="border border-orange-200 bg-orange-50/50 shadow-md rounded-2xl text-left">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black text-orange-900 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-orange-600" /> Confirm Boutique Return Receipt
                </CardTitle>
                <CardDescription className="text-xs text-orange-800">
                  Verify returned contents. Restoring stock idempotently updates the boutique's catalog quantities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-orange-850 uppercase tracking-wider mb-1.5">
                      Merchant Return Comments / Quality Check Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. QC pass. Item received in original box."
                      value={rtoConfirmNotes}
                      onChange={(e) => setRtoConfirmNotes(e.target.value)}
                      className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingRtoId(null)}
                      className="px-3.5 py-2 text-xs font-bold text-orange-850 hover:bg-orange-100 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmRtoReceipt(confirmingRtoId)}
                      disabled={rtoLoading}
                      className="px-3.5 py-2 text-xs font-extrabold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-orange-700/10"
                    >
                      {rtoLoading ? "Processing restoral..." : "Confirm Receipt & Restore Stock"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Webhook Simulation Controls */}
        {showSimulator && (
          <div className="flex flex-col gap-6">
            <Card className="border border-hive-border bg-white shadow-sm rounded-2xl text-left overflow-hidden">
              <div className="bg-slate-900 p-6 text-white">
                <h3 className="text-base font-serif font-black flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-hive-gold animate-spin-slow" /> Webhook Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Fires mock courier API webhooks. State machine transition check guards will reject invalid updates.
                </p>
              </div>

              <CardContent className="p-6">
                <form onSubmit={handleSimulateWebhook} className="flex flex-col gap-4">
                  {/* AWB input */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      Select AWB (Active Shipments)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="AWB10002932..."
                        value={simAwb}
                        onChange={(e) => setSimAwb(e.target.value)}
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-hive-amber/30"
                      />
                      <select
                        onChange={(e) => setSimAwb(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 px-2 focus:outline-none"
                      >
                        <option value="">Quick Select</option>
                        {shipments
                          .filter((s) => !["delivered", "returned", "cancelled", "lost"].includes(s.status))
                          .map((s) => (
                            <option key={s._id} value={s.awbNumber}>
                              {s.awbNumber} ({s.status})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Status */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target Courier Status
                    </label>
                    <select
                      value={simStatus}
                      onChange={(e) => setSimStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hive-amber/30"
                    >
                      <option value="created">Created</option>
                      <option value="pickup_scheduled">Pickup Scheduled</option>
                      <option value="picked_up">Picked Up</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed">Failed / Exception</option>
                      <option value="rto_initiated">RTO Initiated</option>
                      <option value="rto_in_transit">RTO In Transit</option>
                      <option value="rto_delivered">RTO Delivered</option>
                    </select>
                  </div>

                  {/* Exception category (Conditional) */}
                  {simStatus === "failed" && (
                    <div>
                      <label className="block text-[10px] font-extrabold text-red-655 uppercase tracking-wider mb-1.5">
                        Courier Exception Category
                      </label>
                      <select
                        value={simException}
                        onChange={(e) => setSimException(e.target.value as any)}
                        className="w-full bg-slate-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="customer_unreachable">Customer Unreachable</option>
                        <option value="address_issue">Address Verification Issue</option>
                        <option value="door_locked">Door Locked / Customer Away</option>
                        <option value="payment_issue">COD Cash/Payment Issue</option>
                        <option value="courier_damage">Courier Damage Transit</option>
                        <option value="lost_package">Lost Package Confirmed</option>
                        <option value="other">Other Unspecified Reason</option>
                      </select>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      Hub / Location City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad Central Hub"
                      value={simLocation}
                      onChange={(e) => setSimLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hive-amber/30"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      Remarks / Remarks Detail
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Consignee phone switched off during attempt."
                      value={simRemarks}
                      onChange={(e) => setSimRemarks(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-hive-amber/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={simLoading}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs py-2.5 font-bold transition-all shadow-sm"
                  >
                    {simLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Fire Webhook Trigger</span>
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
