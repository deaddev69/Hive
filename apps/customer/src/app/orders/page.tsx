"use client";

// Force Vercel deployment update for customer order review features
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
  Star,
  CheckCircle,
  Undo2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { useSessionStore } from "@/context/SessionContext";
import { ReviewModal } from "@/components/product/ReviewModal";
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
// /orders — Customer Orders Page (with Rate & Review action for delivered orders)
// ─────────────────────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { token } = useSessionStore();
  const [reviewingOrder, setReviewingOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "cancelled">("active");

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
  
  const cancelledOrdersCount = sortedOrders.filter((o) => ["cancelled", "refunded"].includes(o.status)).length;

  const filteredOrders = sortedOrders.filter(o => {
    if (activeTab === "active") return ["pending_payment", "pending_confirmation", "confirmed", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery"].includes(o.status);
    if (activeTab === "completed") return o.status === "delivered";
    if (activeTab === "cancelled") return ["cancelled", "refunded"].includes(o.status);
    return false;
  });

  // Map every Convex status value → one of the 6 UI badge states.
  const mapStatus = (s: string): string => {
    const map: Record<string, string> = {
      pending_payment:        "placed",
      pending_confirmation:   "placed",
      confirmed:              "confirmed",
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

  const firstReviewItem = reviewingOrder?.items?.[0];

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

        {/* Premium Tab Bar */}
        {sortedOrders.length > 0 && (
          <div className="flex gap-8 border-b border-stone-200 -mt-2 relative">
            {[
              { id: "active", label: "Active", count: activeOrdersCount },
              { id: "completed", label: "Completed", count: deliveredOrdersCount },
              { id: "cancelled", label: "Cancelled", count: cancelledOrdersCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative pb-4 pt-2 text-sm font-bold uppercase tracking-wider transition-colors duration-300 ${
                  activeTab === tab.id ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
                <span className="ml-2 text-[10px] font-black bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900 rounded-t-full transition-all duration-300 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Order List / Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-stone-500 font-medium">
            No {activeTab} orders found.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order._id} order={order} mapStatus={mapStatus} onOpenReview={(ord) => setReviewingOrder(ord)} />
            ))}
          </div>
        )}

        {reviewingOrder && firstReviewItem && (
          <ReviewModal
            isOpen={Boolean(reviewingOrder)}
            onClose={() => setReviewingOrder(null)}
            orderId={(reviewingOrder._id || reviewingOrder.convexId || reviewingOrder.id) as any}
            orderItemId={(firstReviewItem._id || firstReviewItem.id || firstReviewItem.productId) as any}
            productName={firstReviewItem.productName || firstReviewItem.name}
            productImage={firstReviewItem.imageUrl}
          />
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderCard
// ─────────────────────────────────────────────────────────────────────────────
type ConvexOrder = NonNullable<ReturnType<typeof useQuery<typeof api.orders.listMyOrders>>>[number];

function OrderCard({
  order,
  mapStatus,
  onOpenReview,
}: {
  order: ConvexOrder;
  mapStatus: (s: string) => string;
  onOpenReview: (ord: ConvexOrder) => void;
}) {
  const { downloadInvoiceByOrderId, isDownloading } = useInvoiceDownload();
  const downloading = isDownloading(order._id);
  const firstItem = order.items[0];
  const itemsCount = order.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const uiStatus = mapStatus(order.status);
  const isActive = ["placed", "confirmed", "picked_up", "out_for_delivery"].includes(uiStatus);
  const isDelivered = uiStatus === "delivered" || order.status === "delivered";

  const isReturnEligible = order.claimWindowExpiresAt ? Date.now() < order.claimWindowExpiresAt : false;
  const supportNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;
  if (!supportNumber && isReturnEligible) {
    throw new Error("NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER is not defined in environment variables");
  }
  const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(
    `Hi Hive Support, I want to request a return for my order ${order.orderNumber}.`
  )}`;

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
          {isDelivered ? (
            <>
              {isReturnEligible && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3 border border-[#1c1917]/[0.08] hover:border-[#1c1917]/35 text-[#78716C] hover:text-[#1C1917] bg-white transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Undo2 className="w-3.5 h-3.5 text-[#78716C] group-hover:text-[#1C1917]" />
                  <span>Return</span>
                </a>
              )}
              {firstItem?.hasReview ? (
                <div className="h-9 px-4 border border-green-200 text-green-700 bg-green-50/50 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Reviewed</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenReview(order)}
                  className="h-9 px-4 bg-[#F5C22B] text-slate-900 hover:bg-[#E0B024] active:scale-[0.98] transition-all rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-900" />
                  <span>Rate & Review</span>
                </button>
              )}

              <button
                onClick={() => downloadInvoiceByOrderId(order._id)}
                disabled={downloading}
                className="h-9 px-3 border border-[#1c1917]/[0.08] hover:border-[#1c1917]/35 text-[#78716C] hover:text-[#1C1917] bg-white transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#78716C]" />
                ) : (
                  "Invoice"
                )}
              </button>

              <Link
                href={`/orders/${order._id}`}
                className="h-9 px-3 border border-[#1c1917]/[0.08] hover:border-[#1c1917]/35 text-[#78716C] hover:text-[#1C1917] transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1"
              >
                <span>Details</span>
                <ChevronRight className="w-3 h-3 text-[#78716C]" />
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; dot: string; text: string }> = {
    placed: { label: "Placed", dot: "bg-amber-500", text: "text-amber-700" },
    confirmed: { label: "Confirmed", dot: "bg-green-500", text: "text-green-700" },
    picked_up: { label: "Picked Up", dot: "bg-green-500", text: "text-green-700" },
    out_for_delivery: { label: "Out For Delivery", dot: "bg-amber-500", text: "text-amber-700" },
    delivered: { label: "Delivered", dot: "bg-green-500", text: "text-green-700" },
    cancelled: { label: "Cancelled", dot: "bg-stone-400", text: "text-stone-500" },
  };
  const { label, dot, text } = map[status] ?? {
    label: "Processing",
    dot: "bg-stone-400",
    text: "text-stone-500",
  };
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 border border-stone-200 rounded-full bg-white/50 backdrop-blur-sm shadow-sm">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shadow-[0_0_4px_rgba(0,0,0,0.1)]`} />
      <span className={`text-[9px] font-bold uppercase tracking-widest ${text}`}>
        {label}
      </span>
    </div>
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

