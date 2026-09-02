"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  ShoppingBag,
  Calendar,
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
  Sparkles,
  QrCode,
  CheckCheck
} from "lucide-react";
import { useOrderStore } from "@/store/order-store";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { CustomerPriceBreakdown } from "@/components/checkout/CustomerPriceBreakdown";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { ReceiptPrinter, ReceiptPrinterStage } from "@/components/checkout/ReceiptPrinter";

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned Order Success Page Implementation with Tactile Hive Receipt Printer
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
        // Silent fail — customer can still download later
      }
    })();

    return () => { cancelled = true; };
  }, [queriedOrder?._id, token]);

  useEffect(() => {
    setMounted(true);
    // Tactile printer stage progression
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
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center py-20 px-6 text-center select-none animate-[fadeIn_0.3s_ease-out_forwards]">
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-slate-900">No Recent Order Found</h1>
            <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
              We couldn't locate any recent purchase details for this session. Explore our catalog to discover new styles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Browse Catalog</span>
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
      case "netbanking": return "Net Banking";
      case "wallet": return "Digital Wallet";
      case "online": return "Prepaid Online";
      default: return "Prepaid";
    }
  };

  const getEstimatedWindow = (slot: string) => {
    const s = slot.toLowerCase();
    if (s.includes("morning")) return "Expected 10:00 AM - 1:00 PM";
    if (s.includes("afternoon")) return "Expected 1:00 PM - 4:00 PM";
    if (s.includes("evening")) return "Expected 4:00 PM - 7:00 PM";
    if (s.includes("night")) return "Expected 7:00 PM - 9:00 PM";
    return "Scheduled within 90-min window";
  };

  const itemCount = resolvedOrder.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const slotWindow = resolvedOrder.deliverySlotWindow || getEstimatedWindow(resolvedOrder.deliverySlot);
  const orderDateStr = new Date(resolvedOrder.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleReplayPrint = () => {
    setPrinterStage("processing");
    setTimeout(() => {
      setPrinterStage("printing");
    }, 250);
    setTimeout(() => {
      setPrinterStage("complete");
    }, 2300);
  };

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

  return (
    <div className="min-h-screen bg-white py-6 sm:py-10 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-[880px] mx-auto flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out_forwards]">

        {/* Closed Hours Notification (If applicable) */}
        {Boolean((resolvedOrder as any).placedDuringClosedHours) && (
          <div className="w-full py-2.5 px-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-center text-xs space-y-0.5 shadow-2xs">
            <span className="font-bold text-amber-950 block">
              After-Hours Order Recorded
            </span>
            <span className="text-amber-800 text-[11px] block">
              Your order has been recorded and will be dispatched first thing when 90-min delivery resumes at 9:00 AM.
            </span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Tactile Hive Receipt Printer Component */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <ReceiptPrinter.Root stage={printerStage} className="w-full">
              <ReceiptPrinter.Machine className="w-full">
                <ReceiptPrinter.Header>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300 shrink-0" />
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      Order Confirmed & Paid
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {printerStage === "complete" && (
                      <button
                        type="button"
                        onClick={handleReplayPrint}
                        title="Replay Print Animation"
                        className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </ReceiptPrinter.Header>

                <ReceiptPrinter.Screen>
                  <ReceiptPrinter.Status />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-stone-500 border-t border-stone-100 dark:border-stone-800 pt-1.5">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">ORDER #{resolvedOrder.id}</span>
                    <span className="text-stone-900 dark:text-white font-bold">
                      ₹{(resolvedOrder.total / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </ReceiptPrinter.Screen>
              </ReceiptPrinter.Machine>

              <ReceiptPrinter.Output className="w-full">
                <ReceiptPrinter.Paper className="w-full text-left">
                  {/* Receipt Header with Official Hive Logo */}
                  <div className="flex flex-col items-center justify-center pb-3 border-b border-dashed border-stone-300 text-center">
                    <Image
                      src="/hive-logo.png"
                      alt="Hive Now"
                      width={120}
                      height={34}
                      className="h-8 w-auto object-contain mb-1.5"
                      priority
                    />
                    <p className="text-[9.5px] text-stone-500 font-sans tracking-wide">
                      Express 90-Min Dispatch · Kochi
                    </p>
                    <div className="w-full mt-2 text-[10px] font-mono text-stone-600 flex items-center justify-between px-1.5 bg-stone-100/70 rounded-md py-1">
                      <span>{orderDateStr}</span>
                      <span className="font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                        PAID & VERIFIED
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="py-3 border-b border-dashed border-stone-300 space-y-1.5 text-[11px] font-mono">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider pb-0.5">
                      PURCHASED ITEMS
                    </div>
                    {resolvedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-stone-900 truncate">
                            {item.quantity}x {item.name}
                          </p>
                          <p className="text-[9.5px] text-stone-500">
                            Size: {item.size || "Standard"}
                          </p>
                        </div>
                        <span className="font-bold text-stone-900 shrink-0">
                          ₹{((item.price * item.quantity) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary math */}
                  <div className="py-3 border-b border-dashed border-stone-300 space-y-1 text-[10.5px] font-mono">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal</span>
                      <span>₹{(resolvedOrder.subtotal / 100).toFixed(2)}</span>
                    </div>
                    {resolvedOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Discount</span>
                        <span>-₹{(resolvedOrder.discount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-600">
                      <span>Express Delivery</span>
                      <span>{resolvedOrder.deliveryFee === 0 ? "FREE" : `₹${(resolvedOrder.deliveryFee / 100).toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-stone-950 pt-1.5 border-t border-stone-200">
                      <span>TOTAL PAID</span>
                      <span className="text-amber-900">₹{(resolvedOrder.total / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Delivery destination */}
                  <div className="pt-3 pb-2 text-[10px] font-mono space-y-0.5 text-stone-600">
                    <p className="font-bold text-stone-900 uppercase">
                      DESTINATION: {resolvedOrder.address?.name || "Customer"}
                    </p>
                    <p className="truncate text-stone-700">
                      {resolvedOrder.address?.addressLine1 || "Kochi"}, {resolvedOrder.address?.pincode}
                    </p>
                    <p className="text-amber-800 font-bold pt-1">
                      DISPATCH: {resolvedOrder.deliverySlot || "90-Min Express"}
                    </p>
                  </div>

                  {/* Barcode representation */}
                  <div className="pt-3 border-t border-dashed border-stone-300 flex flex-col items-center text-center">
                    <div className="tracking-[0.35em] text-xs font-mono font-black text-stone-800 select-none">
                      ||| | | |||| | ||| || ||||| | ||
                    </div>
                    <span className="text-[8.5px] font-mono text-stone-400 mt-1">
                      {resolvedOrder.id}
                    </span>
                  </div>
                </ReceiptPrinter.Paper>
              </ReceiptPrinter.Output>
            </ReceiptPrinter.Root>
          </div>

          {/* Right Column: Fulfillment Timeline, Trust & Actions */}
          <div className="lg:col-span-6 space-y-4">
            <DeliveryStatusCard
              date={resolvedOrder.deliveryDate}
              slot={resolvedOrder.deliverySlot}
              window={slotWindow}
              status={resolvedOrder.status}
            />

            {/* Post-Purchase Trust Strip */}
            <div className="p-3.5 bg-white border border-stone-200/80 rounded-2xl flex items-center justify-between text-[11px] text-stone-600 font-medium shadow-2xs">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-stone-700" />
                <span>{resolvedOrder.returnsAccepted === false ? "Final Sale (Protected)" : "1-Day Easy Returns"}</span>
              </span>
              <span className="text-stone-300 select-none">•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-700" />
                <span>Verified Quality</span>
              </span>
              <span className="text-stone-300 select-none">•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-700" />
                <span>90-Min Dispatch</span>
              </span>
            </div>

            <SuccessActions resolvedOrder={resolvedOrder} />
          </div>

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
    <div className="w-full bg-white border border-red-200/80 rounded-3xl p-8 sm:p-10 shadow-xs flex flex-col items-center text-center space-y-4 relative overflow-hidden">
      <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-200/60 flex items-center justify-center shadow-2xs">
        <XCircle className="w-8 h-8 stroke-[2]" />
      </div>

      <div className="space-y-1">
        <div className="inline-block px-3 py-1 bg-red-50 border border-red-200 rounded-full text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
          Order Cancelled
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
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
// Component: DeliveryStatusCard (Window + Timeline Stepper)
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryStatusCard({
  date,
  slot,
  window,
  status,
}: {
  date: string;
  slot: string;
  window: string;
  status: string;
}) {
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
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 text-left">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Order Status
        </h3>
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        </div>
      </div>
    );
  }

  // Stepper state
  let currentStepIndex = 1; // Default: Order Confirmed
  if (["pickup_scheduled", "ready_for_pickup"].includes(status)) currentStepIndex = 2;
  else if (["picked_up", "in_transit", "out_for_delivery"].includes(status)) currentStepIndex = 3;
  else if (["delivered"].includes(status)) currentStepIndex = 4;

  const steps = [
    { label: "Payment", desc: "Received" },
    { label: "Confirmed", desc: "Order Accepted" },
    { label: "Out for Delivery", desc: "In Transit" },
    { label: "Delivered", desc: "Completed" },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5 text-left">
      {/* Delivery Schedule Info */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Estimated Delivery
          </span>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-700" />
            <span>{date || "Today"} • {slot || "Standard Delivery"}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Time Slot
          </span>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
            {window}
          </span>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="space-y-3 pt-1">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Fulfillment Timeline
        </h4>
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStepIndex;
            const isActive = stepNum === currentStepIndex;

            return (
              <div key={idx} className="flex flex-col items-center text-center space-y-1.5 relative">
                {/* Step indicator circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? "bg-slate-900 text-white"
                      : isActive
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                </div>
                <div className="space-y-0.5">
                  <span className={`text-[10px] font-bold block leading-tight ${isActive || isCompleted ? "text-slate-900" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                  <span className="text-[9px] text-slate-400 block leading-tight hidden sm:block">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderSummaryCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderSummaryCard({
  itemCount,
  totalAmount,
  subtotal,
  deliveryFee,
  paymentMethod,
  address,
  items,
  boutiqueName,
}: {
  itemCount: number;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  address: any;
  items: any[];
  boutiqueName?: string;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Order Summary
        </h3>
        <span className="text-[11px] font-semibold text-slate-500">
          {itemCount} {itemCount === 1 ? "Item" : "Items"}
        </span>
      </div>

      {/* Item Product Thumbnails */}
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1 border-b border-slate-100 pb-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="relative w-12 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200/60">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Size: {item.size || "Standard"} • Qty: {item.quantity}
              </p>
              {item.boutiqueName && (
                <span className="text-[10px] text-slate-400 block truncate">
                  {item.boutiqueName}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-900 shrink-0">
              ₹{((item.price * item.quantity) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      {/* Price & Address Details */}
      <div className="space-y-2 text-xs font-medium text-slate-600 pt-1">
        <div className="flex justify-between items-center text-slate-500">
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <span>Payment</span>
          </span>
          <span className="font-semibold text-slate-800">{paymentMethod}</span>
        </div>

        {address && (
          <div className="flex justify-between items-center text-slate-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Deliver To</span>
            </span>
            <span className="font-semibold text-slate-800 truncate max-w-[170px]">
              {address.name || "Home"} ({address.pincode})
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <CustomerPriceBreakdown
            subtotal={subtotal / 100}
            deliveryFee={deliveryFee / 100}
            total={totalAmount / 100}
            isEstimatedDelivery={false}
            showHelpSection={true}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: SuccessActions
// ─────────────────────────────────────────────────────────────────────────────
function SuccessActions({ resolvedOrder }: { resolvedOrder: any }) {
  const router = useRouter();
  const { downloadInvoiceByOrderId, downloadFromOrderData, isDownloading } = useInvoiceDownload();
  const isCancelled = ["cancelled", "declined", "cancelled_by_merchant", "booking_failed"].includes(resolvedOrder?.status || "");

  const handleDownload = () => {
    if (resolvedOrder?.convexId) {
      downloadInvoiceByOrderId(resolvedOrder.convexId, resolvedOrder);
    } else {
      downloadFromOrderData(resolvedOrder);
    }
  };

  const downloading = isDownloading(resolvedOrder?.id || resolvedOrder?.convexId || "ORDER");

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
          className="w-full h-11 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? "Generating PDF..." : "Download Order Summary"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      <button
        type="button"
        onClick={() => router.push(resolvedOrder?.convexId ? `/orders/${resolvedOrder.convexId}` : "/orders")}
        className="w-full h-11 bg-stone-950 hover:bg-stone-900 text-white active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
      >
        <span>Track Order Details</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        type="button"
        disabled={downloading}
        onClick={handleDownload}
        className="w-full h-11 bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-800 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-amber-600" />
        <span>{downloading ? "Generating GST PDF..." : "Download Tax Invoice"}</span>
      </button>

      <button
        type="button"
        onClick={() => router.push("/products")}
        className="w-full h-11 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 active:scale-[0.98] transition-all rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Continue Shopping</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loader component
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-[920px] mx-auto flex flex-col gap-6">
        <div className="h-44 bg-white border border-slate-200/80 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-4">
            <div className="h-52 bg-white border border-slate-200/80 rounded-3xl" />
            <div className="h-14 bg-white border border-slate-200/80 rounded-2xl" />
          </div>
          <div className="md:col-span-5 space-y-4">
            <div className="h-64 bg-white border border-slate-200/80 rounded-3xl" />
            <div className="h-28 bg-white border border-slate-200/80 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
