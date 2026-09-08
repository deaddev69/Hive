"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  ShoppingBag,
  Clock,
  ChevronRight,
  RotateCcw,
  Check,
  Copy,
  PackageX,
  XCircle,
  MapPin,
  CreditCard,
  Download,
  ShieldCheck,
  Zap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useOrderStore } from "@/store/order-store";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { ReceiptPrinter, ReceiptPrinterStage } from "@/components/checkout/ReceiptPrinter";

// ─────────────────────────────────────────────────────────────────────────────
// Order Confirmation v2
// Hierarchy: Confirmation → Delivery promise → Order summary → Address →
//            Timeline → Actions → Reassurance
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const [mounted, setMounted] = useState(false);
  const [printerStage, setPrinterStage] = useState<ReceiptPrinterStage>("processing");

  const latestOrder = useOrderStore((state) => state.latestOrder);
  const { token } = useSessionStore();

  const queriedOrder = useQuery(
    api.orders.getOrderByNumber,
    orderIdParam ? { orderNumber: orderIdParam } : "skip"
  );

  // Auto-generate invoice PDF (fire-and-forget)
  useEffect(() => {
    if (!queriedOrder?._id) return;

    let cancelled = false;
    (async () => {
      try {
        if (!token || cancelled) return;

        await fetch("/api/invoices/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: queriedOrder._id, token }),
        });
      } catch {
        // Silent fail — customer can still download later via client-side generation
      }
    })();

    return () => { cancelled = true; };
  }, [queriedOrder?._id, token]);

  useEffect(() => {
    setMounted(true);
    // Confirmation animation progression
    const printTimer = setTimeout(() => {
      setPrinterStage("printing");
    }, 500);

    const completeTimer = setTimeout(() => {
      setPrinterStage("complete");
    }, 2400);

    return () => {
      clearTimeout(printTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const isLoading = orderIdParam ? (queriedOrder === undefined) : false;

  if (!mounted || isLoading) {
    return <OrderSuccessSkeleton />;
  }

  // Map queried order properties to match latestOrder store format
  const resolvedOrder = (() => {
    if (orderIdParam && queriedOrder) {
      const notes = queriedOrder.notes || "";
      const paymentMethod = notes.match(/Payment: (\w+)/)?.[1] || "online";
      const deliverySlotStr = notes.split("Slot: ")?.[1] || "";
      const [deliveryDate, ...slotParts] = deliverySlotStr.split(" ");
      const deliverySlot = slotParts.join(" ");

      return {
        id: queriedOrder.orderNumber,
        convexId: queriedOrder._id,
        items: queriedOrder.items.map((item: any) => ({
          productId: item.productId,
          name: item.productName,
          size: item.variantSize,
          price: item.priceAtPurchase,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          boutiqueName: "Hive Express",
          boutiqueId: item.boutiqueId || queriedOrder.boutiqueId || "",
        })),
        subtotal: queriedOrder.subtotal,
        discount: queriedOrder.discount || 0,
        deliveryFee: queriedOrder.deliveryFee || 0,
        codFee: 0,
        total: queriedOrder.total,
        paymentMethod,
        address: {
          id: queriedOrder.addressId,
          name: queriedOrder.deliveryAddress.label,
          phone: "",
          addressLine1: queriedOrder.deliveryAddress.line1,
          addressLine2: queriedOrder.deliveryAddress.line2,
          city: queriedOrder.deliveryAddress.city,
          state: queriedOrder.deliveryAddress.state,
          pincode: queriedOrder.deliveryAddress.pincode,
          isDefault: false,
        },
        deliveryDate: deliveryDate || "",
        deliverySlot: deliverySlot || "",
        deliverySlotWindow: undefined,
        createdAt: new Date(queriedOrder.createdAt).toISOString(),
        status: queriedOrder.status,
        placedDuringClosedHours: queriedOrder.placedDuringClosedHours || false,
        returnsAccepted: queriedOrder.returnsAccepted,
        cancelReason: queriedOrder.cancelReason,
      };
    }
    return latestOrder;
  })();

  // Edge case: if no order session exists, show missing screen
  if (!resolvedOrder) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-20 px-6 text-center select-none animate-[fadeIn_0.3s_ease-out_forwards]">
        <div className="max-w-md w-full bg-white border border-stone-200/80 rounded-2xl p-8 shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-800">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-sans text-2xl font-bold text-stone-900">No Recent Order Found</h1>
            <p className="text-xs text-stone-500 max-w-[280px] mx-auto leading-relaxed">
              We couldn&apos;t locate any recent purchase details for this session. Explore our catalog to discover new styles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Browse Catalog</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = ["cancelled", "declined", "cancelled_by_merchant", "booking_failed"].includes(resolvedOrder.status || "");

  if (isCancelled) {
    return (
      <div className="min-h-screen bg-white py-10 px-4 sm:px-6 select-none text-left flex items-center justify-center">
        <div className="max-w-md w-full">
          <OrderCancelledCard
            orderId={resolvedOrder.id}
            total={resolvedOrder.total}
          />
        </div>
      </div>
    );
  }

  const getEstimatedWindow = (slot: string) => {
    const s = slot.toLowerCase();
    if (s.includes("morning")) return "Expected 10:00 AM – 1:00 PM";
    if (s.includes("afternoon")) return "Expected 1:00 PM – 4:00 PM";
    if (s.includes("evening")) return "Expected 4:00 PM – 7:00 PM";
    if (s.includes("night")) return "Expected 7:00 PM – 9:00 PM";
    return "Within 90 minutes";
  };

  const slotWindow = resolvedOrder.deliverySlotWindow || getEstimatedWindow(resolvedOrder.deliverySlot);

  return (
    <div className="min-h-screen bg-white py-6 sm:py-10 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-lg mx-auto flex flex-col gap-5 animate-[fadeIn_0.3s_ease-out_forwards]">

        {/* Closed Hours Notification (If applicable) */}
        {Boolean((resolvedOrder as any).placedDuringClosedHours) && (
          <div className="w-full py-2.5 px-4 bg-amber-50 border border-amber-200/80 rounded-xl text-center text-xs space-y-0.5 shadow-2xs">
            <span className="font-bold text-amber-950 block">
              After-Hours Order Recorded
            </span>
            <span className="text-amber-800 text-[11px] block">
              Your order has been recorded and will be delivered first thing when 90-min delivery resumes at 9:00 AM.
            </span>
          </div>
        )}

        {/* ── SECTION 1: Confirmation Hero ──────────────────────────────── */}
        <ReceiptPrinter.Root stage={printerStage} className="w-full">
          <ReceiptPrinter.Machine className="w-full">
            <ReceiptPrinter.Screen>
              <ReceiptPrinter.Status />
              <div className="mt-2 space-y-1 text-center">
                <h1 className="text-lg font-bold text-stone-900">
                  {printerStage === "complete" ? "Order confirmed" : "Processing your order…"}
                </h1>
                <p className="text-xs text-stone-500">
                  {printerStage === "complete"
                    ? "Your order has been placed successfully."
                    : "Verifying payment and confirming with the boutique…"}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm border-t border-stone-100 dark:border-stone-800 pt-3 px-1">
                <span className="font-mono font-semibold text-stone-600 text-xs">
                  ORDER #{resolvedOrder.id}
                </span>
                <span className="font-bold text-stone-900">
                  ₹{(resolvedOrder.total / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>
        </ReceiptPrinter.Root>

        {/* ── SECTION 2: Delivery Promise ───────────────────────────────── */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-stone-900">
                90-Min Express Delivery
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {resolvedOrder.deliveryDate || "Today"} · {slotWindow}
              </p>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: Order Summary (compact) ────────────────────────── */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Order Summary
          </h3>

          {/* Item list */}
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {resolvedOrder.items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="relative w-11 h-14 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-200/60">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill sizes="44px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                  <p className="text-[10px] text-stone-500 font-medium">
                    Size: {item.size || "Standard"} · Qty: {item.quantity}
                  </p>
                </div>
                <span className="text-xs font-bold text-stone-900 shrink-0">
                  ₹{((item.price * item.quantity) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span>₹{(resolvedOrder.subtotal / 100).toFixed(2)}</span>
            </div>
            {resolvedOrder.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount</span>
                <span>-₹{(resolvedOrder.discount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-500">
              <span>Express delivery</span>
              <span>{resolvedOrder.deliveryFee === 0 ? "FREE" : `₹${(resolvedOrder.deliveryFee / 100).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-stone-900 pt-2 border-t border-stone-200">
              <span>Total paid</span>
              <span>₹{(resolvedOrder.total / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: Delivery Address ───────────────────────────────── */}
        {resolvedOrder.address && (
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4.5 h-4.5 text-stone-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-stone-900">
                  Delivering to {resolvedOrder.address.name || "Home"}
                </h3>
                {resolvedOrder.address.addressLine1 && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {resolvedOrder.address.addressLine1}
                  </p>
                )}
                <p className="text-xs text-stone-500">
                  {resolvedOrder.address.city || "Kochi"} · {resolvedOrder.address.pincode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 5: Order Status Timeline ─────────────────────────── */}
        <OrderTimeline status={resolvedOrder.status || "pending_confirmation"} />

        {/* ── SECTION 6: Actions ────────────────────────────────────────── */}
        <SuccessActions resolvedOrder={resolvedOrder} />

        {/* ── SECTION 7: Reassurance Strip ──────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-stone-400 font-medium py-2">
          <span className="flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            {resolvedOrder.returnsAccepted === false ? "Final Sale" : "1-Day Easy Returns"}
          </span>
          <span className="select-none">·</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Verified Quality
          </span>
        </div>

      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessSkeleton />}>
      <OrderSuccessContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderCancelledCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderCancelledCard({
  orderId,
  total,
}: {
  orderId: string;
  total?: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTotal = total ? `₹${(total / 100).toFixed(2)}` : "your payment";

  return (
    <div className="w-full bg-white border border-red-200/80 rounded-2xl p-8 sm:p-10 shadow-xs flex flex-col items-center text-center space-y-4 relative overflow-hidden">
      <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-200/60 flex items-center justify-center shadow-2xs">
        <XCircle className="w-8 h-8 stroke-[2]" />
      </div>

      <div className="space-y-1">
        <div className="inline-block px-3 py-1 bg-red-50 border border-red-200 rounded-full text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
          Order Cancelled
        </div>
        <h1 className="font-sans text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Order Cancelled & Refund Initiated
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md font-medium leading-relaxed">
          We&apos;re sorry! Due to stock availability, our fulfillment team was unable to fulfill your order. An instant full refund of <strong className="text-stone-900 font-bold">{formattedTotal}</strong> has been initiated back to your original payment method.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-1 py-2 px-3.5 bg-stone-100 hover:bg-stone-200/80 active:bg-stone-200 transition-colors border border-stone-200/70 rounded-xl inline-flex items-center gap-2 text-xs cursor-pointer"
      >
        <span className="font-semibold text-stone-500">Order ID:</span>
        <span className="font-mono font-bold text-stone-900 tracking-wide">{orderId}</span>
        <div className="w-4 h-4 flex items-center justify-center text-stone-400">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3 h-3" />}
        </div>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderTimeline (horizontal stepper)
// ─────────────────────────────────────────────────────────────────────────────
function OrderTimeline({ status }: { status: string }) {
  const isCancelledOrRefunded = ["cancelled", "return_requested", "returned", "refunded"].includes(status);

  if (isCancelledOrRefunded) {
    let title = "Order Cancelled";
    let desc = "This order was cancelled.";
    let icon = <PackageX className="w-5 h-5 text-red-500" />;

    if (status === "return_requested" || status === "returned") {
      title = "Return Request Received";
      desc = "Your return request is currently being processed.";
      icon = <RotateCcw className="w-5 h-5 text-amber-500" />;
    } else if (status === "refunded") {
      title = "Refund Processed";
      desc = "Your refund has been issued back to your payment source.";
      icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }

    return (
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs space-y-3 text-left">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Order Status
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-stone-900 text-sm">{title}</h4>
            <p className="text-xs text-stone-500">{desc}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Timeline step mapping ──────────────────────────────────────────────
  // Steps use 0-based indexing internally for the array.
  // currentStepIndex = which step is currently "active" (highlighted).
  const steps = [
    { label: "Paid", desc: "Payment received" },
    { label: "Confirmed", desc: "Order accepted" },
    { label: "Out for delivery", desc: "On the way" },
    { label: "Delivered", desc: "Completed" },
  ];

  // Default: step 0 (Paid) — the order has been paid if they reached this page.
  // Map backend statuses to the correct step index.
  let currentStepIndex = 0;
  if (["pending_confirmation", "confirmed", "packed"].includes(status)) {
    currentStepIndex = 1;
  } else if (["pickup_scheduled", "picked_up", "in_transit", "out_for_delivery"].includes(status)) {
    currentStepIndex = 2;
  } else if (status === "delivered") {
    currentStepIndex = 3;
  }

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs space-y-3">
      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
        Order Status
      </h3>
      <div className="grid grid-cols-4 gap-1.5 relative">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;

          return (
            <div key={idx} className="flex flex-col items-center text-center space-y-1.5 relative">
              {/* Step indicator */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-stone-900 text-white"
                    : isActive
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                    : "bg-stone-100 text-stone-400 border border-stone-200"
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <div className="space-y-0.5">
                <span className={`text-[10px] font-bold block leading-tight ${isActive || isCompleted ? "text-stone-900" : "text-stone-400"}`}>
                  {step.label}
                </span>
                <span className="text-[9px] text-stone-400 block leading-tight hidden sm:block">
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: SuccessActions
// ─────────────────────────────────────────────────────────────────────────────
function SuccessActions({ resolvedOrder }: { resolvedOrder: any }) {
  const router = useRouter();
  const { downloadInvoiceByOrderId, downloadFromOrderData, isDownloading, isError, isSuccess, errorMessage } = useInvoiceDownload();
  const isCancelled = ["cancelled", "declined", "cancelled_by_merchant", "booking_failed"].includes(resolvedOrder?.status || "");

  const orderId = resolvedOrder?.id || resolvedOrder?.convexId || "ORDER";

  const handleDownload = () => {
    if (resolvedOrder?.convexId) {
      downloadInvoiceByOrderId(resolvedOrder.convexId, resolvedOrder);
    } else {
      downloadFromOrderData(resolvedOrder);
    }
  };

  const downloading = isDownloading(orderId);
  const downloadError = isError(orderId);
  const downloadSuccess = isSuccess(orderId);

  // Determine download button label and style
  let downloadLabel = "Download invoice";
  let downloadIcon = <Download className="w-3.5 h-3.5" />;
  let downloadExtraClass = "";

  if (downloading) {
    downloadLabel = "Generating invoice…";
    downloadIcon = <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  } else if (downloadSuccess) {
    downloadLabel = "Invoice ready ✓";
    downloadIcon = <Check className="w-3.5 h-3.5 text-emerald-600" />;
    downloadExtraClass = "text-emerald-700 border-emerald-200";
  } else if (downloadError) {
    downloadLabel = errorMessage || "Failed — Tap to retry";
    downloadIcon = <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    downloadExtraClass = "text-red-700 border-red-200";
  }

  if (isCancelled) {
    return (
      <div className="w-full space-y-2.5">
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <span>Explore Other Styles</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <a
          href={`https://wa.me/917356019103?text=${encodeURIComponent(`Hi Hive Support, I need help regarding my declined order ${resolvedOrder?.id || ""}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-11 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-amber-700" />
          <span>Need Help? Chat Support</span>
        </a>

        <button
          type="button"
          disabled={downloading}
          onClick={handleDownload}
          className={`w-full h-11 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer ${downloadExtraClass}`}
        >
          {downloadIcon}
          <span>{downloadLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      {/* Primary: Track order */}
      <button
        type="button"
        onClick={() => router.push(resolvedOrder?.convexId ? `/orders/${resolvedOrder.convexId}` : "/orders")}
        className="w-full h-11 bg-stone-950 hover:bg-stone-900 text-white active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
      >
        <span>Track order</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Secondary: Download invoice */}
      <button
        type="button"
        disabled={downloading}
        onClick={handleDownload}
        className={`w-full h-11 bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer ${downloadExtraClass}`}
      >
        {downloadIcon}
        <span>{downloadLabel}</span>
      </button>

      {/* Tertiary: Continue shopping */}
      <button
        type="button"
        onClick={() => router.push("/products")}
        className="w-full h-10 text-stone-500 hover:text-stone-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
      >
        <span>Continue shopping</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loader component
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessSkeleton() {
  return (
    <div className="min-h-screen bg-white py-6 sm:py-10 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-lg mx-auto flex flex-col gap-5">
        {/* Hero skeleton */}
        <div className="h-40 bg-stone-100 border border-stone-200/80 rounded-2xl" />
        {/* Delivery card skeleton */}
        <div className="h-20 bg-stone-100 border border-stone-200/80 rounded-2xl" />
        {/* Order summary skeleton */}
        <div className="h-52 bg-stone-100 border border-stone-200/80 rounded-2xl" />
        {/* Address skeleton */}
        <div className="h-20 bg-stone-100 border border-stone-200/80 rounded-2xl" />
        {/* Timeline skeleton */}
        <div className="h-24 bg-stone-100 border border-stone-200/80 rounded-2xl" />
        {/* Actions skeleton */}
        <div className="space-y-2.5">
          <div className="h-11 bg-stone-200 rounded-xl" />
          <div className="h-11 bg-stone-100 border border-stone-200/80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
