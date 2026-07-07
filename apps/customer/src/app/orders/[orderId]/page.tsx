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
  Phone,
  User,
  Truck,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { useSessionStore } from "@/context/SessionContext";
import { formatCurrency } from "@hive/utils";

// ─────────────────────────────────────────────────────────────────────────────
// /orders/[orderId] — Order Tracking & Details Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [mounted, setMounted] = useState(false);
  const { token } = useSessionStore();

  const order = useQuery(api.orders.getOrderById, {
    orderId: orderId as Id<"orders">,
    token: token || undefined,
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

  // Map every Convex status value → one of the 6 UI timeline steps.
  // Any unmapped status falls back to "placed" (step 1).
  const mapStatus = (s: string): string => {
    const m: Record<string, string> = {
      // Step 1 — Order Placed
      pending_payment:           "placed",
      pending_confirmation:      "placed",
      // Step 2 — Boutique Preparing (confirmed / packed)
      confirmed:                 "confirmed",
      packed:                    "confirmed",
      // Step 3 — Picked Up (en route to customer)
      pickup_scheduled:          "picked_up",
      picked_up:                 "picked_up",
      in_transit:                "picked_up",
      // Step 4 — Out For Delivery
      out_for_delivery:          "out_for_delivery",
      // Step 5 — Delivered (and all post-delivery states)
      delivered:                 "delivered",
      claim_submitted:           "delivered",
      replacement_requested:     "delivered",
      replacement_approved:      "delivered",
      replacement_dispatched:    "delivered",
      replacement_delivered:     "delivered",
      refund_requested:          "delivered",
      refunded:                  "delivered",
      // Cancelled
      cancelled:                 "cancelled",
    };
    return m[s] ?? "placed";
  };
  const uiStatus = mapStatus(order.status);

  const paymentLabel = (m: string) => {
    const map: Record<string, string> = {
      upi: "UPI Payment", card: "Credit / Debit Card",
      netbanking: "Net Banking", wallet: "Digital Wallet", online: "Prepaid (Online)",
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
            {order.driverDetails && <DriverTrackingCard driverDetails={order.driverDetails} />}
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

            <ContextualActionsConvex status={uiStatus} orderId={order._id} cancelReason={order.cancelReason} deliveredAt={order.deliveredAt} />

            {/* Fit Feedback Card — shown only for delivered orders */}
            {uiStatus === "delivered" && (
              <FitFeedbackCard orderId={order._id} items={order.items} />
            )}
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
    { key: "confirmed", label: "Order Confirmed", desc: "Your order has been successfully placed", statuses: ["placed", "pending_confirmation", "confirmed"] },
    { key: "packed", label: "Packing", desc: "Boutique is packing your order", statuses: ["packed", "pickup_scheduled"] },
    { key: "picked_up", label: "Dispatched", desc: "Order handed over to courier", statuses: ["picked_up"] },
    { key: "in_transit", label: "In Transit", desc: "Arriving at your doorstep", statuses: ["in_transit", "out_for_delivery"] },
    { key: "delivered", label: "Delivered", desc: "Order completed — enjoy your outfit!", statuses: ["delivered", "claim_submitted", "refund_requested", "refunded"] },
  ];

  const isCancelled = status === "cancelled" || status === "booking_failed";
  
  // Find current active step index based on statuses array
  let currentIdx = -1;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i]?.statuses?.includes(status)) {
      currentIdx = i;
      break;
    }
  }
  
  // If we couldn't match a status and it's not cancelled, default to the first step
  if (currentIdx === -1 && !isCancelled) currentIdx = 0;

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
                  {formatCurrency((item.priceAtPurchase ?? item.price) * item.quantity)}
                </span>
                <span className="text-[9px] text-hive-text-muted mt-0.5 block">
                  {formatCurrency(item.priceAtPurchase ?? item.price)} × {item.quantity}
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
          <span className="text-hive-dark">{formatCurrency(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center text-green-700 bg-green-50/60 px-2 py-1 rounded-lg border border-green-200/20">
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-green-600" />
              Applied Discount
            </span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span>Delivery Fee</span>
          <span className="text-hive-dark">{deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee)}</span>
        </div>



        <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1">
          <span className="text-sm font-extrabold text-hive-dark">Amount Paid</span>
          <span className="text-sm font-extrabold text-hive-dark">
            {formatCurrency(total)}
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
  deliveredAt,
}: {
  status: string;
  orderId: Id<"orders">;
  cancelReason?: string;
  deliveredAt?: number | null;
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
    const isWithinWindow = deliveredAt ? (Date.now() - deliveredAt) <= 3 * 24 * 60 * 60 * 1000 : true; // Default true if no timestamp
    if (!isWithinWindow) return null;

    return (
      <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3.5">
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-hive-dark">Have quality concerns or need a different size?</h4>
          <p className="text-[10px] text-hive-text-muted leading-relaxed">
            Our 3-Day Return & Refund Policy covers you. Report issues or initiate exchanges easily.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/claims/new?orderId=${orderId}&type=issue`}
            className="flex-1 h-11 border border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Report Issue</span>
            <HelpCircle className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/claims/new?orderId=${orderId}&type=exchange`}
            className="flex-1 h-11 border border-hive-amber text-hive-amber hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Exchange</span>
            <Ticket className="w-3.5 h-3.5" />
          </Link>
        </div>
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
// Component: FitFeedbackCard — post-delivery sizing feedback
// ─────────────────────────────────────────────────────────────────────────────
function FitFeedbackCard({ orderId, items }: { orderId: Id<"orders">; items: any[] }) {
  const existingFeedback = useQuery(api.fitFeedback.getFitFeedbackForOrder, { orderId });
  const submitFeedback = useMutation(api.fitFeedback.submitFitFeedback);
  const [submittedMap, setSubmittedMap] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState<string | null>(null);

  // Build a map of already-submitted feedback
  const feedbackByItem = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (existingFeedback) {
      for (const f of existingFeedback) {
        map[f.orderItemId] = f.fitResponse;
      }
    }
    return { ...map, ...submittedMap };
  }, [existingFeedback, submittedMap]);

  const allAnswered = items.every((item: any) => !!feedbackByItem[item._id]);

  const handleSubmit = async (orderItemId: string, fitResponse: "too_small" | "perfect_fit" | "too_large") => {
    if (submitting) return;
    setSubmitting(orderItemId);
    try {
      await submitFeedback({
        orderId,
        orderItemId: orderItemId as any,
        fitResponse,
      });
      setSubmittedMap(prev => ({ ...prev, [orderItemId]: fitResponse }));
    } catch (err) {
      console.error("Failed to submit fit feedback:", err);
    } finally {
      setSubmitting(null);
    }
  };

  const fitOptions = [
    { value: "too_small" as const, label: "Too Small", icon: "🔻" },
    { value: "perfect_fit" as const, label: "Perfect", icon: "✅" },
    { value: "too_large" as const, label: "Too Large", icon: "🔺" },
  ];

  const responseLabels: Record<string, { label: string; icon: string }> = {
    too_small:   { label: "Too Small", icon: "🔻" },
    perfect_fit: { label: "Perfect Fit", icon: "✅" },
    too_large:   { label: "Too Large", icon: "🔺" },
  };

  if (allAnswered) {
    return (
      <div className="bg-emerald-50/60 border border-emerald-200/50 rounded-3xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-extrabold uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Fit Feedback Submitted</span>
        </div>
        <p className="text-[10px] text-emerald-600/80 font-medium">
          Thanks! Your feedback helps other buyers choose the right size.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider">How Did the Size Fit?</h4>
        <p className="text-[10px] text-hive-text-muted leading-relaxed">
          Quick 1-tap feedback helps future buyers.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => {
          const answered = feedbackByItem[item._id];
          const isSubmitting = submitting === item._id;

          return (
            <div key={item._id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-hive-dark truncate max-w-[180px]">
                  {item.productName ?? item.name}
                </span>
                <span className="text-[9px] font-extrabold text-hive-dark bg-hive-comb px-1.5 py-0.5 rounded-md border border-hive-gold/15">
                  {item.variantSize ?? item.size}
                </span>
              </div>

              {answered ? (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/50">
                  <span>{responseLabels[answered]?.icon}</span>
                  <span>{responseLabels[answered]?.label}</span>
                  <CheckCircle2 className="w-3 h-3 ml-auto" />
                </div>
              ) : (
                <div className="flex gap-2">
                  {fitOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmit(item._id, opt.value)}
                      className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border border-hive-border/60 bg-white text-hive-dark hover:border-hive-amber hover:bg-hive-cream/30 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-sm">{opt.icon}</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
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
  const { token } = useSessionStore();
  const invoice = useQuery(api.invoices.getInvoiceByOrderId, { orderId: orderId as any, token: token || undefined });
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

// ─────────────────────────────────────────────────────────────────────────────
// Component: DriverTrackingCard
// ─────────────────────────────────────────────────────────────────────────────
function DriverTrackingCard({ driverDetails }: { driverDetails: any }) {
  return (
    <div className="bg-white border border-hive-border/60 rounded-3xl p-6 shadow-sm space-y-4 hover:border-hive-gold/30 transition-all duration-300 relative overflow-hidden group">
      {/* Decorative subtle background gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-hive-gold/5 rounded-full blur-3xl group-hover:bg-hive-gold/8 transition-all duration-300" />
      
      <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2.5 flex items-center gap-2">
        <Truck className="w-4 h-4 text-hive-gold animate-bounce" />
        <span>Delivery Partner Assigned</span>
      </h3>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-hive-cream flex items-center justify-center border border-hive-border/30">
            <User className="w-5 h-5 text-hive-dark" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-hive-dark">{driverDetails.name || "Delivery Associate"}</p>
            <p className="text-[10px] text-hive-text-muted font-mono">{driverDetails.vehiclePlate || "Vehicle details pending"}</p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {driverDetails.phone && (
            <a
              href={`tel:${driverDetails.phone}`}
              className="flex-1 sm:flex-initial h-10 px-4 border border-hive-border hover:border-hive-dark hover:bg-hive-cream/30 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-hive-dark"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Driver</span>
            </a>
          )}
          {driverDetails.liveTrackingUrl && (
            <a
              href={driverDetails.liveTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial h-10 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Track Live</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
      
      <p className="text-[10px] text-hive-text-muted/70 font-medium">
        Delivery powered by <span className="font-bold text-hive-dark uppercase">{driverDetails.provider || "Courier Partner"}</span>
      </p>
    </div>
  );
}
