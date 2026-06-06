"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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
  Ticket,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";

// ─────────────────────────────────────────────────────────────────────────────
// /orders/[orderId] — Order Tracking & Details Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [mounted, setMounted] = useState(false);

  const order = useQuery(api.orders.getOrderById, {
    orderId: orderId as Id<"orders">,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || order === undefined) {
    return <OrderDetailSkeleton />;
  }

  // ── Order not found ───────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="min-h-screen bg-hive-cream/30 flex items-center justify-center py-20 px-6 text-center select-none">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200/50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500 stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Order Not Found</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              We couldn&apos;t locate any order matching ID:{" "}
              <span className="font-extrabold text-hive-dark select-all">{orderId}</span>
            </p>
          </div>
          <Link
            href="/orders"
            className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Back to My Orders</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Map Convex status to UI status
  const mapStatus = (s: string): string => {
    const m: Record<string, string> = {
      pending_payment: "placed", pending_confirmation: "placed",
      confirmed: "confirmed", pickup_scheduled: "confirmed",
      picked_up: "picked_up", in_transit: "picked_up",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered", cancelled: "cancelled",
    };
    return m[s] ?? "placed";
  };
  const uiStatus = mapStatus(order.status);

  const paymentLabel = (m: string) => {
    const map: Record<string, string> = {
      upi: "UPI Payment", card: "Credit / Debit Card",
      netbanking: "Net Banking", wallet: "Digital Wallet", cod: "Cash On Delivery",
    };
    return map[m] ?? "Online Checkout";
  };

  // Extract payment method from notes ("Payment: upi | Slot: ...")
  const paymentMethodRaw = order.notes?.match(/Payment: (\w+)/)?.[1] ?? "online";
  const deliverySlotStr  = order.notes?.split("Slot: ")?.[1] ?? "";
  const [deliveryDate, ...slotParts] = deliverySlotStr.split(" ");
  const deliverySlot = slotParts.join(" ");

  const slotWindow = (() => {
    const s = deliverySlot.toLowerCase();
    if (s.includes("morning")) return "Expected before 1:00 PM";
    if (s.includes("afternoon")) return "Expected before 4:00 PM";
    if (s.includes("evening")) return "Expected before 7:00 PM";
    if (s.includes("night")) return "Expected before 9:00 PM";
    return "Expected within slot time range";
  })();

  const addr = order.deliveryAddress;

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-[960px] mx-auto flex flex-col gap-6">

        {/* Back Navigation */}
        <Link
          href="/orders"
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>

        {/* ── Order Header ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-extrabold text-hive-dark font-mono select-all">
                {order.orderNumber}
              </h1>
              <OrderStatusBadge status={uiStatus} />
            </div>
            <p className="text-[11px] text-hive-text-muted font-medium">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="text-[10px] text-hive-text bg-hive-cream/60 px-3 py-2 rounded-xl border border-hive-border/40 inline-flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-hive-gold" />
            <span>Protected Trial Order</span>
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left: Timeline + Items */}
          <div className="md:col-span-7 space-y-6">
            <TrackingTimeline status={uiStatus} />
            <OrderItemsList items={order.items} />
          </div>

          {/* Right: Delivery + Pricing + Actions */}
          <div className="md:col-span-5 space-y-6">
            <DeliveryCard
              address={{
                name:         addr.label,
                addressLine1: addr.line1,
                addressLine2: addr.line2,
                city:         addr.city,
                state:        addr.state,
                pincode:      addr.pincode,
                phone:        "",
              }}
              date={deliveryDate ?? "—"}
              slot={deliverySlot ?? "—"}
              window={slotWindow}
            />

            <BillingCard
              subtotal={order.subtotal}
              discount={order.discount}
              deliveryFee={order.deliveryFee}
              codFee={0}
              total={order.total}
              paymentMethod={paymentLabel(paymentMethodRaw)}
            />

            <InvoiceInformationCard orderId={order._id} />

            <ContextualActionsConvex status={uiStatus} orderId={order._id} cancelReason={order.cancelReason} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: TrackingTimeline
// ─────────────────────────────────────────────────────────────────────────────
function TrackingTimeline({ status }: { status: string }) {
  const steps = [
    { key: "placed", label: "Order Confirmed", desc: "Your order has been successfully placed" },
    { key: "confirmed", label: "Boutique Preparing", desc: "Designer is crafting your garment" },
    { key: "picked_up", label: "Picked Up", desc: "Fits coordinator is en route to you" },
    { key: "out_for_delivery", label: "Out For Delivery", desc: "Arriving at your doorstep" },
    { key: "delivered", label: "Delivered", desc: "Order completed — enjoy your outfit!" },
  ];

  const isCancelled = status === "cancelled";
  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-5 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2.5">
        Tracking Status
      </h3>

      {isCancelled ? (
        <div className="p-4 bg-red-50 border border-red-200/50 rounded-2xl flex items-start gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div className="space-y-1">
            <span className="font-extrabold block uppercase tracking-wider text-[10px]">
              Order Cancelled
            </span>
            <p className="leading-relaxed text-red-600/90">
              This shipment will not be processed. All paid amounts are being refunded to the source.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative pl-7 space-y-7 pt-1">
          {/* Vertical progress line */}
          <div className="absolute left-[13px] top-4 bottom-4 w-[2px] bg-hive-border/40" />

          {steps.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const upcoming = idx > currentIdx;

            return (
              <div key={step.key} className="flex gap-4 items-start relative">
                {/* Node */}
                <div
                  className={`absolute -left-[22px] w-6 h-6 rounded-full border-2 text-[10px] font-extrabold flex items-center justify-center z-10 transition-all duration-300 ${
                    done
                      ? "bg-green-500 border-green-500 text-white shadow-sm"
                      : active
                      ? "bg-hive-dark border-hive-dark text-hive-gold ring-4 ring-hive-gold/10 scale-110 shadow-md"
                      : "bg-white border-hive-border/50 text-hive-text-muted/60"
                  }`}
                >
                  {done ? "✓" : idx + 1}
                </div>

                <div className="space-y-0.5 ml-0.5">
                  <span
                    className={`text-xs block leading-snug ${
                      done
                        ? "text-hive-dark font-bold"
                        : active
                        ? "text-hive-dark font-black"
                        : "text-hive-text-muted/70 font-medium"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-hive-text-muted/60 leading-relaxed block font-medium">
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
// Component: OrderItemsList — uses Convex orderItems shape
// ─────────────────────────────────────────────────────────────────────────────
function OrderItemsList({ items }: { items: any[] }) {
  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2 flex items-center gap-1.5">
        <Package className="w-4 h-4 text-hive-gold" />
        <span>Items in This Order ({items.length})</span>
      </h3>

      <div className="divide-y divide-hive-border/20">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-hive-cream/30 border border-hive-border/25 flex-shrink-0">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.productName ?? item.name ?? ""} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-hive-comb/30" />
              )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-start gap-2">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-hive-dark leading-tight">{item.productName ?? item.name}</h4>
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-[9px] font-extrabold text-hive-dark bg-hive-comb px-2 py-0.5 rounded-lg border border-hive-gold/15">
                    Size: {item.variantSize ?? item.size}
                  </span>
                  <span className="text-[9px] font-bold text-hive-text-muted">Qty: {item.quantity}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-hive-dark block">
                  ₹{((item.priceAtPurchase ?? item.price) * item.quantity).toLocaleString("en-IN")}
                </span>
                <span className="text-[9px] text-hive-text-muted mt-0.5 block">
                  ₹{(item.priceAtPurchase ?? item.price).toLocaleString("en-IN")} × {item.quantity}
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
// Component: DeliveryCard
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryCard({
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
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2 flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-hive-gold" />
        <span>Delivery Details</span>
      </h3>

      {/* Address */}
      <div className="text-xs font-medium text-hive-text leading-relaxed">
        <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block mb-1">
          Shipping To
        </span>
        <p className="font-extrabold text-hive-dark">{address.name}</p>
        <p className="mt-0.5 text-hive-text/90">{address.addressLine1}</p>
        {address.addressLine2 && <p className="text-hive-text/90">{address.addressLine2}</p>}
        <p className="text-hive-text/90">
          {address.city}, {address.state} —{" "}
          <span className="font-extrabold">{address.pincode}</span>
        </p>
        <p className="text-hive-text-muted font-bold mt-1 text-[10px]">Tel: {address.phone}</p>
      </div>

      {/* Slot */}
      <div className="border-t border-hive-border/20 pt-3.5 space-y-2">
        <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
          Fitting Schedule
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-hive-dark">
          <div>
            <p className="text-[10px] text-hive-text-muted font-medium mb-0.5">Date</p>
            <p>{date}</p>
          </div>
          <div>
            <p className="text-[10px] text-hive-text-muted font-medium mb-0.5">Slot</p>
            <p>{slot}</p>
          </div>
        </div>
        <p className="text-[10px] text-green-700 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200/50 inline-block font-semibold">
          {window}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: BillingCard
// ─────────────────────────────────────────────────────────────────────────────
function BillingCard({
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
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
        Billing & Payment
      </h3>

      <div className="space-y-2 text-xs font-semibold text-hive-text-muted">
        <div className="flex justify-between items-center">
          <span>Subtotal</span>
          <span className="text-hive-dark">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center text-green-700 bg-green-50/60 px-2 py-1 rounded-lg border border-green-200/20">
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-green-600" />
              Applied Discount
            </span>
            <span>-₹{discount.toLocaleString("en-IN")}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>Delivery Fee</span>
          <span className="text-hive-dark">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
        </div>

        {codFee > 0 && (
          <div className="flex justify-between items-center text-hive-amber bg-amber-50/40 px-2 py-1 rounded-lg border border-hive-gold/10">
            <span>COD Surcharge</span>
            <span>+₹{codFee}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1">
          <span className="text-sm font-extrabold text-hive-dark">Amount Paid</span>
          <span className="text-sm font-extrabold text-hive-dark">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex justify-between items-center text-[10px] border-t border-hive-border/10 pt-2">
          <span>Paid via</span>
          <span className="text-hive-dark font-bold flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            {paymentMethod}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: ContextualActionsConvex
// ─────────────────────────────────────────────────────────────────────────────
function ContextualActionsConvex({
  status,
  orderId,
  cancelReason,
}: {
  status: string;
  orderId: Id<"orders">;
  cancelReason?: string;
}) {
  if (status === "cancelled") {
    return (
      <div className="bg-red-50/60 border border-red-200/50 rounded-3xl p-5 shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs text-red-700 font-extrabold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>Cancellation Notice</span>
        </div>
        <p className="text-xs leading-relaxed text-red-600/90 font-medium italic">
          &quot;{cancelReason ?? "No reason provided."}&quot;
        </p>
      </div>
    );
  }

  if (status === "delivered") {
    return (
      <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3.5">
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-hive-dark">Have sizing issues or quality concerns?</h4>
          <p className="text-[10px] text-hive-text-muted leading-relaxed">
            Our 48-Hour Replacement policy covers you. Request modifications or an exchange.
          </p>
        </div>
        <Link
          href={`/claims/new?orderId=${orderId}`}
          className="w-full h-11 border border-hive-amber text-hive-amber hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Report An Issue</span>
          <HelpCircle className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return null;
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
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrderDetailSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none">
      <div className="max-w-[960px] mx-auto flex flex-col gap-6">
        <div className="h-4 w-28 bg-hive-comb/10 rounded-lg" />
        <div className="h-20 w-full bg-white border border-hive-border/20 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-6">
            <div className="h-[240px] bg-white border border-hive-border/20 rounded-3xl" />
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

// ─────────────────────────────────────────────────────────────────────────────
// Component: InvoiceInformationCard
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceInformationCard({ orderId }: { orderId: string }) {
  const invoice = useQuery(api.invoices.getInvoiceByOrderId, { orderId: orderId as any });
  const { downloadInvoiceData, isDownloading } = useInvoiceDownload();

  if (invoice === undefined) {
    return (
      <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm animate-pulse space-y-3">
        <div className="h-4 w-1/3 bg-hive-comb/10 rounded" />
        <div className="h-3.5 w-2/3 bg-hive-comb/10 rounded" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3 text-left">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
          Invoice Information
        </h3>
        <p className="text-xs text-hive-text-muted">No invoice available.</p>
      </div>
    );
  }

  const downloading = isDownloading(invoice._id);

  const formattedDate = new Date(invoice.generatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
        Invoice Information
      </h3>

      <div className="space-y-2.5 text-xs font-bold text-hive-dark">
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Invoice Number</span>
          <span className="text-hive-dark font-mono select-all">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Transaction ID</span>
          <span className="text-hive-dark font-mono select-all">{invoice.transactionId}</span>
        </div>
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Generated Date</span>
          <span className="text-hive-dark font-semibold">{formattedDate}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={downloading}
        onClick={() => downloadInvoiceData(invoice)}
        className="w-full h-11 border border-hive-border text-hive-dark hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 mt-2"
      >
        {downloading ? (
          <span className="w-4 h-4 rounded-full border-2 border-hive-dark border-t-transparent animate-spin" />
        ) : (
          <span>Download Invoice</span>
        )}
      </button>
    </div>
  );
}
