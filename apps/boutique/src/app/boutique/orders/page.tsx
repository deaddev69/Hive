"use client";

import React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Card, CardContent } from "@hive/ui";
import { formatCurrency } from "@hive/utils";
import {
  Loader2,
  ClipboardList,
  Calendar,
  FileDown,
  Receipt,
} from "lucide-react";

// ── Invoice download cell ────────────────────────────────────────────────────
function BoutiqueInvoiceCell({ orderId }: { orderId: Id<"orders"> }) {
  const invoice = useQuery(api.invoices.getInvoiceByOrderId_boutique, { orderId });

  if (invoice === undefined) {
    return <span className="inline-block w-14 h-4 bg-slate-100 rounded animate-pulse" />;
  }

  if (!invoice) {
    return (
      <span className="text-[9px] text-slate-400 font-medium italic whitespace-nowrap">
        No invoice
      </span>
    );
  }

  if (!invoice.pdfUrl) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-amber-600 font-medium whitespace-nowrap flex items-center gap-1">
          <Receipt className="w-3 h-3" />
          {invoice.invoiceNumber}
        </span>
        <span className="text-[8px] text-slate-400 italic">PDF pending</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => window.open(invoice.pdfUrl!, "_blank")}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hive-border bg-white text-[9px] font-bold text-hive-dark hover:bg-hive-cream hover:border-hive-gold transition-colors whitespace-nowrap"
      title={`Download ${invoice.invoiceNumber}`}
    >
      <FileDown className="w-3.5 h-3.5 text-hive-gold" />
      Invoice
    </button>
  );
}

const getStatusSelectClass = (status: string) => {
  const base = "appearance-none pr-8 pl-3.5 py-1.5 border rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-no-repeat bg-[position:right_10px_center] bg-[size:10px] focus:outline-none cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ";
  if (status === "delivered") {
    return base + "bg-emerald-50 text-emerald-700 border-emerald-200/40 hover:bg-emerald-100/40 bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23047857\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')]";
  }
  if (status === "cancelled") {
    return base + "bg-rose-50 text-rose-700 border-rose-200/40 hover:bg-rose-100/40 bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23BE123C\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')]";
  }
  if (status === "pending_payment" || status === "pending_confirmation") {
    return base + "bg-amber-50 text-amber-800 border-amber-200/40 hover:bg-amber-100/40 bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23B45309\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')]";
  }
  return base + "bg-blue-50 text-blue-700 border-blue-200/40 hover:bg-blue-100/40 bg-[image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%231D4ED8\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')]";
};

// ── Boutique Orders Page ──────────────────────────────────────────────────────
export default function BoutiqueOrders() {
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const updateStatus = useMutation(api.orders.updateBoutiqueOrderStatus);
  const retryDispatch = useAction(api.orders.retryBoutiqueOrderDispatch);
  const [retryingOrderId, setRetryingOrderId] = React.useState<string | null>(null);

  if (orders === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading orders register...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Orders Directory</h1>
        <p className="text-sm text-hive-text-muted">Monitor orders, customer details, and dispatch statuses.</p>
      </div>

      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
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
                {orders.map((order: any) => (
                  <tr key={order._id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Order Number */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-sm text-slate-700">{order.orderNumber}</span>
                        <span className="text-[10px] text-hive-text-muted">ID: {order._id}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-left">
                      <div className="flex flex-col gap-1.5 text-slate-700">
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
                    <td className="px-6 py-4 text-left">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-hive-dark">{order.deliveryAddress.label || "Customer Address"}</span>
                        <span className="text-hive-text-muted leading-tight max-w-xs truncate">
                          {order.deliveryAddress.line1}, {order.deliveryAddress.city}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">Pincode: {order.deliveryAddress.pincode}</span>
                      </div>
                    </td>

                    {/* Items */}
                    <td className="px-6 py-4 text-left">
                      <div className="flex flex-col gap-2">
                        {order.items.map((it: any) => (
                          <div key={it._id} className="flex items-center gap-2">
                            <div className="relative w-8 h-10 rounded border border-slate-100 overflow-hidden bg-slate-50 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    <td className="px-6 py-4 font-bold text-sm">
                      <span>{formatCurrency(order.total)}</span>
                    </td>

                    {/* Invoice — NEW */}
                    <td className="px-6 py-4">
                      <BoutiqueInvoiceCell orderId={order._id} />
                    </td>

                    {/* Status updater */}
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={async (e) => {
                          try {
                            await updateStatus({
                              orderId: order._id,
                              status: e.target.value as any,
                            });
                          } catch (err: any) {
                            alert("Failed to update status: " + err.message);
                          }
                        }}
                        className={getStatusSelectClass(order.status)}
                      >
                        <option value="pending_payment">Pending Payment</option>
                        <option value="pending_confirmation">Pending Confirmation</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="pickup_scheduled">Pickup Scheduled</option>
                        <option value="picked_up">Picked Up</option>
                        <option value="in_transit">In Transit</option>
                        <option value="out_for_delivery">Out For Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      {order.shipmentStatus === "booking_failed" && (
                        <button
                          onClick={async () => {
                            if (!confirm("Retry dispatching this order to Shiprocket?")) return;
                            setRetryingOrderId(order._id);
                            try {
                              await retryDispatch({ orderId: order._id });
                              alert("Dispatch retried successfully!");
                            } catch (err: any) {
                              alert("Dispatch failed again: " + err.message);
                            } finally {
                              setRetryingOrderId(null);
                            }
                          }}
                          disabled={retryingOrderId === order._id}
                          className="mt-2 block w-full px-2.5 py-1.5 bg-rose-50 text-rose-700 text-[9px] font-extrabold uppercase tracking-wider rounded-xl border border-rose-200/40 hover:bg-rose-100/40 transition-all duration-150 text-center select-none disabled:opacity-50"
                        >
                          {retryingOrderId === order._id ? "Retrying..." : "Retry Booking"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

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
    </div>
  );
}
