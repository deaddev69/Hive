"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Package, 
  CreditCard, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Award,
  Truck,
  Ticket,
  AlertTriangle
} from "lucide-react";
import { useOrderStore, Order } from "@/store/order-store";

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Order Tracking Details Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [mounted, setMounted] = useState(false);
  
  const orders = useOrderStore((state) => state.orders);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <OrderTrackingSkeleton />;
  }

  // Find the requested order
  const order = orders.find((o) => o.id === orderId) || null;

  // Edge case: order not found
  if (!order) {
    return (
      <div className="min-h-screen bg-hive-cream/30 flex items-center justify-center py-20 px-6 text-center select-none text-left animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200/50 flex items-center justify-center text-red-500">
            <AlertCircle className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Order Not Found</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              We couldn't locate any purchase details associated with the ID: <span className="font-extrabold select-all">{orderId}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/account/orders")}
            className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Back to Purchases</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case "upi": return "UPI Payment";
      case "card": return "Credit / Debit Card";
      case "netbanking": return "Net Banking Portal";
      case "wallet": return "Digital Wallet";
      case "online": return "Prepaid (Online)";
      default: return "Online Checkout";
    }
  };

  const getEstimatedWindow = (slot: string) => {
    const s = slot.toLowerCase();
    if (s.includes("morning")) return "Expected before 1:00 PM";
    if (s.includes("afternoon")) return "Expected before 4:00 PM";
    if (s.includes("evening")) return "Expected before 7:00 PM";
    if (s.includes("night")) return "Expected before 9:00 PM";
    return "Expected within slot time range";
  };

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">
        
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.push("/account/orders")}
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchases</span>
        </button>

        {/* Order Details Header */}
        <OrderDetailsHeader order={order} />

        {/* Dynamic Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-2">
          
          {/* Left panel: Timeline Tracker & Items section */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Timeline */}
            <OrderTrackingTimeline status={order.status} />

            {/* Items display */}
            <OrderItemsSection items={order.items} />

          </div>

          {/* Right panel: Delivery Schedule & Totals summary details */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Delivery address & Slots schedule details */}
            <DeliveryDetailsCard 
              address={order.address}
              date={order.deliveryDate}
              slot={order.deliverySlot}
              window={order.deliverySlotWindow || getEstimatedWindow(order.deliverySlot)}
            />

            {/* Price details summary */}
            <OrderPricesCard 
              subtotal={order.subtotal}
              discount={order.discount}
              deliveryFee={order.deliveryFee}
              codFee={order.codFee}
              total={order.total}
              paymentMethod={paymentMethodLabel(order.paymentMethod)}
            />

            {/* Special Context Actions (Report claims or Cancellation banners) */}
            <PostPurchaseActions order={order} />

          </div>

        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderDetailsHeader
// ─────────────────────────────────────────────────────────────────────────────
function OrderDetailsHeader({ order }: { order: Order }) {
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <div className="w-full bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg font-extrabold text-hive-dark select-all">
            Order {order.id}
          </h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-[11px] text-hive-text-muted font-medium">
          Placed on {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="text-[10px] text-hive-text bg-hive-cream/50 px-3 py-1.5 rounded-xl border border-hive-border/40 inline-flex items-center gap-1.5 font-bold">
        <span>Protected Trial Order</span>
        <ShieldCheck className="w-3.5 h-3.5 text-hive-gold" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderTrackingTimeline
// ─────────────────────────────────────────────────────────────────────────────
function OrderTrackingTimeline({ status }: { status: string }) {
  const pipelineSteps = [
    { key: "placed", label: "Order Placed", desc: "Successfully scheduled" },
    { key: "confirmed", label: "Boutique Confirmed", desc: "Designer approved" },
    { key: "picked_up", label: "Picked Up", desc: "Fits coordinator dispatch" },
    { key: "out_for_delivery", label: "Out For Delivery", desc: "Doorstep fitting trials" },
    { key: "delivered", label: "Delivered", desc: "Garment fits finalized" }
  ];

  // If status is cancelled, timeline statuses are cancelled/greyed out
  const isCancelled = status === "cancelled";
  
  // Find current step index in the pipeline
  const currentIdx = pipelineSteps.findIndex((step) => step.key === status);

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-5 text-left">
      <div className="border-b border-hive-border/40 pb-2">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider">
          Tracking Status
        </h3>
      </div>

      {isCancelled ? (
        <div className="p-4 bg-red-50 border border-red-150 rounded-2xl flex items-start gap-3 text-xs text-red-700 font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <span className="font-extrabold block uppercase tracking-wider text-[10px]">
              Order Cancelled
            </span>
            <p className="leading-relaxed text-red-600/90">
              This shipment will not be processed further. All paid amounts are being returned back to source credentials.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 pt-1">
          {/* Vertical progress line */}
          <div className="absolute left-[11px] top-3.5 bottom-3.5 w-[2px] bg-hive-border/40" />

          {pipelineSteps.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isUpcoming = idx > currentIdx;

            let badgeStyles = "";
            let textStyles = "";

            if (isCompleted) {
              badgeStyles = "bg-green-500 border-green-500 text-white shadow-sm";
              textStyles = "text-hive-dark font-extrabold";
            } else if (isCurrent) {
              badgeStyles = "bg-hive-dark border-hive-dark text-hive-gold ring-4 ring-hive-gold/10 scale-105";
              textStyles = "text-hive-dark font-black";
            } else {
              badgeStyles = "bg-white border-hive-border text-hive-text-muted";
              textStyles = "text-hive-text-muted/75 font-medium";
            }

            return (
              <div key={step.key} className="flex gap-4.5 items-start relative group">
                {/* Node indicator */}
                <div className={`absolute -left-[20px] w-5.5 h-5.5 rounded-full border text-[9px] font-extrabold flex items-center justify-center z-10 transition-all ${badgeStyles}`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>

                <div className="space-y-0.5 mt-0.5">
                  <span className={`text-xs block leading-none ${textStyles}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-hive-text-muted/65 leading-relaxed block font-medium">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderItemsSection
// ─────────────────────────────────────────────────────────────────────────────
function OrderItemsSection({ items }: { items: any[] }) {
  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2 flex items-center gap-1.5">
        <Package className="w-4 h-4 text-hive-gold" />
        <span>Garment Details</span>
      </h3>

      <div className="divide-y divide-hive-border/20 flex flex-col">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            {/* Image */}
            <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-hive-cream/30 border border-hive-border/25 flex-shrink-0">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-hive-comb/30" />
              )}
            </div>

            {/* Description */}
            <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-start text-left gap-2">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                  {item.boutiqueName}
                </span>
                <h4 className="text-xs font-bold text-hive-dark leading-tight">{item.name}</h4>
                <div className="flex gap-2 flex-wrap items-center mt-1">
                  <span className="text-[9px] font-extrabold text-hive-dark bg-hive-comb px-2 py-0.5 rounded-lg border border-hive-gold/15">
                    Size: {item.size}
                  </span>
                  <span className="text-[9px] font-bold text-hive-text-muted">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-hive-dark block">
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] text-hive-text-muted mt-0.5 block">
                  ₹{item.price.toLocaleString("en-IN")} x {item.quantity}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: DeliveryDetailsCard
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryDetailsCard({
  address,
  date,
  slot,
  window,
}: {
  address: any;
  date: string;
  slot: string;
  window: string;
}) {
  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4.5 text-left">
      <div className="border-b border-hive-border/40 pb-2">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-hive-gold" />
          <span>Delivery Details</span>
        </h3>
      </div>

      {/* Recipient Address */}
      <div className="text-xs font-medium text-hive-text leading-relaxed">
        <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block mb-0.5">
          Shipping Address
        </span>
        <p className="font-extrabold text-hive-dark">{address.name}</p>
        <p className="mt-0.5 text-hive-text/90">{address.addressLine1}</p>
        {address.addressLine2 && <p className="text-hive-text/90">{address.addressLine2}</p>}
        <p className="text-hive-text/90">{address.city}, {address.state} - <span className="font-extrabold">{address.pincode}</span></p>
        <p className="text-hive-text-muted font-bold mt-1 text-[10px]">
          Tel: {address.phone}
        </p>
      </div>

      {/* Speed details Slot */}
      <div className="border-t border-hive-border/20 pt-3.5 space-y-1.5">
        <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
          Fitting Schedule
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-hive-dark">
          <div>
            <p className="text-[10px] text-hive-text-muted font-medium">Date</p>
            <p className="mt-0.5">{date}</p>
          </div>
          <div>
            <p className="text-[10px] text-hive-text-muted font-medium">Slot</p>
            <p className="mt-0.5">{slot}</p>
          </div>
        </div>
        
        <p className="text-[10px] text-green-700 bg-green-50 px-2.5 py-1 rounded-xl border border-green-200/50 inline-block font-semibold mt-1.5">
          {window}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderPricesCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderPricesCard({
  subtotal,
  discount,
  deliveryFee,
  codFee,
  total,
  paymentMethod,
}: {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  paymentMethod: string;
}) {
  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
        Billing & Payment
      </h3>

      <div className="space-y-2 text-xs font-semibold text-hive-text-muted">
        <div className="flex justify-between items-center">
          <span>Subtotal</span>
          <span className="text-hive-dark font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center text-green-700 bg-green-50/50 px-2 py-0.5 rounded-lg border border-green-200/20">
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-green-600" />
              <span>Applied Discount</span>
            </span>
            <span>-₹{discount.toLocaleString("en-IN")}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>Delivery Speed Fee</span>
          <span className="text-hive-dark font-medium">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
        </div>



        <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
          <span className="text-xs font-extrabold text-hive-dark">Amount Paid</span>
          <span className="text-sm font-extrabold text-hive-dark">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex justify-between items-center text-[10px] text-hive-text-muted border-t border-hive-border/10 pt-2.5">
          <span>Paid via</span>
          <span className="text-hive-dark font-bold flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span>{paymentMethod}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: PostPurchaseActions (Delivered/Cancelled details)
// ─────────────────────────────────────────────────────────────────────────────
function PostPurchaseActions({ order }: { order: Order }) {
  const router = useRouter();

  if (order.status === "cancelled") {
    return (
      <div className="bg-red-50/60 border border-red-150 rounded-3xl p-5 shadow-sm space-y-2.5 text-left">
        <div className="flex items-center gap-1.5 text-xs text-red-700 font-extrabold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>Cancellation Notice</span>
        </div>
        <div className="text-xs leading-relaxed text-red-700/80 font-medium">
          <span className="font-extrabold block text-red-700 text-[10px] uppercase tracking-wide">
            Reason Specified:
          </span>
          <p className="mt-0.5 italic">
            "{order.cancellationReason || "No cancellation reason provided."}"
          </p>
        </div>
      </div>
    );
  }

  if (order.status === "delivered") {
    return (
      <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3.5 text-left">
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-hive-dark">Have quality concerns or incorrect item received?</h4>
          <p className="text-[10px] text-hive-text-muted leading-relaxed">
            Our 3-Day Return & Refund Policy protects you. Report issues or initiate returns easily.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/claims/new?orderId=${order.id}`)}
          className="w-full h-11 border border-hive-amber text-hive-amber hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1 shadow-sm"
        >
          <span>Report An Issue</span>
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderTrackingSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrderTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">
        
        {/* Back Link Skeleton */}
        <div className="h-4 w-24 bg-hive-comb/10 rounded-lg" />

        {/* Header Skeleton */}
        <div className="h-20 w-full bg-white border border-hive-border/20 rounded-3xl" />

        {/* 2 Column Layout Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 space-y-6">
            <div className="h-[220px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
          <div className="md:col-span-5 space-y-6">
            <div className="h-[200px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>

      </div>
    </div>
  );
}

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

