"use client";

// Trigger Vercel build: null-safe order pricing checks deployed
import React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Card, CardContent } from "@hive/ui";
import { formatCurrency } from "@hive/utils";
import { useAuth } from "@clerk/nextjs";
import {
  Loader2,
  ClipboardList,
  Calendar,
  FileDown,
  Receipt,
  FileText,
  CheckCircle2,
  XCircle,
  Check,
  Clock,
  User,
  MapPin
} from "lucide-react";

// ── Invoice download cell ────────────────────────────────────────────────────
function BoutiqueInvoiceCell({ orderId }: { orderId: Id<"orders"> }) {
  const invoice = useQuery(api.invoices.getInvoiceByOrderId_boutique, { orderId });
  const { getToken } = useAuth();
  const [generating, setGenerating] = React.useState(false);

  if (invoice === undefined) {
    return <span className="inline-block w-14 h-4 bg-[#FAF6F0] rounded animate-pulse" />;
  }

  if (!invoice) {
    return (
      <span className="text-[9px] text-slate-400 font-medium italic whitespace-nowrap">
        No invoice
      </span>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = await getToken({ template: "convex" });
      if (!token) throw new Error("Authentication token is missing.");

      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, token }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate invoice");
      }
    } catch (e: any) {
      alert("Invoice PDF generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!invoice.pdfUrl) {
    return (
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200/50 bg-amber-50 text-[9px] font-bold text-amber-800 hover:bg-amber-100/50 transition-colors whitespace-nowrap disabled:opacity-50"
        title="Trigger PDF generation"
      >
        {generating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-amber-600" />
        )}
        Generate
      </button>
    );
  }

  return (
    <button
      onClick={() => window.open(invoice.pdfUrl!, "_blank")}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hive-border bg-white text-[9px] font-bold text-hive-dark hover:bg-[#FAF6F0] hover:border-hive-gold transition-colors whitespace-nowrap"
      title={`Download ${invoice.invoiceNumber}`}
    >
      <FileDown className="w-3.5 h-3.5 text-hive-gold" />
      Invoice
    </button>
  );
}

// Removed getStatusSelectClass as we will use a standard dropdown style now.

// ── Boutique Orders Page ──────────────────────────────────────────────────────
// ── Order Status Badge Component ───────────────────────────────────────────────
const OrderStatusBadge = ({ status }: { status: string }) => {
  // 1. Active Logistics States (Pulsing Dot)
  if (["waiting_for_rider", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery"].includes(status) || status === "confirmed" || status === "packed") {
    return (
      <div className="flex items-center justify-center w-full py-3 bg-white border border-gray-200 rounded-full shadow-sm">
        <span className="relative flex h-2.5 w-2.5 mr-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
          {(status === 'confirmed' || status === 'packed') ? 'Waiting for Rider' : status.replace(/_/g, " ")}
        </span>
      </div>
    );
  }

  // 2. Delivered State (Solid Green + Icon)
  if (status === "delivered") {
    return (
      <div className="flex items-center justify-center w-full py-3 bg-white border border-gray-200 rounded-full shadow-sm">
        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" strokeWidth={2.5} />
        <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
          Delivered
        </span>
      </div>
    );
  }

  // 3. Cancelled State (Solid Red + Icon)
  if (status === "cancelled") {
    return (
      <div className="flex items-center justify-center w-full py-3 bg-white border border-gray-200 rounded-full shadow-sm">
        <XCircle className="w-4 h-4 mr-2 text-red-500" strokeWidth={2.5} />
        <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
          Cancelled
        </span>
      </div>
    );
  }

  // Fallback for any other locked states
  return (
    <div className="flex items-center justify-center w-full py-3 bg-gray-50 border border-gray-200 rounded-full">
      <span className="text-sm font-semibold text-gray-500 tracking-wide uppercase">
        {status.replace(/_/g, " ")}
      </span>
    </div>
  );
};

export default function BoutiqueOrders() {
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const updateStatus = useMutation(api.orders.updateBoutiqueOrderStatus);
  const retryDispatch = useAction(api.orders.retryBoutiqueOrderDispatch);
  const [retryingOrderId, setRetryingOrderId] = React.useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null);
  const [orderToDecline, setOrderToDecline] = React.useState<string | null>(null);
  const [retryDispatchOrderId, setRetryDispatchOrderId] = React.useState<string | null>(null);
  const [cancelReason, setCancelReason] = React.useState<string>("");
  const [declineReasonType, setDeclineReasonType] = React.useState<string>("Out of stock");
  const [declineError, setDeclineError] = React.useState<boolean>(false);
  const [acceptedOrderIds, setAcceptedOrderIds] = React.useState<Record<string, boolean>>({});

  if (orders === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading orders register...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left pb-24">
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Orders</h1>
        <p className="text-sm text-hive-text-muted">Review and accept incoming orders.</p>
      </div>

      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="hidden md:table-header-group">
                <tr className="bg-[#FAF6F0]/60 border-b border-hive-border/30 text-[10px] font-extrabold uppercase tracking-wider text-[#A89A7E] select-none">
                  <th className="px-6 py-4">Order No.</th>
                  <th className="px-6 py-4">Delivery Slot / Date</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Purchased Items</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark">
                {orders.map((order: any) => {
                  const isPending = order.status === "pending_confirmation";
                  const isAcceptedOptimistically = acceptedOrderIds[order._id];

                  if (isPending) {
                    const createdTime = order.createdAt || order._creationTime || Date.now();
                    const elapsedMin = Math.max(0, Math.floor((Date.now() - createdTime) / 60000));
                    const remMin = Math.max(0, 14 - (elapsedMin % 15));
                    const remSec = (60 - Math.floor(((Date.now() - createdTime) / 1000) % 60)) % 60;
                    const remMinStr = remMin.toString().padStart(2, "0");
                    const remSecStr = remSec.toString().padStart(2, "0");
                    const countdownStr = `Accept within ${remMinStr}:${remSecStr}`;

                    const payoutRupees = Math.round((order.totalPayout ?? 0) / 100);
                    const baseRupees = Math.round((order.totalBasePrice ?? 0) / 100);
                    const feeRupees = Math.max(0, baseRupees - payoutRupees);

                    const custName = order.customerName || order.deliveryAddress?.name || order.deliveryAddress?.label || "Customer";
                    const firstCustName = custName.trim().split(" ")[0] || "Customer";
                    const locality = (order.deliveryAddress?.locality || order.deliveryAddress?.city || "Local").split(",")[0].trim();
                    const distanceStr = order.distanceKm ? `${order.distanceKm} km` : "3.2 km";

                    return (
                      <tr key={order._id} className="flex flex-col md:table-row bg-white border border-slate-200 rounded-2xl mb-4 hover:shadow-xs transition-all p-4 md:p-5">
                        <td colSpan={7} className="p-0">
                          <div className="flex flex-col text-left font-sans gap-3">
                            {/* 1. Top Header: Status Capsule & Urgency Countdown */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[12px] font-bold tracking-wide border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                NEW ORDER
                              </span>
                              <span className="text-[12px] text-slate-500 font-semibold font-mono">
                                {countdownStr}
                              </span>
                            </div>

                            {/* 2. Compact Product Row (w-14 h-16 thumbnail + dominant title & size) */}
                            <div className="flex items-center gap-3">
                              <div className="relative w-14 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0 shadow-2xs">
                                {order.items?.[0]?.imageUrl ? (
                                  <img src={order.items[0].imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-300">No Image</div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 justify-center">
                                <h3 className="text-[18px] font-bold text-slate-900 leading-snug truncate">
                                  {order.items?.[0]?.productName || "Product Order"}
                                </h3>
                                <p className="text-[14px] text-slate-600 font-medium mt-0.5">
                                  Size {order.items?.[0]?.variantSize || "Free"} • Qty {order.items?.[0]?.quantity || 1}
                                  {order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : ""}
                                </p>
                              </div>
                            </div>

                            {/* 3. Money & Customer Context (Tight block separated by 1 divider) */}
                            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                              <span className="text-[14px] font-medium text-slate-600">
                                You&apos;ll receive
                              </span>
                              <div className="text-[28px] font-bold text-slate-900 tracking-tight leading-none my-0.5">
                                ₹{payoutRupees.toLocaleString("en-IN")}
                              </div>
                              <div className="flex items-center justify-between text-[12px] text-slate-500 font-semibold pt-0.5">
                                <span>Hive fee ₹{feeRupees.toLocaleString("en-IN")}</span>
                                <span className="text-[14px] text-slate-700 font-medium">
                                  {firstCustName} • {locality} • {distanceStr}
                                </span>
                              </div>
                            </div>

                            {/* 4. Action Stack (Huge 46px primary button above secondary dark grey text button) */}
                            <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-1.5">
                              {isAcceptedOptimistically ? (
                                <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center gap-2 select-none animate-in fade-in duration-200">
                                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                  <span className="font-bold text-[14px]">Order Accepted — Assigning Rider...</span>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={async () => {
                                      setAcceptedOrderIds(prev => ({ ...prev, [order._id]: true }));
                                      setPendingActionId(order._id);
                                      try {
                                        await updateStatus({
                                          orderId: order._id,
                                          status: "confirmed",
                                        });
                                      } catch (err: any) {
                                        setAcceptedOrderIds(prev => ({ ...prev, [order._id]: false }));
                                        alert("Failed to accept order: " + err.message);
                                      } finally {
                                        setPendingActionId(null);
                                      }
                                    }}
                                    disabled={pendingActionId === order._id}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-[14px] font-bold tracking-wide disabled:opacity-50 transition-all shadow-xs cursor-pointer text-center"
                                  >
                                    Accept Order
                                  </button>
                                  <button
                                    onClick={() => setOrderToDecline(order._id)}
                                    disabled={pendingActionId === order._id}
                                    className="w-full py-2 bg-transparent hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-rose-600 rounded-lg text-[13px] font-semibold tracking-wide disabled:opacity-50 transition-all cursor-pointer text-center"
                                  >
                                    Decline order
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Non-pending (Already Accepted / Confirmed / etc.) row layout
                  return (
                    <tr key={order._id} className="flex flex-col md:table-row bg-white border-b border-hive-border/30 mb-4 md:mb-0 hover:bg-slate-50/30 transition-colors p-4 md:p-0">
                      {/* Order Number */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4">
                        <div className="flex flex-col gap-1">
                          <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider">Order No.</span>
                          <span className="font-mono font-bold text-sm text-slate-700">{order.orderNumber}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4 text-left border-t md:border-t-0 border-hive-border/10">
                        <div className="flex flex-col gap-1.5 text-slate-700">
                          <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider">Delivery Slot / Date</span>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-hive-amber flex-shrink-0" />
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          </div>
                          {order.scheduledProcessingDate && (
                            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit whitespace-nowrap">
                              Pre-order — process on {new Date(`${order.scheduledProcessingDate}T00:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Customer Details (delivery address as proxy) */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4 text-left border-t md:border-t-0 border-hive-border/10">
                        <div className="flex flex-col gap-1">
                          <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider">Customer Details</span>
                          <span className="font-bold text-hive-dark">
                            {(() => {
                              const name = order.customerName || order.deliveryAddress.name || order.deliveryAddress.label || "Customer";
                              const parts = name.trim().split(" ");
                              if (parts.length <= 1) return parts[0] || "Customer";
                              return `${parts[0]} ${parts[parts.length - 1][0]}.`;
                            })()}
                          </span>
                          <span className="text-hive-text-muted leading-tight max-w-xs truncate">
                            {order.deliveryAddress.city}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Pincode: {order.deliveryAddress.pincode}</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4 text-left border-t md:border-t-0 border-hive-border/10">
                        <div className="flex flex-col gap-2">
                          <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider">Purchased Items</span>
                          {order.items.map((it: any) => (
                            <div key={it._id} className="flex items-center gap-2">
                              <div className="relative w-8 h-10 rounded border border-slate-100 overflow-hidden bg-slate-50 flex-shrink-0">
                                {it.imageUrl ? (
                                  <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-hive-text-muted">No Image</div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-hive-dark">{it.productName}</span>
                                <span className="text-[10px] text-hive-text-muted">Size: {it.variantSize} x {it.quantity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4 font-bold text-sm border-t md:border-t-0 border-hive-border/10">
                        <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider block mb-1">Total Amount</span>
                        <span>{formatCurrency(order.total)}</span>
                      </td>

                      {/* Invoice */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4 border-t md:border-t-0 border-hive-border/10">
                        <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider block mb-1">Invoice</span>
                        <BoutiqueInvoiceCell orderId={order._id} />
                      </td>

                      {/* Status updater */}
                      <td className="block md:table-cell px-2 md:px-6 py-2 md:py-4 min-w-[160px] border-t md:border-t-0 border-hive-border/10">
                        <span className="md:hidden text-[10px] font-extrabold text-[#A89A7E] uppercase tracking-wider block mb-2">Order Status</span>
                        <OrderStatusBadge status={order.status} />
                        
                        {(order.status === "confirmed" || order.status === "packed") && order.shipmentStatus === "booking_failed" && (
                          <button
                            onClick={() => setRetryDispatchOrderId(order._id)}
                            className="mt-2 block w-full px-2.5 py-1.5 bg-rose-50 text-rose-700 text-[9px] font-extrabold uppercase tracking-wider rounded-xl border border-rose-200/40 hover:bg-rose-100/40 transition-all duration-150 text-center select-none"
                          >
                            Retry Booking
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-hive-text-muted">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <ClipboardList className="w-8 h-8 text-hive-border" />
                        <span>No orders found for your boutique yet.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Full-Screen Decline Modal */}
      {orderToDecline !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-black text-hive-dark">Decline Order</h3>
              <p className="text-xs font-bold text-rose-600 mt-1">
                Declining this order will initiate a refund to the customer and cannot be undone.
              </p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cancelReason" className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Reason for declining
              </label>
              <select
                value={declineReasonType}
                onChange={(e) => {
                  setDeclineReasonType(e.target.value);
                  setDeclineError(false);
                }}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50 transition-colors"
              >
                <option value="Out of stock">Out of stock</option>
                <option value="Store is too busy / SLA risk">Store is too busy / SLA risk</option>
                <option value="Closing early">Closing early</option>
                <option value="Other (Type reason)">Other (Type reason)</option>
              </select>
              
              {declineReasonType === "Other (Type reason)" && (
                <input 
                  id="cancelReason"
                  type="text" 
                  placeholder="e.g. System glitch, Manager away" 
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setDeclineError(false);
                  }}
                  className={`mt-2 px-3 py-2.5 border ${declineError ? 'border-rose-400 bg-rose-50 placeholder:text-rose-300 focus:ring-rose-400' : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:ring-slate-400'} rounded-xl text-sm focus:outline-none focus:ring-1 transition-colors`}
                  autoFocus
                />
              )}
            </div>
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={async () => {
                  const finalReason = declineReasonType === "Other (Type reason)" ? cancelReason.trim() : declineReasonType;
                  
                  if (declineReasonType === "Other (Type reason)" && !finalReason) {
                    setDeclineError(true);
                    return;
                  }
                  
                  setPendingActionId(orderToDecline);
                  try {
                    await updateStatus({
                      orderId: orderToDecline as Id<"orders">,
                      status: "cancelled",
                      cancelReason: finalReason,
                    });
                  } catch (err: any) {
                    alert("Failed to decline order: " + err.message);
                  } finally {
                    setPendingActionId(null);
                    setOrderToDecline(null);
                    setCancelReason("");
                    setDeclineReasonType("Out of stock");
                    setDeclineError(false);
                  }
                }}
                disabled={pendingActionId === orderToDecline}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {pendingActionId === orderToDecline ? "Processing..." : "Confirm Decline"}
              </button>
              <button
                onClick={() => {
                  setOrderToDecline(null);
                  setCancelReason("");
                  setDeclineReasonType("Out of stock");
                  setDeclineError(false);
                }}
                disabled={pendingActionId === orderToDecline}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Retry Logistics Modal */}
      {retryDispatchOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-black text-hive-dark">Retry Logistics Booking</h3>
              <p className="text-sm font-medium text-slate-600 mt-2">
                The previous attempt to assign a delivery rider failed. Would you like to try again?
              </p>
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={async () => {
                  setRetryingOrderId(retryDispatchOrderId);
                  try {
                    await retryDispatch({ orderId: retryDispatchOrderId as Id<"orders"> });
                    setRetryDispatchOrderId(null);
                  } catch (err: any) {
                    const msg = (err.message || "").toLowerCase();
                    let friendlyMessage = "Delivery partner network is currently busy. Please click retry again in 1 minute.";
                    
                    if (msg.includes("address") || msg.includes("pincode") || msg.includes("location")) {
                      friendlyMessage = "There is an issue with the customer's delivery location. Please contact Hive support.";
                    } else if (msg.includes("unauthorized") || msg.includes("token") || msg.includes("auth")) {
                      friendlyMessage = "System connection issue. Please refresh the page and try again.";
                    }
                    
                    alert(friendlyMessage);
                  } finally {
                    setRetryingOrderId(null);
                  }
                }}
                disabled={retryingOrderId === retryDispatchOrderId}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {retryingOrderId === retryDispatchOrderId ? "Retrying..." : "Confirm Retry"}
              </button>
              <button
                onClick={() => setRetryDispatchOrderId(null)}
                disabled={retryingOrderId === retryDispatchOrderId}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
