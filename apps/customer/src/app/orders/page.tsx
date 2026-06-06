"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ChevronRight,
  Calendar,
  ArrowRight,
  Package,
  Inbox,
  Clock,
  MapPin,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

// ─────────────────────────────────────────────────────────────────────────────
// /orders — My Orders Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const convexOrders = useQuery(api.orders.listMyOrders);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || convexOrders === undefined) {
    return <OrdersSkeleton />;
  }

  // Sort: newest first (already ordered by Convex desc, but defensive)
  const sortedOrders = [...convexOrders].sort((a, b) => b.createdAt - a.createdAt);

  // Map Convex status to UI status values
  const mapStatus = (s: string): string => {
    const map: Record<string, string> = {
      pending_payment:         "placed",
      pending_confirmation:    "placed",
      confirmed:               "confirmed",
      pickup_scheduled:        "confirmed",
      picked_up:               "picked_up",
      in_transit:              "picked_up",
      out_for_delivery:        "out_for_delivery",
      delivered:               "delivered",
      cancelled:               "cancelled",
    };
    return map[s] ?? "placed";
  };


  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-hive-border/40 pb-5">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark">
              My Orders
            </h1>
            <p className="text-xs text-hive-text-muted">
              Track active deliveries, view purchase history, and manage your boutique orders.
            </p>
          </div>
          <Link
            href="/products"
            className="text-[10px] font-extrabold uppercase tracking-widest text-hive-amber hover:text-hive-dark transition-colors flex items-center gap-1"
          >
            <span>Shop More</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Stats Row */}
        {sortedOrders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Orders", value: sortedOrders.length },
              {
                label: "Active",
                value: sortedOrders.filter((o) =>
                  ["pending_payment", "pending_confirmation", "confirmed", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery"].includes(o.status)
                ).length,
              },
              {
                label: "Delivered",
                value: sortedOrders.filter((o) => o.status === "delivered").length,
              },
              {
                label: "Cancelled",
                value: sortedOrders.filter((o) => o.status === "cancelled").length,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-hive-border/40 rounded-2xl p-4 text-left shadow-sm"
              >
                <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                  {stat.label}
                </span>
                <span className="text-xl font-black text-hive-dark block mt-1">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Order List / Empty State */}
        {sortedOrders.length === 0 ? (
          <EmptyOrdersState onRedirect={() => router.push("/products")} />
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <OrderCard key={order._id} order={order} mapStatus={mapStatus} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderCard — uses Convex order shape
// ─────────────────────────────────────────────────────────────────────────────
type ConvexOrder = NonNullable<ReturnType<typeof useQuery<typeof api.orders.listMyOrders>>>[number];

function OrderCard({ order, mapStatus }: { order: ConvexOrder; mapStatus: (s: string) => string }) {
  const firstItem = order.items[0];
  const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
  const uiStatus = mapStatus(order.status);
  const isActive = ["placed", "confirmed", "picked_up", "out_for_delivery"].includes(uiStatus);

  const formatDate = (epochMs: number) => {
    try {
      return new Date(epochMs).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  // Extract delivery slot from notes field ("Payment: upi | Slot: 2026-06-07 10:00 AM")
  const deliverySlot = order.notes?.split("Slot: ")[1] ?? "";

  return (
    <Link
      href={`/orders/${order._id}`}
      className="group bg-white border border-hive-border/50 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-hive-border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 text-left block"
    >
      <div className="flex gap-4 flex-1">

        {/* Product thumbnail */}
        <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-hive-cream/30 border border-hive-border/20 flex-shrink-0">
          {firstItem?.imageUrl ? (
            <Image
              src={firstItem.imageUrl}
              alt={firstItem.productName}
              fill
              sizes="80px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-hive-comb/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-hive-gold" />
            </div>
          )}
          {isActive && (
            <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-green-500 border border-white shadow-sm animate-pulse" />
          )}
        </div>

        {/* Order info */}
        <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-hive-dark select-all font-mono">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={uiStatus} />
            </div>

            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-hive-dark truncate">
                {firstItem?.productName}
                {itemsCount > 1 && (
                  <span className="text-hive-text-muted font-medium"> +{itemsCount - 1} more</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            <span className="text-[10px] text-hive-text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3 text-hive-gold" />
              {formatDate(order.createdAt)}
            </span>
            {deliverySlot && (
              <span className="text-[10px] text-hive-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-hive-gold" />
                {deliverySlot}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: amount + CTA */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 border-t border-hive-border/20 md:border-t-0 md:pt-0 md:flex-shrink-0">
        <div className="text-right">
          <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
            Total Paid
          </span>
          <span className="text-sm font-extrabold text-hive-dark">
            ₹{order.total.toLocaleString("en-IN")}
          </span>
        </div>

        <span className="h-10 px-5 bg-hive-dark text-hive-gold group-hover:bg-hive-dark/90 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-sm flex-shrink-0">
          <span>Track Order</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    placed: { label: "Order Placed", className: "text-blue-700 bg-blue-50 border-blue-200/50" },
    confirmed: { label: "Confirmed", className: "text-indigo-700 bg-indigo-50 border-indigo-200/50" },
    picked_up: { label: "Picked Up", className: "text-purple-700 bg-purple-50 border-purple-200/50" },
    out_for_delivery: { label: "Out For Delivery", className: "text-amber-700 bg-amber-50 border-amber-200/50" },
    delivered: { label: "Delivered", className: "text-green-700 bg-green-50 border-green-200/50" },
    cancelled: { label: "Cancelled", className: "text-red-700 bg-red-50 border-red-200/50" },
  };
  const { label, className } = map[status] ?? {
    label: "Processing",
    className: "text-hive-text-muted bg-hive-cream border-hive-border/50",
  };
  return (
    <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded-lg uppercase tracking-wider inline-block ${className}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: EmptyOrdersState
// ─────────────────────────────────────────────────────────────────────────────
function EmptyOrdersState({ onRedirect }: { onRedirect: () => void }) {
  return (
    <div className="py-20 text-center space-y-6 max-w-sm mx-auto flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-hive-comb/30 border border-hive-border flex items-center justify-center">
        <Inbox className="w-8 h-8 text-hive-gold" />
      </div>
      <div className="space-y-2">
        <h2 className="font-serif text-xl font-bold text-hive-dark">No orders yet</h2>
        <p className="text-xs text-hive-text-muted leading-relaxed max-w-[280px] mx-auto">
          Start exploring boutique fashion and book your first doorstep try-on delivery.
        </p>
      </div>
      <button
        type="button"
        onClick={onRedirect}
        className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
      >
        <span>Browse Products</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrdersSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="h-8 w-40 bg-hive-comb/15 rounded-xl" />
        <div className="h-4 w-72 bg-hive-comb/10 rounded-lg -mt-3" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white border border-hive-border/20 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-hive-border/20 rounded-3xl p-5 h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}
