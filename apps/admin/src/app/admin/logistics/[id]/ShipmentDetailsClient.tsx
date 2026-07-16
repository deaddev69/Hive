"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@hive/ui";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Truck,
  Package,
  ShieldAlert,
  Archive,
  MapPin,
  Calendar,
  CheckCircle,
  Ban,
  Clock,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

export function ShipmentDetailsClient({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();

  const data = useQuery(api.adminLogistics.getShipmentByIdAdmin, {
    shipmentId: shipmentId as any,
  });

  const resolveException = useMutation(api.adminLogistics.resolveLogisticsExceptionAdmin);
  const confirmRtoReceipt = useMutation(api.adminLogistics.confirmRtoReceiptAdmin);
  const markLost = useMutation(api.adminLogistics.markShipmentLostAdmin);

  // States
  const [resolveAction, setResolveAction] = useState<"reattempt" | "update_address" | "force_rto">("reattempt");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);

  const [rtoNotes, setRtoNotes] = useState("");
  const [rtoLoading, setRtoLoading] = useState(false);

  const [lostNotes, setLostNotes] = useState("");
  const [lostLoading, setLostLoading] = useState(false);
  const [showLostConfirm, setShowLostConfirm] = useState(false);

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

  const handleResolveException = async (e: React.FormEvent) => {
    e.preventDefault();
    setResolvingLoading(true);
    try {
      await resolveException({
        shipmentId: shipmentId as any,
        action: resolveAction,
        notes: resolveNotes || `Resolved manually via admin portal: ${resolveAction}`,
      });
      alert(`Exception resolved successfully via action: ${resolveAction}.`);
      setResolveNotes("");
    } catch (err: any) {
      alert("Failed to resolve exception: " + err.message);
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleConfirmRtoReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setRtoLoading(true);
    try {
      await confirmRtoReceipt({
        shipmentId: shipmentId as any,
        notes: rtoNotes || "Confirmed RTO package receipt at boutique.",
      });
      alert("RTO receipt confirmed. Boutique inventory counts restored and order cancelled.");
      setRtoNotes("");
    } catch (err: any) {
      alert("Failed to confirm RTO receipt: " + err.message);
    } finally {
      setRtoLoading(false);
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLostLoading(true);
    try {
      const res = await markLost({
        shipmentId: shipmentId as any,
        notes: lostNotes || "Marked lost in transit by administrator.",
      });
      alert(
        `Package marked LOST. Customer refunded: ${res.refundNumber}. Boutique wallet balance deducted: ${formatCurrency(
          Math.abs(res.deductionAmount)
        )}.`
      );
      setShowLostConfirm(false);
      setLostNotes("");
    } catch (err: any) {
      alert("Failed to mark shipment lost: " + err.message);
    } finally {
      setLostLoading(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading tracking timeline details...</p>
      </div>
    );
  }

  const { shipment, order, boutique, customer, items } = data;

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
      <span className={`px-2.5 py-1 text-xs font-black border rounded-lg tracking-wider ${styles[status] || "bg-slate-100"}`}>
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
      {/* Header Back Button */}
      <div className="flex items-center gap-3">
        <Link href="/admin/logistics" className="p-2 border border-slate-250/50 hover:bg-slate-100 rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </Link>
        <div>
          <span className="text-xs font-bold text-hive-text-muted uppercase tracking-wider">Logistics Control Tower</span>
          <h1 className="text-2xl font-serif font-black text-hive-dark flex items-center gap-2 mt-0.5">
            AWB: <span className="font-mono text-hive-amber">{shipment.awbNumber}</span>
          </h1>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Overview Info and items (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Card 1: Shipment and Order Profile */}
          <Card className="border border-hive-border bg-white shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fulfillment Metadata</h3>
                <p className="text-xs text-slate-400 mt-0.5">Courier configuration snapshots and dates</p>
              </div>
              <div>{getStatusBadge(shipment.status)}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs text-slate-700 font-sans">
              <div>
                <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Provider</span>
                <span className="text-sm font-extrabold text-slate-900 capitalize flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-500" /> {shipment.provider}
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Order Link</span>
                <span className="text-sm font-extrabold text-slate-900 hover:underline">
                  <Link href={`/admin/orders`}>{order.orderNumber}</Link>
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Est. Delivery</span>
                <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" /> {formatDateTime(shipment.estimatedDelivery)}
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Delivered At</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatDateTime(shipment.deliveredAt)}
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Boutique</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {boutique?.boutiqueName || "Unknown Boutique"}
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Customer Email</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {customer?.email || "Unknown"}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Address snapshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup */}
            <Card className="border border-hive-border bg-white shadow-sm rounded-2xl p-6 text-xs text-slate-700">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#8E867C]" /> Pickup Address Snapshot
              </h4>
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl font-sans border border-slate-100">
                <p className="font-extrabold text-slate-900">{shipment.pickupAddress.name}</p>
                <p className="font-medium text-slate-655">{shipment.pickupAddress.line1}</p>
                <p className="font-medium text-slate-655">
                  {shipment.pickupAddress.city}, {shipment.pickupAddress.state} - {shipment.pickupAddress.pincode}
                </p>
                <p className="font-semibold text-slate-500 mt-2">Phone: {shipment.pickupAddress.phone}</p>
              </div>
            </Card>

            {/* Delivery */}
            <Card className="border border-hive-border bg-white shadow-sm rounded-2xl p-6 text-xs text-slate-700">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-hive-amber" /> Delivery Address Snapshot
              </h4>
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl font-sans border border-slate-100">
                <p className="font-extrabold text-slate-900">{shipment.deliveryAddress.name}</p>
                <p className="font-medium text-slate-655">{shipment.deliveryAddress.line1}</p>
                {shipment.deliveryAddress.line2 && <p className="font-medium text-slate-655">{shipment.deliveryAddress.line2}</p>}
                <p className="font-medium text-slate-655">
                  {shipment.deliveryAddress.city}, {shipment.deliveryAddress.state} - {shipment.deliveryAddress.pincode}
                </p>
                <p className="font-semibold text-slate-500 mt-2">Phone: {shipment.deliveryAddress.phone}</p>
              </div>
            </Card>
          </div>

          {/* Card 3: Items Packed */}
          <Card className="border border-hive-border bg-white shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Package className="w-4.5 h-4.5 text-slate-500" /> Package Contents
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-sans">
                <thead className="bg-slate-50 text-slate-500 uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 text-left rounded-l-xl">Item Details</th>
                    <th className="px-4 py-2.5 text-left">SKU</th>
                    <th className="px-4 py-2.5 text-center">Size</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right rounded-r-xl">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-55/20">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-10 h-10 object-cover rounded-lg border"
                        />
                        <span className="font-extrabold text-slate-900">{item.productName}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{item.sku}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{item.variantSize}</td>
                      <td className="px-4 py-3 text-center font-extrabold">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(item.priceAtPurchase)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right column: Timeline & Action Cards (1/3) */}
        <div className="flex flex-col gap-6">
          
          {/* Card A: Action Cards (Exceptions / RTO / Lost) */}
          {/* Exception resolving card */}
          {shipment.status === "failed" && (
            <Card className="border border-red-200 bg-red-50/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-black text-red-950 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4.5 h-4.5 text-red-650" /> Resolve Exception
              </h3>
              <p className="text-xs text-red-800 mb-4 leading-relaxed font-medium">
                The courier marked this package as <span className="font-bold uppercase">failed</span> due to:{" "}
                <span className="underline font-bold">{getExceptionLabel(shipment.exceptionType)}</span>.
              </p>
              
              <form onSubmit={handleResolveException} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-1">
                    Compensatory Action
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
                  <label className="block text-[10px] font-extrabold text-red-800 uppercase tracking-wider mb-1">
                    Internal Resolution Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Provide details on action taken..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    required
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resolvingLoading}
                  className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-red-700/10"
                >
                  {resolvingLoading ? "Applying..." : "Submit Exception Resolution"}
                </button>
              </form>
            </Card>
          )}

          {/* RTO Confirm Receipt Card */}
          {shipment.status.startsWith("rto_") && (
            <Card className="border border-orange-250 bg-orange-50/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-black text-orange-950 flex items-center gap-1.5 mb-2">
                <Archive className="w-4.5 h-4.5 text-orange-650" /> Confirm RTO Receipt
              </h3>
              
              {shipment.inventoryRestored ? (
                <div className="bg-green-100 border border-green-200 rounded-xl p-4 text-green-800 text-xs mt-2 font-medium">
                  <span className="font-extrabold block text-green-950 mb-0.5">Inventory Restored ✓</span>
                  Boutique stock quantities were successfully re-credited on{" "}
                  {formatDateTime(shipment.inventoryRestoredAt)}. This tracking file is reconciled and locked.
                </div>
              ) : (
                <form onSubmit={handleConfirmRtoReceipt} className="flex flex-col gap-3 mt-2">
                  <p className="text-xs text-orange-850 leading-relaxed font-medium">
                    Once the physical returned package is received back at the boutique, confirm receipt here to
                    idempotently restore inventory stock and flag the transaction record.
                  </p>
                  <div>
                    <label className="block text-[10px] font-extrabold text-orange-800 uppercase tracking-wider mb-1">
                      Quality Check Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Received in perfect resale condition."
                      value={rtoNotes}
                      onChange={(e) => setRtoNotes(e.target.value)}
                      className="w-full bg-white border border-orange-250 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={rtoLoading}
                    className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-orange-600/10"
                  >
                    {rtoLoading ? "Restoring stock..." : "Confirm RTO & Re-credit Stock"}
                  </button>
                </form>
              )}
            </Card>
          )}

          {/* Mark Lost Card (Available for active transit states before final terminal states) */}
          {!["delivered", "returned", "cancelled", "lost"].includes(shipment.status) && (
            <Card className="border border-rose-200 bg-rose-50/50 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-black text-rose-950 flex items-center gap-1.5 mb-1">
                <Ban className="w-4.5 h-4.5 text-rose-650" /> Administrative Bypass: Lost Package
              </h3>
              <p className="text-xs text-rose-800 mb-4 leading-relaxed font-medium">
                If the package is declared lost by the courier, execute this workflow to trigger financial refunds, boutique ledgers deductions, and cancel the order without restocking.
              </p>

              {!showLostConfirm ? (
                <button
                  onClick={() => setShowLostConfirm(true)}
                  className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-rose-600/10"
                >
                  Initiate Mark Lost Workflow
                </button>
              ) : (
                <form onSubmit={handleMarkLost} className="flex flex-col gap-3 border-t border-rose-200/50 pt-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-800 uppercase tracking-wider mb-1">
                      Reason / Administrative Comments
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Courier declared lost in national transit."
                      value={lostNotes}
                      onChange={(e) => setLostNotes(e.target.value)}
                      required
                      className="w-full bg-white border border-rose-250 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-455"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLostConfirm(false)}
                      className="flex-1 px-3 py-2 text-xs font-bold text-rose-850 hover:bg-rose-100 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={lostLoading}
                      className="flex-1 px-3 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-md"
                    >
                      {lostLoading ? "Refunding..." : "Confirm Lost"}
                    </button>
                  </div>
                </form>
              )}
            </Card>
          )}

          {/* Card B: Vertical Webhook tracking events timeline */}
          <Card className="border border-hive-border bg-white shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-slate-500" /> Tracking Event History
            </h3>

            <div className="relative border-l border-slate-100 pl-6 space-y-6 ml-3 font-sans">
              {shipment.rawWebhookEvents &&
                [...shipment.rawWebhookEvents]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((evt, idx) => {
                    const isFailed = evt.status === "failed" || evt.status === "lost";
                    const isSuccess = evt.status === "delivered" || evt.status === "returned";
                    return (
                      <div key={idx} className="relative group">
                        {/* Bullet */}
                        <span
                          className={`absolute -left-[30px] top-1.5 w-2 h-2 rounded-full border ring-4 bg-white transition-all duration-200 ${
                            isSuccess
                              ? "border-green-500 bg-green-500 ring-green-100"
                              : isFailed
                                ? "border-red-500 bg-red-500 ring-red-100"
                                : "border-amber-500 bg-amber-500 ring-amber-100"
                          }`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-400">
                            {formatDateTime(evt.timestamp)}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider leading-tight">
                            {evt.status.replace(/_/g, " ")}
                          </h4>
                          <p className="text-xs text-slate-600 font-semibold">{evt.remarks}</p>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {evt.location || "Courier Network"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

              {(!shipment.rawWebhookEvents || shipment.rawWebhookEvents.length === 0) && (
                <p className="text-xs text-slate-400 italic py-2">No tracking pings logged yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
