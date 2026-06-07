"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Card, CardContent } from "@hive/ui";
import { Loader2, ClipboardList, Package, Phone, Calendar, ShieldAlert } from "lucide-react";

export default function BoutiqueOrders() {
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const updateStatus = useMutation(api.orders.updateBoutiqueOrderStatus);

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
                <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">
                  <th className="px-6 py-4">Order No.</th>
                  <th className="px-6 py-4">Delivery Slot / Date</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Purchased Items</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-sm text-slate-700">{order.orderNumber}</span>
                        <span className="text-[10px] text-hive-text-muted">ID: {order._id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar className="w-4 h-4 text-hive-amber flex-shrink-0" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-hive-dark">{order.deliveryAddress.label || "Customer Address"}</span>
                        <span className="text-hive-text-muted leading-tight max-w-xs truncate">{order.deliveryAddress.line1}, {order.deliveryAddress.city}</span>
                        <span className="text-[10px] font-mono text-slate-500">Pincode: {order.deliveryAddress.pincode}</span>
                      </div>
                    </td>
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
                    <td className="px-6 py-4 font-bold text-sm">
                      <span>₹{(order.total / 100).toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={async (e) => {
                          try {
                            await updateStatus({
                              orderId: order._id,
                              status: e.target.value as any
                            });
                          } catch (err: any) {
                            alert("Failed to update status: " + err.message);
                          }
                        }}
                        className={`px-3 py-1.5 border rounded-xl text-xs font-bold bg-white focus:outline-none cursor-pointer ${
                          order.status === "delivered" ? "border-green-200 text-green-700 bg-green-50/20" :
                          order.status === "cancelled" ? "border-red-200 text-red-700 bg-red-50/20" :
                          "border-amber-200 text-amber-700 bg-amber-50/20"
                        }`}
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
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-hive-text-muted">
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
