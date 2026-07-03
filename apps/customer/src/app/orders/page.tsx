"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Calendar,
  Clock,
  ArrowRight,
  Package,
  Loader2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { useSessionStore } from "@/context/SessionContext";
import { formatCurrency } from "@hive/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toTitleCase(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// /orders — My Orders Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { token } = useSessionStore();

  const convexOrders = useQuery(api.orders.listMyOrders, { token: token || undefined });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || convexOrders === undefined) {
    return <OrdersSkeleton />;
  }

  // Sort: newest first
  const sortedOrders = [...convexOrders].sort((a, b) => b.createdAt - a.createdAt);

  const activeOrdersCount = sortedOrders.filter((o) =>
    ["pending_payment", "pending_confirmation", "confirmed", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery"].includes(o.status)
  ).length;

  const deliveredOrdersCount = sortedOrders.filter((o) => o.status === "delivered").length;

  // Map every Convex status value → one of the 6 UI badge states.
  const mapStatus = (s: string): string => {
    const map: Record<string, string> = {
      pending_payment:        "placed",
      pending_confirmation:   "placed",
      confirmed:              "confirmed",
      packed:                 "confirmed",
      pickup_scheduled:       "picked_up",
      picked_up:              "picked_up",
      in_transit:             "picked_up",
      out_for_delivery:       "out_for_delivery",
      delivered:              "delivered",
      claim_submitted:        "delivered",
      replacement_requested:  "delivered",
      replacement_approved:   "delivered",
      replacement_dispatched: "delivered",
      replacement_delivered:  "delivered",
      refund_requested:       "delivered",
      refunded:               "delivered",
      cancelled:              "cancelled",
    };
    return map[s] ?? "placed";
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-12 px-4 sm:px-6 lg:px-8 select-none text-left antialiased">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Page Header */}
        <div className="space-y-2 pb-6 border-b border-[#1c1917]/[0.08]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D97706]">
            Your Purchases
          </span>
          <div className="flex justify-between items-baseline">
            <h1 className="text-3xl font-serif font-light text-[#1C1917] tracking-tight">
              My Orders
            </h1>
            <Link
              href="/products"
              className="text-xs font-bold text-[#1C1917] hover:text-[#D97706] transition-colors"
            >
              Browse Products →
            </Link>
          </div>
        </div>

        {/* Editorial Stats Row */}
        {sortedOrders.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 py-2 border-b border-[#1c1917]/[0.08] -mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-light text-[#1C1917]">{sortedOrders.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Total Orders</span>
            </div>
            <span className="text-stone-300 hidden sm:inline">•</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-light text-[#1C1917]">{activeOrdersCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Active</span>
            </div>
            <span className="text-stone-300 hidden sm:inline">•</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-light text-[#1C1917]">{deliveredOrdersCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716C]">Delivered</span>
            </div>
          </div>
        )}

        {/* Order List / Empty State */}
        {sortedOrders.length === 0 ? (
          <EmptyOrdersState onRedirect={() => router.push("/products")} />
        ) : (
          <div className="flex flex-col gap-4">
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
// Component: OrderCard
// ─────────────────────────────────────────────────────────────────────────────
type ConvexOrder = NonNullable<ReturnType<typeof useQuery<typeof api.orders.listMyOrders>>>[number];

function OrderCard({ order, mapStatus }: { order: ConvexOrder; mapStatus: (s: string) => string }) {
  const { downloadInvoiceByOrderId, isDownloading } = useInvoiceDownload();
  const downloading = isDownloading(order._id);
  const firstItem = order.items[0];
  const itemsCount = order.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
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

  const deliverySlot = order.notes?.split("Slot: ")[1] ?? "";

  return (
    <div
      className="bg-white border border-[#1c1917]/[0.08] rounded-xl p-6 shadow-sm hover:border-[#1c1917]/20 transition-all duration-300 text-left flex flex-col md:flex-row md:items-center justify-between gap-6"
    >
      <div className="flex gap-4 flex-1">
        {/* Product thumbnail */}
        <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-[#FAF8F4] border border-[#1c1917]/[0.08] flex-shrink-0">
          {firstItem?.imageUrl ? (
            <img
              src={firstItem.imageUrl}
              alt={firstItem.productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#FAF8F4] flex items-center justify-center">
              <Package className="w-6 h-6 text-[#D97706]" />
            </div>
          )}
          {isActive && (
            <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-green-500 border border-white shadow-sm animate-pulse" />
          )}
        </div>

        {/* Order details */}
        <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-[#1C1917] tracking-wider select-all">
                {order.orderNumber}
              </span>
              <OrderStatusBadge status={uiStatus} />
            </div>

            <h4 className="text-sm font-serif font-light text-[#1C1917] truncate leading-snug">
              {firstItem?.productName || "Boutique Order"}
              {itemsCount > 1 && (
                <span className="text-xs text-[#78716C] font-sans font-medium"> +{itemsCount - 1} more items</span>
              )}
            </h4>

            {firstItem && (
              <div className="pt-0.5">
                <span className="text-[9px] font-bold text-[#78716C] bg-[#FAF8F4] border border-[#1c1917]/[0.06] px-2 py-0.5 rounded">
                  Size: {firstItem.variantSize || "Free"}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-[#78716C] font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#D97706]" />
              {formatDate(order.createdAt)}
            </span>
            {deliverySlot && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                {deliverySlot}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Paid & CTAs */}
      <div className="flex flex-col md:items-end gap-4 border-t border-[#1c1917]/[0.06] md:border-t-0 pt-4 md:pt-0">
        <div className="text-left md:text-right">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#78716C] block">Total Paid</span>
          <span className="text-base font-serif font-medium text-[#1C1917]">
            {formatCurrency(order.total)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadInvoiceByOrderId(order._id)}
            disabled={downloading}
            className="h-9 px-4 border border-[#1c1917]/[0.08] hover:border-[#1c1917]/35 text-[#78716C] hover:text-[#1C1917] bg-white transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#78716C]" />
            ) : (
              "Invoice"
            )}
          </button>

          <Link
            href={`/orders/${order._id}`}
            className="h-9 px-4 bg-[#1C1917] text-[#FAF8F4] hover:bg-[#1C1917]/90 active:scale-[0.98] transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
          >
            <span>Track</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#F5A623]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    placed: { label: "Placed", className: "text-amber-700 bg-amber-50/40 border-amber-200/30" },
    confirmed: { label: "Confirmed", className: "text-[#4D7C0F] bg-green-50/40 border-green-200/30" },
    picked_up: { label: "Picked Up", className: "text-[#4D7C0F] bg-green-50/40 border-green-200/30" },
    out_for_delivery: { label: "Out For Delivery", className: "text-[#D97706] bg-amber-50/40 border-amber-200/30" },
    delivered: { label: "Delivered", className: "text-[#4D7C0F] bg-green-50/40 border-green-200/30" },
    cancelled: { label: "Cancelled", className: "text-red-700 bg-red-50/40 border-red-200/30" },
  };
  const { label, className } = map[status] ?? {
    label: "Processing",
    className: "text-[#78716C] bg-stone-50 border-stone-200/50",
  };
  return (
    <span className={`text-[9px] font-bold border px-2 py-0.5 rounded uppercase tracking-wider inline-block ${className}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: EmptyOrdersState
// ─────────────────────────────────────────────────────────────────────────────
function EmptyOrdersState({ onRedirect }: { onRedirect: () => void }) {
  return (
    <div className="py-20 text-center space-y-6 max-w-sm mx-auto flex flex-col items-center animate-fadeIn">
      <div className="space-y-4">
        <h2 className="font-serif text-2xl font-light text-[#1C1917]">You haven't placed any orders yet</h2>
        <p className="text-xs text-[#78716C] leading-relaxed max-w-[280px] mx-auto font-medium">
          Your curation journey is waiting. Explore unique, hand-crafted pieces from India's finest independent local designers.
        </p>
      </div>
      <button
        type="button"
        onClick={onRedirect}
        className="h-12 px-8 bg-[#1C1917] text-[#FAF8F4] hover:bg-[#1c1917]/90 active:scale-[0.98] transition-all rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm cursor-pointer mt-4"
      >
        <span>Shop Now</span>
        <ArrowRight className="w-4 h-4 text-[#F5A623]" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrdersSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="h-8 w-40 bg-[#1c1917]/[0.05] rounded-lg" />
        <div className="h-4 w-72 bg-[#1c1917]/[0.05] rounded -mt-3" />
        <div className="flex gap-6 py-4 border-b border-[#1c1917]/[0.08]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-24 bg-[#1c1917]/[0.05] rounded" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#1c1917]/[0.08] rounded-xl h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}

