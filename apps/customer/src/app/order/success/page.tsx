"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Scissors
} from "lucide-react";
import { useOrderStore } from "@/store/order-store";

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned Success Page Route Implementation
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderSuccessPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const latestOrder = useOrderStore((state) => state.latestOrder);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <OrderSuccessSkeleton />;
  }

  // Edge case: if no order session exists, show missing screen
  if (!latestOrder) {
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
      case "cod": return "Cash On Delivery (COD)";
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

  const itemCount = latestOrder.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-[900px] mx-auto flex flex-col gap-6 animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        
        {/* Success Hero */}
        <OrderSuccessHero orderId={latestOrder.id} />

        {/* Desktop grid layout: 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel - Delivery schedule & Visual timeline */}
          <div className="md:col-span-7 space-y-6">
            
            <DeliveryConfirmationCard 
              date={latestOrder.deliveryDate} 
              slot={latestOrder.deliverySlot} 
              window={getEstimatedWindow(latestOrder.deliverySlot)} 
            />

            <NextStepsSection />

            {/* Post-Purchase guarantees strip */}
            <PostPurchaseInfo />

          </div>

          {/* Right Panel - Summary & Actions */}
          <div className="md:col-span-5 space-y-6">
            
            <OrderSummaryCard 
              itemCount={itemCount} 
              totalAmount={latestOrder.total} 
              paymentMethod={paymentMethodLabel(latestOrder.paymentMethod)} 
              address={latestOrder.address} 
              items={latestOrder.items}
              showDetails={showDetails}
              onToggleDetails={() => setShowDetails(!showDetails)}
            />

            {/* Action buttons */}
            <SuccessActions />

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

// ─────────────────────────────────────────────────────────────────────────────
// Component: OrderSuccessHero
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessHero({ orderId }: { orderId: string }) {
  return (
    <div className="w-full bg-white border border-hive-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center text-center space-y-4">
      <div className="relative w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center text-green-500 shadow-sm">
        <CheckCircle2 className="w-10 h-10 stroke-[1.8]" />
        <Sparkle className="w-4 h-4 text-hive-gold absolute -top-1 -right-1 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-black text-hive-dark">Order Confirmed</h1>
        <p className="text-xs text-hive-text-muted max-w-md">
          Your boutique order has been successfully placed.
        </p>
      </div>

      <div className="py-2.5 px-4 bg-hive-cream/40 border border-hive-border/60 rounded-xl inline-flex items-center gap-1.5 text-xs">
        <span className="font-bold text-hive-text-muted">Order ID:</span>
        <span className="font-extrabold text-hive-dark select-all">{orderId}</span>
      </div>

      <p className="text-[10px] text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-200/20 font-semibold max-w-lg leading-relaxed">
        Your boutique partner has been notified and will begin preparing your order shortly.
      </p>
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
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <div className="border-b border-hive-border/40 pb-2">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-hive-gold" />
          <span>Delivery & Fitting Window</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs font-bold text-hive-dark">
        <div className="space-y-0.5">
          <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
            Selected Date
          </span>
          <p>{date}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
            Preferred Slot
          </span>
          <p>{slot}</p>
        </div>
      </div>

      <div className="bg-hive-comb/25 border border-hive-gold/15 p-3 rounded-2xl flex items-start gap-2.5">
        <Clock className="w-4.5 h-4.5 text-hive-gold mt-0.5 flex-shrink-0" />
        <div className="text-[10px] text-hive-text leading-relaxed">
          <span className="font-extrabold text-hive-dark block">{window}</span>
          <p className="text-hive-text-muted mt-0.5 leading-normal">
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
function NextStepsSection() {
  const steps = [
    { label: "Order Placed", desc: "Successfully scheduled", active: true },
    { label: "Boutique Confirmation", desc: "Awaiting designer approval", active: false },
    { label: "Pickup Scheduled", desc: "Fits coordinator dispatch", active: false },
    { label: "Out For Delivery", desc: "Doorstep fitting trials", active: false },
    { label: "Delivered", desc: "Alterations finalized", active: false }
  ];

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <div className="border-b border-hive-border/40 pb-2">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider">
          Fittings Journey Timeline
        </h3>
      </div>

      {/* Responsive pipeline: vertical on mobile, horizontal on desktop */}
      <div className="flex flex-col md:flex-row md:justify-between gap-6 relative pt-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex md:flex-col items-start md:items-center text-left md:text-center gap-3 md:gap-1.5 flex-1 relative group">
            
            {/* Horizontal line connector for desktop */}
            {idx < steps.length - 1 && (
              <div className="hidden md:block absolute left-[50%] top-4 w-full h-[1.5px] bg-hive-border/40 group-hover:bg-hive-border transition-colors duration-300 -z-0" />
            )}

            <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-[10px] font-extrabold flex-shrink-0 z-10 transition-all ${
              step.active
                ? "bg-hive-dark border-hive-dark text-hive-gold shadow-sm ring-4 ring-hive-gold/10"
                : "bg-hive-cream/35 border-hive-border/40 text-hive-text-muted"
            }`}>
              {step.active ? "✓" : idx + 1}
            </div>

            <div className="space-y-0.5 text-left md:text-center mt-0.5">
              <span className={`text-[10px] font-extrabold block leading-none ${step.active ? "text-hive-dark font-black" : "text-hive-text-muted/80"}`}>
                {step.label}
              </span>
              <span className="text-[9px] text-hive-text-muted/60 leading-normal block max-w-[110px] sm:mx-auto">
                {step.desc}
              </span>
            </div>
          </div>
        ))}
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
  showDetails,
  onToggleDetails,
}: {
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
  address: any;
  items: any[];
  showDetails: boolean;
  onToggleDetails: () => void;
}) {
  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4 text-left">
      <div className="border-b border-hive-border/40 pb-2 flex justify-between items-center">
        <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider">
          Order Summary
        </h3>
        <span className="text-[10px] font-extrabold text-hive-text-muted">
          {itemCount} {itemCount === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="space-y-2.5 text-xs font-bold text-hive-dark">
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
          <span className="text-sm font-extrabold">₹{totalAmount.toLocaleString("en-IN")}</span>
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
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
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
function SuccessActions() {
  const router = useRouter();
  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={() => router.push("/account/orders")}
        className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm"
      >
        <span>Track Order</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => router.push("/products")}
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
    { title: "48-Hour Replacement Policy", desc: "Try on and swap sizes easily at your door.", icon: RotateCcw },
    { title: "Same-Day Delivery Support", desc: "Hyperlocal couriers handle custom adjustments.", icon: ShieldCheck },
    { title: "Verified Boutique Protection", desc: "Designers construct and ship matching standards.", icon: Award }
  ];

  return (
    <div className="bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm space-y-3.5 text-left">
      <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block">
        Hive Post-Purchase Assurances
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {badges.map((badge, idx) => {
          const IconComponent = badge.icon;
          return (
            <div key={idx} className="flex flex-col gap-2 items-start p-3 bg-hive-cream/35 border border-hive-border/50 rounded-2xl">
              <div className="w-7 h-7 rounded-lg bg-hive-comb/35 flex items-center justify-center border border-hive-border/40 text-hive-dark">
                <IconComponent className="w-3.5 h-3.5 text-hive-gold" />
              </div>
              <div className="space-y-0.5 text-left text-xs">
                <span className="font-extrabold text-hive-dark block text-[10px] leading-tight">
                  {badge.title}
                </span>
                <p className="text-[9px] text-hive-text-muted leading-relaxed mt-1">
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
