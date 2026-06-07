"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StatCard, Card, CardContent, Badge } from "@hive/ui";
import { Shirt, ClipboardList, TrendingUp, CheckCircle, Package, Loader2 } from "lucide-react";

export default function BoutiqueDashboard() {
  const metrics = useQuery(api.products.getDashboardMetrics);

  if (metrics === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading dashboard stats...</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Products", value: metrics.totalProducts, icon: Shirt, color: "text-blue-500 bg-blue-50 border-blue-100" },
    { label: "Active Products", value: metrics.activeProducts, icon: Package, color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
    { label: "Pending Orders", value: metrics.pendingOrders, icon: ClipboardList, color: "text-amber-500 bg-amber-50 border-amber-100" },
    { label: "Completed Orders", value: metrics.completedOrders, icon: CheckCircle, color: "text-green-500 bg-green-50 border-green-100" },
    { label: "Revenue (INR)", value: `₹${metrics.revenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-indigo-500 bg-indigo-50 border-indigo-100" },
  ];

  return (
    <div className="flex flex-col gap-8 text-left">
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Dashboard</h1>
        <p className="text-sm text-hive-text-muted">Overview of your design boutique's performance and inventory health.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-hive-border bg-white shadow-sm overflow-hidden p-5 flex flex-col justify-between min-h-[110px]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-hive-text-muted uppercase tracking-wider">{stat.label}</span>
                <div className={`p-2 rounded-xl border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-hive-dark tracking-tight mt-3">{stat.value}</span>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-serif font-bold text-hive-dark">Recent Orders</h2>
            <span className="text-xs font-semibold text-hive-text-muted">Live from Convex</span>
          </div>

          <Card className="border border-hive-border bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">
                      <th className="px-5 py-3.5">Order No.</th>
                      <th className="px-5 py-3.5">Items</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hive-border/30 font-medium text-hive-dark">
                    {metrics.recentOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-700">{order.orderNumber}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            {order.items.map((it: any) => (
                              <span key={it._id}>
                                {it.productName} ({it.variantSize}) x {it.quantity}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-bold">₹{(order.total / 100).toLocaleString("en-IN")}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            order.status === "delivered" ? "bg-green-50 text-green-700 border border-green-200" :
                            order.status === "cancelled" ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {metrics.recentOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-hive-text-muted">
                          No orders placed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Products (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-serif font-bold text-hive-dark">Recent Products</h2>
            <span className="text-xs font-semibold text-hive-text-muted">Last Added</span>
          </div>

          <Card className="border border-hive-border bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-hive-border/30">
                {metrics.recentProducts.map((prod) => (
                  <div key={prod._id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="relative w-12 h-16 rounded-lg border border-hive-border/40 overflow-hidden bg-slate-50 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-hive-text-muted bg-slate-100">No Image</div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-sm font-semibold text-hive-dark truncate leading-snug">{prod.name}</h4>
                      <span className="text-xs text-hive-text-muted leading-relaxed">{prod.categoryName}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-hive-dark">₹{prod.price.toLocaleString("en-IN")}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          prod.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        } border`}>
                          {prod.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {metrics.recentProducts.length === 0 && (
                  <div className="p-8 text-center text-hive-text-muted text-xs">
                    No products added yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
