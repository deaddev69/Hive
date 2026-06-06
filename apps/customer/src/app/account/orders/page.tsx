"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  ChevronRight, 
  Calendar, 
  ArrowRight,
  Package,
  Inbox
} from "lucide-react";
import { useOrderStore, Order } from "@/store/order-store";

// ─────────────────────────────────────────────────────────────────────────────
// Customer Order History Listing Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const orders = useOrderStore((state) => state.orders);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <OrdersSkeleton />;
  }

  // Sort orders: Newest First
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        <div className="flex flex-col gap-1 border-b border-hive-border/40 pb-4">
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark">
            My Purchases
          </h1>
          <p className="text-xs text-hive-text-muted">
            View order updates, track shipments, or request fits support.
          </p>
        </div>

        {/* Dynamic content */}
        {sortedOrders.length === 0 ? (
          <EmptyOrdersState onRedirect={() => router.push("/products")} />
        ) : (
          <OrdersList orders={sortedOrders} />
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrdersList
// ─────────────────────────────────────────────────────────────────────────────
function OrdersList({ orders }: { orders: Order[] }) {
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const firstItem = order.items[0];
  const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  // Format creation date nicely
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
      <div className="flex gap-4">
        
        {/* Product image container */}
        <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-hive-cream/30 border border-hive-border/20 flex-shrink-0">
          {firstItem?.imageUrl ? (
            <Image
              src={firstItem.imageUrl}
              alt={firstItem.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-hive-comb/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-hive-gold" />
            </div>
          )}
        </div>

        {/* Order main info summary */}
        <div className="flex flex-col justify-between py-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-hive-dark select-all">
                {order.id}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>

            <p className="text-[11px] text-hive-text-muted font-bold">
              Ordered on {formatDate(order.createdAt)} • {itemsCount} {itemsCount === 1 ? "Item" : "Items"}
            </p>
          </div>

          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] text-hive-text-muted leading-tight font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-hive-gold" />
              <span>
                {order.status === "delivered" ? "Delivered on" : "Expected on"}:{" "}
                <span className="font-extrabold text-hive-dark">{order.deliveryDate}</span>
              </span>
            </p>
            <p className="text-[10px] text-hive-text-muted leading-tight font-medium">
              Slot: <span className="font-extrabold text-hive-dark">{order.deliverySlot}</span>{order.deliverySlotWindow ? ` • ${order.deliverySlotWindow}` : ""}
            </p>
            
            <p className="text-xs font-extrabold text-hive-dark">
              Total Payable: ₹{order.total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

      </div>

      {/* Action button panel */}
      <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-2 pt-3 border-t border-hive-border/20 md:border-t-0 md:pt-0">
        <button
          type="button"
          onClick={() => router.push(`/orders/${order.id}`)}
          className="h-10 px-5 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Track Order</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function OrderStatusBadge({ status }: { status: string }) {
  const getStyles = () => {
    switch (status) {
      case "placed":
        return "text-blue-700 bg-blue-50 border-blue-200/50";
      case "confirmed":
        return "text-indigo-700 bg-indigo-50 border-indigo-200/50";
      case "picked_up":
        return "text-purple-700 bg-purple-50 border-purple-200/50";
      case "out_for_delivery":
        return "text-amber-700 bg-amber-50 border-amber-200/50";
      case "delivered":
        return "text-green-700 bg-green-50 border-green-200/50";
      case "cancelled":
        return "text-red-700 bg-red-50 border-red-200/50";
      default:
        return "text-hive-text-muted bg-hive-cream border-hive-border/50";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "placed": return "Order Placed";
      case "confirmed": return "Confirmed";
      case "picked_up": return "Picked Up";
      case "out_for_delivery": return "Out For Delivery";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return "Processing";
    }
  };

  return (
    <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded-lg uppercase tracking-wider inline-block ${getStyles()}`}>
      {getLabel()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: EmptyOrdersState
// ─────────────────────────────────────────────────────────────────────────────
function EmptyOrdersState({ onRedirect }: { onRedirect: () => void }) {
  return (
    <div className="py-16 text-center space-y-6 max-w-md mx-auto flex flex-col items-center">
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
// Component: OrdersSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrdersSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Title skeleton */}
        <div className="h-8 w-44 bg-hive-comb/15 rounded-xl border-b border-hive-border/20 pb-4" />
        <div className="h-4 w-60 bg-hive-comb/10 rounded-lg -mt-4" />

        {/* Card skeleton stack */}
        <div className="space-y-4 mt-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white border border-hive-border/20 rounded-3xl p-5 h-32 flex justify-between items-center" />
          ))}
        </div>

      </div>
    </div>
  );
}
