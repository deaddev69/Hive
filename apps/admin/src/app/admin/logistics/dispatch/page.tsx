"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
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
  ThumbsUp,
  X,
  Info,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function DispatchBoardPage() {
  const data = useQuery(api.adminLogistics.getLogisticsQueueAdmin);
  const bookShipment = useMutation(api.adminLogistics.createShipmentAdmin);
  const bookShiprocketShipment = useAction(api.adminLogistics.dispatchShiprocketOrderAdmin);
  const resolveException = useMutation(api.adminLogistics.resolveLogisticsExceptionAdmin);
  const confirmRtoReceipt = useMutation(api.adminLogistics.confirmRtoReceiptAdmin);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Booking Carrier Modal State
  const [bookingOrder, setBookingOrder] = useState<any | null>(null);
  const [bookProvider, setBookProvider] = useState<"shiprocket" | "manual">("shiprocket");
  const [bookAwb, setBookAwb] = useState("");
  const [bookEstDays, setBookEstDays] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Resolving Exception Modal State
  const [resolvingShipment, setResolvingShipment] = useState<any | null>(null);
  const [resolveAction, setResolveAction] = useState<"reattempt" | "update_address" | "force_rto">("reattempt");
  const [resolveResponsibility, setResolveResponsibility] = useState<"boutique" | "courier" | "customer" | "system">("courier");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // Confirming RTO Receipt Modal State
  const [confirmingRtoShipment, setConfirmingRtoShipment] = useState<any | null>(null);
  const [rtoNotes, setRtoNotes] = useState("");
  const [rtoLoading, setRtoLoading] = useState(false);

  const formatCurrency = (paise?: number) => {
    if (paise === undefined) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(paise / 100);
  };

  const getElapsedTimeLabel = (item: any) => {
    const now = Date.now();
    let startTime = item.createdAt;
    let label = "Created";

    if (item.status === "pending_confirmation") {
      startTime = item.createdAt;
      label = "Created";
    } else if (item.status === "confirmed" || item.status === "packed") {
      startTime = item.orderAcceptedAt || item.createdAt;
      label = "Accepted";
    } else if (item.status === "pickup_scheduled") {
      startTime = item.readyForPickupAt || item.createdAt;
      label = "Ready";
    } else if (["picked_up", "in_transit", "out_for_delivery"].includes(item.status)) {
      startTime = item.pickedUpAt || item.createdAt;
      label = "Picked Up";
    } else if (item.status === "failed") {
      startTime = item.updatedAt || item.createdAt;
      label = "Failed";
    } else if (item.status.startsWith("rto_")) {
      startTime = item.updatedAt || item.createdAt;
      label = "RTO Start";
    }

    const diffMs = now - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${label}: ${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${label}: ${diffHours}h ${diffMins % 60}m ago`;
    }
    return `${label}: ${Math.floor(diffHours / 24)}d ago`;
  };

  const getSlaBadge = (status: string) => {
    const styles: Record<string, string> = {
      on_track: "bg-emerald-50 text-emerald-700 border-emerald-200",
      at_risk: "bg-amber-50 text-amber-700 border-amber-255",
      breached: "bg-rose-50 text-rose-700 border-rose-255 animate-pulse",
    };

    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${styles[status] || "bg-slate-100"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const handleBookCarrierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingOrder) return;
    if (!bookAwb.trim()) {
      alert("Please enter a valid AWB Number.");
      return;
    }

    setBookingLoading(true);
    try {
      if (bookProvider === "shiprocket") {
        await bookShiprocketShipment({ orderId: bookingOrder.orderId as any });
      } else {
        await bookShipment({
          orderId: bookingOrder.orderId as any,
          provider: bookProvider,
          awbNumber: bookAwb,
          estimatedDeliveryDays: bookEstDays,
        });
      }
      alert(`Carrier booked successfully! Order moved to PICKUP SCHEDULED.`);
      setBookingOrder(null);
      setBookAwb("");
      setBookEstDays(1);
    } catch (err: any) {
      alert("Fulfillment booking failed: " + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleResolveExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingShipment) return;
    if (!resolveNotes.trim()) {
      alert("Resolution notes are required.");
      return;
    }

    setResolvingLoading(true);
    try {
      await resolveException({
        shipmentId: resolvingShipment._id as any,
        action: resolveAction,
        delayResponsibility: resolveResponsibility,
        notes: resolveNotes,
      });
      alert("Exception resolved successfully.");
      setResolvingShipment(null);
      setResolveNotes("");
    } catch (err: any) {
      alert("Failed to resolve exception: " + err.message);
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleConfirmRtoReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingRtoShipment) return;

    setRtoLoading(true);
    try {
      await confirmRtoReceipt({
        shipmentId: confirmingRtoShipment._id as any,
        notes: rtoNotes || "Confirmed RTO package received at boutique.",
      });
      alert("RTO Receipt confirmed. Sizing stock re-credited.");
      setConfirmingRtoShipment(null);
      setRtoNotes("");
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
        <p className="text-sm text-hive-text-muted font-medium">Loading Hyperlocal Dispatch Monitor...</p>
      </div>
    );
  }

  const { shipments, metrics } = data;

  // Filter items by search query
  const filteredItems = shipments.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.orderNumber?.toLowerCase().includes(query) ||
      item.awbNumber?.toLowerCase().includes(query) ||
      item.boutiqueName?.toLowerCase().includes(query)
    );
  });

  // Columns definition mapping
  const COLUMNS = [
    {
      id: "awaiting_acceptance",
      title: "Awaiting Acceptance",
      color: "border-slate-200 bg-slate-50/50",
      text: "text-slate-800",
      statuses: ["pending_confirmation"],
    },
    {
      id: "ready_for_pickup",
      title: "Ready For Pickup",
      color: "border-yellow-250 bg-yellow-50/20",
      text: "text-yellow-850",
      statuses: ["confirmed", "packed"],
    },
    {
      id: "pickup_scheduled",
      title: "Pickup Scheduled",
      color: "border-amber-255 bg-amber-50/20",
      text: "text-amber-850",
      statuses: ["pickup_scheduled"],
    },
    {
      id: "out_for_delivery",
      title: "Out For Delivery",
      color: "border-indigo-200 bg-indigo-50/10",
      text: "text-indigo-900",
      statuses: ["picked_up", "in_transit", "out_for_delivery"],
    },
    {
      id: "exceptions",
      title: "Exceptions",
      color: "border-red-200 bg-red-50/20",
      text: "text-red-900",
      statuses: ["failed"],
    },
    {
      id: "rto",
      title: "RTO & Returns",
      color: "border-orange-200 bg-orange-50/20",
      text: "text-orange-900",
      statuses: ["rto_initiated", "rto_in_transit", "rto_delivered", "returned"],
    },
  ];

  const getCarrierBadge = (prov: string) => {
    const styles: Record<string, string> = {
      shiprocket: "bg-purple-50 text-purple-700 border-purple-200",
      manual: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <span className={`px-1.5 py-0.5 border rounded text-[8px] font-black uppercase tracking-widest ${styles[prov] || "bg-slate-100"}`}>
        {prov}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-8 text-left h-full">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark flex items-center gap-2">
            <Truck className="w-8 h-8 text-hive-amber" /> Operations Dispatch Board
          </h1>
          <p className="text-sm text-hive-text-muted">
            Monitor hyperlocal same-day delivery SLAs, track merchant prep bottlenecks, and dispatch couriers.
          </p>
        </div>

        {/* Global Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search AWB, Order, Boutique..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hive-amber/30 text-slate-800"
          />
        </div>
      </div>

      {/* SLA Success rate KPI Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-hive-amber/10 rounded-xl text-hive-amber">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">City Fulfillment Health</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">Same-Day Success Rate</span>
          </div>
        </div>

        {/* Rating Alert Box */}
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
          <div className={`px-4 py-3 border rounded-xl flex items-center gap-3 shrink-0 ${
            metrics.sameDaySuccessRating === "excellent" 
              ? "bg-green-50 text-green-700 border-green-200"
              : metrics.sameDaySuccessRating === "healthy"
                ? "bg-amber-50 text-amber-750 border-amber-250"
                : "bg-rose-50 text-rose-700 border-rose-250"
          }`}>
            <span className="text-3xl font-black tracking-tight">{metrics.sameDaySuccessRate}%</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider">Status: {metrics.sameDaySuccessRating}</span>
              <span className="text-[9px] opacity-80">{metrics.deliveredWithin8h} of {metrics.totalDelivered} same-day packages delivered inside 8h</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-md">
            This indicator monitors our same-day delivery promise compliance. Hive same-day deliveries target a 
            <span className="font-bold"> 8-hour doorstep delivery SLA</span> from order accepted time. Rates below 90% require dispatcher intervention.
          </p>
        </div>
      </div>

      {/* Kanban Dispatch Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-stretch h-[calc(100vh-320px)] min-h-[500px]">
        {COLUMNS.map((col) => {
          const colItems = filteredItems.filter((i) => col.statuses.includes(i.status));
          return (
            <div key={col.id} className="flex flex-col rounded-2xl border bg-slate-50/50 shadow-sm overflow-hidden h-full max-h-[650px]">
              {/* Column Header */}
              <div className={`px-4 py-3 border-b flex justify-between items-center ${col.color}`}>
                <h3 className={`text-xs font-black uppercase tracking-wider ${col.text}`}>
                  {col.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-900/10 text-slate-800 text-[10px] font-extrabold">
                  {colItems.length}
                </span>
              </div>

              {/* Scrollable Card Container */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 max-h-[580px]">
                {colItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-350 italic text-[11px]">
                    No tasks
                  </div>
                ) : (
                  colItems.map((item) => (
                    <Card key={item._id} className="border border-slate-200 bg-white hover:shadow-md transition-all p-3 text-left flex flex-col gap-2.5">
                      {/* Header tags */}
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] font-extrabold text-slate-900 hover:underline animate-duration-1000">
                          {item.isVirtual ? (
                            <span>{item.orderNumber}</span>
                          ) : (
                            <Link href={`/admin/logistics/${item._id}`}>{item.orderNumber}</Link>
                          )}
                        </span>
                        {getSlaBadge(item.slaStatus || "on_track")}
                      </div>

                      {/* Info lines */}
                      <div className="text-[11px] space-y-0.5 text-slate-655 font-sans">
                        <p className="font-bold text-slate-900 truncate">{item.boutiqueName || "Boutique"}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-bold">
                          <span>{formatCurrency(item.orderTotal)}</span>
                          <span className="text-slate-500">{getElapsedTimeLabel(item)}</span>
                        </div>
                      </div>

                      {/* AWB and Carrier representation */}
                      {!item.isVirtual && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                          <span className="font-mono font-bold text-slate-500 truncate max-w-[100px]">{item.awbNumber}</span>
                          {getCarrierBadge(item.provider)}
                        </div>
                      )}

                      {/* Exception details indicator */}
                      {item.status === "failed" && item.exceptionType && (
                        <div className="bg-red-50 border border-red-105 rounded-lg p-1.5 text-[9px] text-red-800 font-medium">
                          <span className="font-black block uppercase mb-0.5">Exception: {item.exceptionType.replace("_", " ")}</span>
                          <span className="opacity-90 block">At fault: <span className="underline font-bold uppercase">{item.delayResponsibility || "courier"}</span></span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="border-t border-slate-100 pt-2 flex justify-between items-center gap-1.5 mt-0.5">
                        {/* Virtual dispatcher trigger */}
                        {item.isVirtual && (
                          <button
                            onClick={() => setBookingOrder(item)}
                            className="flex-1 py-1 px-2 text-[10px] font-extrabold bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-center transition-all flex items-center justify-center gap-1"
                          >
                            <span>Book Carrier</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        {/* Actual exception resolver */}
                        {item.status === "failed" && (
                          <button
                            onClick={() => setResolvingShipment(item)}
                            className="flex-1 py-1 px-2 text-[10px] font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-lg text-center transition-all"
                          >
                            Resolve
                          </button>
                        )}

                        {/* Actual RTO confirmer */}
                        {item.status.startsWith("rto_") && !item.inventoryRestored && (
                          <button
                            onClick={() => setConfirmingRtoShipment(item)}
                            className="flex-1 py-1 px-2 text-[10px] font-extrabold bg-orange-650 hover:bg-orange-700 text-white rounded-lg text-center transition-all"
                          >
                            Confirm RTO
                          </button>
                        )}

                        {!item.isVirtual && (
                          <Link href={`/admin/logistics/${item._id}`} className="shrink-0">
                            <button className="py-1 px-2 text-[10px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-all">
                              Inspect
                            </button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Book Courier Delivery */}
      {bookingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden text-left font-sans">
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-serif font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-hive-gold" /> Book Courier Dispatch
              </h3>
              <button onClick={() => setBookingOrder(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookCarrierSubmit} className="p-6 flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
                <p className="font-bold text-slate-800">Order Ref: {bookingOrder.orderNumber}</p>
                <p className="text-slate-500 font-medium">Boutique: {bookingOrder.boutiqueName}</p>
                <p className="text-slate-500 font-medium">Total Price: {formatCurrency(bookingOrder.orderTotal)}</p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Fulfillment Provider
                </label>
                <select
                  value={bookProvider}
                  onChange={(e) => setBookProvider(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-hive-amber/30 text-slate-800 font-semibold"
                >
                  <option value="shiprocket">Shiprocket (Same-Day Courier)</option>
                  <option value="manual">Manual Dispatch (Boutique Self Delivery)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  AWB / Waybill Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. PRT-772910"
                  value={bookAwb}
                  onChange={(e) => setBookAwb(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-hive-amber/30 text-slate-850"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Estimated Delivery (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={bookEstDays}
                  onChange={(e) => setBookEstDays(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-850"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setBookingOrder(null)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-55 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-4 py-2 font-extrabold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl transition-all shadow-md"
                >
                  {bookingLoading ? "Booking carrier..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Resolve Delivery Exception */}
      {resolvingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden text-left font-sans">
            <div className="bg-red-900 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-serif font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-hive-gold" /> Resolve Delivery Exception
              </h3>
              <button onClick={() => setResolvingShipment(null)} className="text-slate-350 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveExceptionSubmit} className="p-6 flex flex-col gap-4 text-xs">
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/35 flex flex-col gap-1 text-red-900 font-medium">
                <p>AWB: {resolvingShipment.awbNumber} ({resolvingShipment.provider})</p>
                <p>Order: {resolvingShipment.orderNumber}</p>
                <p>Courier Exception: <span className="underline font-bold uppercase">{resolvingShipment.exceptionType?.replace("_", " ")}</span></p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Resolution Action
                </label>
                <select
                  value={resolveAction}
                  onChange={(e) => setResolveAction(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-800 font-semibold"
                >
                  <option value="reattempt">Trigger Courier Reattempt</option>
                  <option value="update_address">Update Customer Address</option>
                  <option value="force_rto">Initiate Return to Origin (Force RTO)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Delay Responsibility Attribution
                </label>
                <select
                  value={resolveResponsibility}
                  onChange={(e) => setResolveResponsibility(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-800 font-semibold"
                >
                  <option value="courier">Courier Fault (Transit Delay/Damage)</option>
                  <option value="boutique">Boutique Fault (Wrong Item/Delayed Pack)</option>
                  <option value="customer">Customer Fault (Locked/Unreachable/Address issue)</option>
                  <option value="system">System / Operations Fault</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Resolution Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide contact logs or new address details..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-slate-850"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setResolvingShipment(null)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolvingLoading}
                  className="px-4 py-2 font-extrabold bg-red-750 hover:bg-red-800 text-white rounded-xl transition-all shadow-md"
                >
                  {resolvingLoading ? "Applying..." : "Submit Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirm RTO Receipt */}
      {confirmingRtoShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden text-left font-sans">
            <div className="bg-orange-850 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-serif font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-hive-gold" /> Confirm RTO Return Receipt
              </h3>
              <button onClick={() => setConfirmingRtoShipment(null)} className="text-slate-300 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRtoReceiptSubmit} className="p-6 flex flex-col gap-4 text-xs">
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 flex flex-col gap-1 text-orange-900 font-medium">
                <p>AWB: {confirmingRtoShipment.awbNumber}</p>
                <p>Order: {confirmingRtoShipment.orderNumber}</p>
                <p>Merchant: {confirmingRtoShipment.boutiqueName}</p>
              </div>

              <p className="text-slate-500 font-medium leading-relaxed">
                Confirming return receipt verifies that the physical package has arrived back at the boutique. 
                This will automatically and <span className="font-bold">idempotently re-credit sizing inventory stock</span> 
                in the boutique's catalog.
              </p>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Boutique QC / Return Verification Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Returned item inspected, tags attached, perfect condition."
                  value={rtoNotes}
                  onChange={(e) => setRtoNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-850"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingRtoShipment(null)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-55 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rtoLoading}
                  className="px-4 py-2 font-extrabold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all shadow-md"
                >
                  {rtoLoading ? "Restoring stock..." : "Acknowledge Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
