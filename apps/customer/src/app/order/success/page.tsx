"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkle,
  Lock,
  RotateCcw,
  Award,
  List,
  Eye,
  Scissors,
  Check,
  Copy,
  AlertCircle,
  PackageX
} from "lucide-react";
import { useOrderStore } from "@/store/order-store";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned Success Page Route Implementation
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const latestOrder = useOrderStore((state) => state.latestOrder);
  const { token } = useSessionStore();

  const queriedOrder = useQuery(
    api.orders.getOrderByNumber,
    orderIdParam ? { orderNumber: orderIdParam } : "skip"
  );

  // ── Auto-generate invoice PDF (fire-and-forget) ─────────────────────────
  // Runs once when the Convex order ID becomes available.
  // The PDF is generated server-side in /api/invoices/generate and stored
  // in Convex storage so Admin/Boutique panels can access it immediately.
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
          boutiqueName: item.boutiqueName || "Hive Marketplace",
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
      };
    }
    return latestOrder;
  })();

  // Edge case: if no order session exists, show missing screen
  if (!resolvedOrder) {
    return (
      <div className="min-h-screen bg-hive-cream/30 flex items-center justify-center py-20 px-6 text-center select-none text-left animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-sm space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-hive-gold/20 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-hive-gold" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">No Recent Order Found</h1>
            <p className="text-xs text-hive-text-muted max-w-[285px] mx-auto leading-relaxed">
              We couldn't locate any recent purchase details for this session. Explore our catalog to place your first try-on order.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="w-full h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Return To Products</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <style>{`
          @keyframes scaleUp {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
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

  const itemCount = resolvedOrder.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const slotWindow = resolvedOrder.deliverySlotWindow || getEstimatedWindow(resolvedOrder.deliverySlot);

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6 animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">

        {/* Success Hero */}
        <OrderSuccessHero 
          orderId={resolvedOrder.id} 
          placedDuringClosedHours={(resolvedOrder as any).placedDuringClosedHours} 
        />

        {/* Desktop grid layout: 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left Panel - Delivery schedule & Visual timeline */}
          <div className="md:col-span-7 space-y-6">

            <DeliveryConfirmationCard
              date={resolvedOrder.deliveryDate}
              slot={resolvedOrder.deliverySlot}
              window={slotWindow}
            />



            {/* NextStepsSection with status passed in */}
            <NextStepsSection status={resolvedOrder.status} />

            {/* Post-Purchase guarantees strip */}
            <PostPurchaseInfo />

          </div>

          {/* Right Panel - Summary & Actions */}
          <div className="md:col-span-5 space-y-6">

            <OrderSummaryCard
              itemCount={itemCount}
              totalAmount={resolvedOrder.total}
              paymentMethod={paymentMethodLabel(resolvedOrder.paymentMethod)}
              address={resolvedOrder.address}
              items={resolvedOrder.items}
              deliveryDate={resolvedOrder.deliveryDate}
              deliverySlot={resolvedOrder.deliverySlot}
              deliverySlotWindow={slotWindow}
              showDetails={showDetails}
              onToggleDetails={() => setShowDetails(!showDetails)}
              boutiqueName={resolvedOrder.items[0]?.boutiqueName}
            />

            {/* Action buttons */}
            <SuccessActions resolvedOrder={resolvedOrder} />

          </div>

        </div>

      </div>

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
// Component: OrderSuccessHero
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessHero({ 
  orderId, 
  placedDuringClosedHours 
}: { 
  orderId: string; 
  placedDuringClosedHours?: boolean; 
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-hive-cream/40 border border-hive-border/40 rounded-3xl p-8 sm:p-10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col items-center text-center space-y-5 relative overflow-hidden">
      {/* Subtle background glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] h-full bg-gradient-to-b from-hive-gold/5 to-transparent pointer-events-none" />

      <div className="relative w-16 h-16 bg-white border border-hive-gold/20 rounded-full flex items-center justify-center text-hive-gold shadow-sm z-10">
        <div className="absolute inset-0 rounded-full bg-hive-gold/10 animate-ping opacity-75 duration-1000" />
        <CheckCircle2 className="w-9 h-9 stroke-[1.8] relative z-10" />
        <Sparkle className="w-4 h-4 text-hive-gold absolute -top-1 -right-1 animate-pulse" />
      </div>

      <div className="space-y-1.5 z-10">
        <h1 className="font-serif text-3xl font-black text-hive-dark tracking-tight">Order Confirmed</h1>
        <p className="text-[13px] text-hive-text-muted max-w-md font-medium leading-relaxed">
          Your Hive Partner is reviewing your order.<br/>
          You'll receive confirmation shortly.
        </p>
      </div>

      {placedDuringClosedHours && (
        <div className="w-full max-w-md py-3 px-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex flex-col gap-1 text-center text-xs animate-[scaleUp_0.4s_ease-out] z-10">
          <span className="font-extrabold text-amber-800 flex items-center justify-center gap-1">
            ⚠️ Order Placed During Closed Hours
          </span>
          <span className="font-medium text-amber-700">
            This boutique is currently closed. Your order has been successfully placed and payment received, and it will be processed when the boutique opens for its next working hours.
          </span>
        </div>
      )}

      <button 
        onClick={handleCopy}
        className="mt-2 py-2.5 px-4 bg-amber-50/80 hover:bg-amber-100/80 active:bg-amber-100 transition-colors border border-amber-200/50 rounded-xl inline-flex items-center gap-2 text-xs z-10 cursor-pointer"
      >
        <span className="font-bold text-amber-900/60">Order ID:</span>
        <span className="font-black text-amber-900 tracking-wide">{orderId}</span>
        <div className="w-4 h-4 flex items-center justify-center text-amber-900/60 ml-1">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3 h-3" />}
        </div>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: DeliveryConfirmationCard
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryConfirmationCard({
  date,
  slot,
  window,
}: {
  date: string;
  slot: string;
  window: string;
}) {
  return (
    <div className="bg-white border border-hive-border/20 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4 text-left">
      <div className="border-b border-hive-border/40 pb-3">
        <h3 className="text-[11px] font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-hive-gold" />
          <span>Delivery & Fitting Window</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs font-bold text-hive-dark pt-1">
        <div className="space-y-1">
          <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
            Selected Date
          </span>
          <p className="text-sm">{date}</p>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
            Preferred Slot
          </span>
          <p className="text-sm">{slot}</p>
        </div>
      </div>

      <div className="bg-hive-cream/30 border border-hive-border/40 p-3.5 rounded-2xl flex items-start gap-3 mt-2">
        <Clock className="w-4.5 h-4.5 text-hive-gold mt-0.5 flex-shrink-0" />
        <div className="text-[10.5px] text-hive-text leading-relaxed">
          <span className="font-extrabold text-hive-dark block text-xs">{window}</span>
          <p className="text-hive-text-muted mt-1 leading-relaxed">
            A boutique fit agent will deliver the items and assist you with trials or quick alterations on-site.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: NextStepsSection (Timeline Stepper)
// ─────────────────────────────────────────────────────────────────────────────
function NextStepsSection({ status }: { status: string }) {
  // Check for non-happy-path states
  const isCancelledOrRefunded = ["cancelled", "return_requested", "returned", "refunded"].includes(status);

  if (isCancelledOrRefunded) {
    let title = "Order Cancelled";
    let desc = "This order has been cancelled.";
    let icon = <PackageX className="w-6 h-6 text-red-500" />;
    
    if (status === "return_requested" || status === "returned") {
      title = "Return Processed";
      desc = "Your return request is being processed.";
      icon = <RotateCcw className="w-6 h-6 text-amber-500" />;
    } else if (status === "refunded") {
      title = "Refund Issued";
      desc = "Your refund has been successfully processed.";
      icon = <CheckCircle2 className="w-6 h-6 text-green-500" />;
    }

    return (
      <div className="bg-white border border-hive-border/20 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4 text-left">
        <div className="border-b border-hive-border/40 pb-3">
          <h3 className="text-[11px] font-extrabold text-hive-dark uppercase tracking-wider">
            Order Status
          </h3>
        </div>
        <div className="flex items-center gap-4 py-4 px-2">
          <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-hive-border/40 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-hive-dark">{title}</h4>
            <p className="text-xs text-hive-text-muted mt-0.5">{desc}</p>
          </div>
        </div>
      </div>
    );
  }

  // Map status to progress index (0 to 4)
  let currentStepIndex = 0;
  if (["confirmed"].includes(status)) currentStepIndex = 1;
  else if (["packed", "ready_for_pickup"].includes(status)) currentStepIndex = 2;
  else if (["out_for_delivery"].includes(status)) currentStepIndex = 3;
  else if (["delivered"].includes(status)) currentStepIndex = 4;

  const steps = [
    { label: "Payment Received", desc: "Via Razorpay" },
    { label: "Partner Confirmation", desc: "Boutique accepted" },
    { label: "Preparing Order", desc: "Hand-crafting & prep" },
    { label: "Out For Delivery", desc: "Doorstep fitting trials" },
    { label: "Delivered", desc: "Alterations finalized" }
  ];

  return (
    <div className="bg-white border border-hive-border/20 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4 text-left">
      <div className="border-b border-hive-border/40 pb-3">
        <h3 className="text-[11px] font-extrabold text-hive-dark uppercase tracking-wider">
          Fittings Journey Timeline
        </h3>
      </div>

      {/* Responsive pipeline: vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col md:flex-row md:justify-between gap-6 relative pt-4 pb-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div key={idx} className="flex md:flex-col items-start md:items-center text-left md:text-center gap-3 md:gap-2 flex-1 relative group">
              
              {/* Horizontal line connector for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute left-[50%] top-4 w-full h-[2px] bg-neutral-100 z-0">
                  {(isCompleted || isActive) && (
                    <div className={`h-full bg-gradient-to-r from-hive-gold to-hive-dark transition-all duration-700 ease-in-out ${isActive ? "w-1/2" : "w-full"}`} />
                  )}
                </div>
              )}

              {/* Vertical line connector for mobile */}
              {idx < steps.length - 1 && (
                <div className="md:hidden absolute left-4 top-10 w-[2px] h-[calc(100%+8px)] bg-neutral-100 z-0">
                  {(isCompleted || isActive) && (
                    <div className={`w-full bg-gradient-to-b from-hive-gold to-hive-dark transition-all duration-700 ease-in-out ${isActive ? "h-1/2" : "h-full"}`} />
                  )}
                </div>
              )}

              <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-[11px] font-black flex-shrink-0 z-10 transition-all duration-300 ${
                isCompleted 
                  ? "bg-hive-dark border-hive-dark text-hive-gold shadow-sm"
                  : isActive
                  ? "bg-white border-hive-gold text-hive-dark shadow-[0_0_0_4px_rgba(212,175,55,0.1)] ring-1 ring-hive-gold"
                  : "bg-neutral-50 border-hive-border/60 text-hive-text-muted/50"
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>

              <div className="space-y-1 text-left md:text-center mt-1 md:mt-1.5">
                <span className={`text-[10px] uppercase tracking-wider block leading-none ${
                  isCompleted || isActive ? "text-hive-dark font-black" : "text-hive-text-muted/60 font-bold"
                }`}>
                  {step.label}
                </span>
                <span className={`text-[10px] leading-normal block max-w-[110px] sm:mx-auto ${
                  isCompleted || isActive ? "text-hive-text-muted font-medium" : "text-hive-text-muted/40"
                }`}>
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
// Component: OrderSummaryCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderSummaryCard({
  itemCount,
  totalAmount,
  paymentMethod,
  address,
  items,
  deliveryDate,
  deliverySlot,
  deliverySlotWindow,
  showDetails,
  onToggleDetails,
  boutiqueName,
}: {
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
  address: any;
  items: any[];
  deliveryDate: string;
  deliverySlot: string;
  deliverySlotWindow: string;
  showDetails: boolean;
  onToggleDetails: () => void;
  boutiqueName?: string;
}) {
  return (
    <div className="bg-white border border-hive-border/20 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4 text-left">
      {/* Boutique Prestige Badge moved here */}
      <div className="pb-4 mb-2 border-b border-hive-border/30 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-hive-dark border border-hive-gold/30 flex items-center justify-center text-hive-gold font-serif text-xl font-bold flex-shrink-0 select-none shadow-sm">
          {(boutiqueName || "B").charAt(0).toUpperCase()}
        </div>
        <div className="space-y-1.5 mt-0.5">
          <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-widest block leading-none">
            Fulfilled by
          </span>
          <h4 className="text-sm font-black text-hive-dark leading-tight">
            {boutiqueName || "Boutique Partner"}
          </h4>
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-hive-dark bg-gradient-to-r from-amber-50 to-amber-100/50 px-2.5 py-1 rounded-md border border-hive-gold/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <ShieldCheck className="w-3 h-3 text-hive-gold" strokeWidth={2.5} />
            Verified Hive Partner
          </span>
        </div>
      </div>

      <div className="border-b border-hive-border/40 pb-3 flex justify-between items-center mt-4">
        <h3 className="text-[11px] font-extrabold text-hive-dark uppercase tracking-wider">
          Order Summary
        </h3>
        <span className="text-[10px] font-extrabold text-hive-text-muted">
          {itemCount} {itemCount === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="space-y-2.5 text-xs font-bold text-hive-dark">
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Delivery Date</span>
          <span className="text-hive-dark font-semibold">{deliveryDate}</span>
        </div>
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Delivery Slot</span>
          <span className="text-hive-dark font-semibold text-right">{deliverySlot}</span>
        </div>
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Time Window</span>
          <span className="text-hive-dark font-semibold text-right">{deliverySlotWindow}</span>
        </div>
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Payment Method</span>
          <span className="text-hive-dark font-semibold">{paymentMethod}</span>
        </div>
        <div className="flex justify-between items-center text-hive-text-muted">
          <span>Shipping Location</span>
          <span className="text-hive-dark font-semibold max-w-[200px] text-right truncate">
            {address.name} ({address.pincode})
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-hive-border/40 pt-2.5">
          <span className="text-xs font-extrabold">Final Paid</span>
          <span className="text-sm font-extrabold">₹{(totalAmount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Accordion dropdown toggle detail */}
      <div className="border-t border-hive-border/40 pt-3.5 mt-2">
        <button
          type="button"
          onClick={onToggleDetails}
          className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-hive-amber hover:text-hive-dark transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>{showDetails ? "Hide Item Details" : "View Item Details"}</span>
          </span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? "rotate-90" : ""}`} />
        </button>

        {showDetails && (
          <div className="mt-3.5 space-y-3 max-h-[220px] overflow-y-auto pr-1 animate-[fadeIn_0.2s_ease-out]">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs border-b border-hive-border/20 pb-2.5 last:border-b-0 last:pb-0">
                <div className="text-left max-w-[190px]">
                  <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                    {item.boutiqueName}
                  </span>
                  <p className="font-bold text-hive-dark truncate mt-0.5">{item.name}</p>
                  <span className="text-[9px] font-bold text-hive-text-muted">
                    Size: {item.size} • Qty: {item.quantity}
                  </span>
                </div>
                <span className="font-extrabold text-hive-dark flex-shrink-0">
                  ₹{((item.price * item.quantity) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: SuccessActions
// ─────────────────────────────────────────────────────────────────────────────
function SuccessActions({ resolvedOrder }: { resolvedOrder: any }) {
  const router = useRouter();
  const { downloadInvoiceByOrderId, isDownloading } = useInvoiceDownload();

  const handleDownload = () => {
    if (resolvedOrder?.convexId) {
      downloadInvoiceByOrderId(resolvedOrder.convexId);
    }
  };

  const downloading = resolvedOrder?.convexId ? isDownloading(resolvedOrder.convexId) : false;
  const boutiqueId = resolvedOrder?.items?.[0]?.boutiqueId || "";
  const exploreUrl = boutiqueId ? `/products?boutiqueId=${boutiqueId}` : "/products";

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={() => router.push(resolvedOrder?.convexId ? `/orders/${resolvedOrder.convexId}` : "/orders")}
        className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm"
      >
        <span>Track Order</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {resolvedOrder?.convexId && (
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownload}
          className="w-full h-12 border border-hive-border text-hive-dark hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {downloading ? (
            <span className="w-4 h-4 rounded-full border-2 border-hive-dark border-t-transparent animate-spin" />
          ) : (
            <span>Download Invoice</span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => router.push(exploreUrl)}
        className="w-full h-12 border border-hive-border text-hive-dark hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5"
      >
        <span>Continue Shopping</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: PostPurchaseInfo
// ─────────────────────────────────────────────────────────────────────────────
function PostPurchaseInfo() {
  const badges = [
    { title: "3-Day Return & Refund", desc: "Raise requests within 3 days.", icon: RotateCcw },
    { title: "Same-Day Delivery", desc: "Hyperlocal couriers.", icon: ShieldCheck },
    { title: "Verified Boutique", desc: "Matching standards.", icon: Award }
  ];

  return (
    <div className="bg-transparent pt-2 pb-4 space-y-3.5 text-left">
      <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block pl-2">
        Hive Post-Purchase Assurances
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {badges.map((badge, idx) => {
          const IconComponent = badge.icon;
          return (
            <div key={idx} className="flex flex-col gap-2.5 items-start p-4 bg-white border border-hive-border/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] rounded-2xl group hover:border-hive-gold/30 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-hive-cream/40 flex items-center justify-center border border-hive-border/40 text-hive-dark group-hover:bg-hive-dark group-hover:text-hive-gold transition-colors">
                <IconComponent className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 text-left">
                <span className="font-extrabold text-hive-dark block text-[10px] leading-tight">
                  {badge.title}
                </span>
                <p className="text-[10px] text-hive-text-muted leading-snug">
                  {badge.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loader component
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6">

        {/* Hero skeleton */}
        <div className="h-[200px] bg-white border border-hive-border/20 rounded-3xl" />

        {/* 2 columns layout skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 space-y-6">
            <div className="h-[140px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[140px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[140px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
          <div className="md:col-span-5 space-y-6">
            <div className="h-[220px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[100px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>

      </div>
    </div>
  );
}
