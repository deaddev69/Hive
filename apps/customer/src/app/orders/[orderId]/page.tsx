"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  Download,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  FileText,
  AlertCircle,
  Package,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useInvoiceDownload } from "@/hooks/useInvoiceDownload";
import { CustomerPriceBreakdown } from "@/components/checkout/CustomerPriceBreakdown";
import { useSessionStore } from "@/context/SessionContext";
import { formatCurrency, toast } from "@hive/utils";
import BeeLoader from "@/components/shared/BeeLoader";
import { OrderConfirmationPushPrompt } from "@/components/checkout/OrderConfirmationPushPrompt";

// ─────────────────────────────────────────────────────────────────────────────
// Animated Number Ticker Component
// ─────────────────────────────────────────────────────────────────────────────
function NumberTicker({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 600;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{formatCurrency(displayValue).replace(".00", "")}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Framer Motion Animation Variants
// ─────────────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// /orders/[orderId] — High Conversion Post-Purchase Confirmation Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { token } = useSessionStore();
  const { downloading, downloadInvoice } = useInvoiceDownload();

  const order = useQuery(api.orders.getOrderById, {
    orderId: orderId as Id<"orders">,
    token: token || undefined,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trigger celebratory confetti on initial load for active orders
  useEffect(() => {
    if (order && order.status !== "cancelled" && order.status !== "booking_failed") {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.3 },
          colors: ["#F59E0B", "#10B981", "#F5C22B"],
        });
      } catch {
        // Fallback gracefully if canvas context fails
      }
    }
  }, [order]);

  const handleCopyOrderId = (idStr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(idStr);
      setCopied(true);
      toast.success("Order ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted || order === undefined) {
    return (
      <div className="min-h-screen bg-hive-cream/30 dark:bg-neutral-950 flex flex-col items-center justify-center">
        <BeeLoader message="Loading order details..." />
      </div>
    );
  }

  // ── Order Not Found State ──────────────────────────────────────────────────
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

  const isDeclined = order.status === "declined" || order.status === "cancelled_by_merchant";
  const isCancelled = isDeclined || order.status === "cancelled" || order.status === "booking_failed";

  // Parse delivery metadata with smart fallbacks
  const paymentMethodRaw = order.notes?.match(/Payment: (\w+)/)?.[1] ?? "online";
  const deliverySlotStr = order.notes?.split("Slot: ")?.[1] ?? "";
  const [datePart, ...slotParts] = deliverySlotStr.split(" ");
  const parsedSlot = slotParts.join(" ");

  const deliveryDateDisplay = datePart && datePart !== "undefined"
    ? datePart
    : new Date(order.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  const deliverySlotDisplay = parsedSlot && parsedSlot.length > 2
    ? parsedSlot
    : "5:00 PM - 7:00 PM";

  const addr = order.deliveryAddress;
  const formattedAddress = addr
    ? `${addr.line1 || addr.formattedAddress || ""}, ${addr.city || ""} (${addr.pincode || ""})`
    : "Delivery Address";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 pb-16">
      
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Orders</span>
        </Link>
        <span className="font-mono font-bold text-xs tracking-tight text-slate-800 dark:text-zinc-200">
          #{order.orderNumber}
        </span>
        <Link
          href="/contact"
          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
        >
          Need Help?
        </Link>
      </header>

      {/* ── Main Post-Purchase Canvas ────────────────────────────────────────── */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md mx-auto p-4 space-y-4"
      >
        {/* ── Single-State Hero Status Banner ─────────────────────────────────── */}
        {isCancelled ? (
          <motion.div
            variants={itemVariants}
            className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-3xl p-6 text-center space-y-3 shadow-xs"
          >
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400 shadow-inner">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-red-950 dark:text-red-200">Order Cancelled</h1>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">
                This order was cancelled. Any processed payments will be refunded to your original payment method within 24 hours.
              </p>
            </div>
            <div className="inline-block px-3 py-1 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 rounded-full text-xs font-mono font-bold text-red-700 dark:text-red-400">
              ID: {order.orderNumber}
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-white dark:to-zinc-900 border border-emerald-200/80 dark:border-emerald-900/50 rounded-3xl p-6 text-center space-y-4 shadow-sm"
          >
            {/* Subtle background glow mesh */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Spring Animated Checkmark with Ping Ripple */}
            <div className="relative w-16 h-16 mx-auto">
              <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-30" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.18, 1], opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 15 }}
                className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </motion.div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Order Confirmed!
              </h1>
              <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-xs mx-auto">
                We&apos;ve received your order and notified your boutique partner.
              </p>
            </div>

            {/* Interactive Copyable Order ID Pill */}
            <button
              type="button"
              onClick={() => handleCopyOrderId(order.orderNumber)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 shadow-xs hover:border-amber-500 transition-all cursor-pointer group active:scale-95"
            >
              <span>ID: {order.orderNumber}</span>
              <motion.span animate={{ scale: copied ? [1, 1.3, 1] : 1 }}>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                )}
              </motion.span>
            </button>

            <OrderConfirmationPushPrompt userId={order.customerId} />
          </motion.div>
        )}

        {/* ── Order Timeline Tracker ──────────────────────────────────────────── */}
        {!isCancelled && (
          <>
            {/* Delivery & Fitting Slot Schedule Card */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Delivery & Fitting Window
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Order Received
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                  <span className="block text-slate-400 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                    Selected Date
                  </span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100 mt-0.5 block">
                    {deliveryDateDisplay}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                  <span className="block text-slate-400 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                    Preferred Slot
                  </span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100 mt-0.5 block">
                    {deliverySlotDisplay}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Delivering to: <strong className="text-slate-700 dark:text-zinc-300 font-semibold">{formattedAddress}</strong></span>
              </p>
            </motion.div>

            {/* Receipt Ticket Stub & Order Items Breakdown */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 space-y-3.5 shadow-xs"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  Order Summary ({order.items.length} {order.items.length === 1 ? "Item" : "Items"})
                </h2>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  <NumberTicker value={order.total} />
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item: any, idx: number) => (
                  <div key={item._id || idx} className="flex gap-3 items-center">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shrink-0 bg-slate-100">
                      <Image
                        src={item.imageUrl || "/placeholder.png"}
                        alt={item.productName || "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.productName || "Product"}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          Size: {item.variantSize || "Free"}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Qty: {item.quantity || 1}
                        </span>
                      </div>
                      {/* Demoted Elegant Boutique Attribution */}
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                        Fulfilled by {order.boutiqueName || "Boutique Partner"}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 shrink-0">
                      {formatCurrency(item.priceAtPurchase || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <CustomerPriceBreakdown
                subtotal={order.subtotal / 100}
                deliveryFee={order.deliveryFee / 100}
                discount={(order.discount || 0) / 100}
                total={order.total / 100}
                isEstimatedDelivery={false}
                showHelpSection={true}
                className="mt-4 border-t border-slate-100 dark:border-zinc-800 pt-4"
              />
            </motion.div>

            {/* Dynamic Seller Return Policy & Fit Guarantee Card */}
            {(() => {
              const isFinalSale = (order as any).returnsAccepted === false || (order as any).items?.every((i: any) => i.returnsAccepted === false);
              const isDelivered = order.status === "delivered";
              const deliveredTime = order.deliveredAt || order.updatedAt;
              const hoursSinceDelivery = isDelivered ? (Date.now() - deliveredTime) / (1000 * 60 * 60) : 0;
              const isWindowActive = isDelivered && hoursSinceDelivery <= 24;

              if (isFinalSale) {
                return (
                  <motion.div
                    variants={itemVariants}
                    className="relative overflow-hidden bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 flex items-start gap-3 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shrink-0 mt-0.5">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-xs space-y-1">
                      <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Final Sale — Voluntary Returns Disabled</span>
                        <span className="text-[9px] bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full">
                          Seller Policy
                        </span>
                      </h3>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                        This boutique listing is configured as Final Sale. Voluntary returns or size exchanges are disabled. Damaged, defective, or incorrect items remain 100% covered.
                      </p>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  variants={itemVariants}
                  className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-4 flex items-start gap-3 shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <RotateCcw className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-xs space-y-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{isWindowActive ? "1-Day Return Window Active" : "24-Hour Return Policy"}</span>
                      {isWindowActive && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                          {Math.max(0, Math.floor(24 - hoursSinceDelivery))}h Remaining
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                      {isDelivered
                        ? isWindowActive
                          ? "Your 24-hour return window is active. Submit return or exchange requests within 24 hours of delivery."
                          : "Voluntary return window has ended (24h past delivery). Damaged or wrong item claims remain covered."
                        : "Voluntary 24-hour size exchanges and returns will activate upon doorstep delivery."}
                    </p>
                  </div>
                </motion.div>
              );
            })()}
          </>
        )}

        {/* ── High-Conversion Action Button Stack ────────────────────────────── */}
        <motion.div variants={itemVariants} className="pt-2 space-y-2.5">
          {!isCancelled && (
            <div className="space-y-2">
              <Link
                href={`/orders/${order._id}/track`}
                className="relative overflow-hidden w-full py-3.5 bg-hive-amber hover:bg-[#d07b0a] text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-hive-amber/20 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none" />
                <ShoppingBag className="w-4 h-4" />
                <span>Track Order Status</span>
              </Link>

              {/* Dynamic Return Action Button */}
              {(() => {
                const isFinalSale = (order as any).returnsAccepted === false || (order as any).items?.every((i: any) => i.returnsAccepted === false);
                const isDelivered = order.status === "delivered";
                const deliveredTime = order.deliveredAt || order.updatedAt;
                const hoursSinceDelivery = isDelivered ? (Date.now() - deliveredTime) / (1000 * 60 * 60) : 0;
                const isWindowActive = isDelivered && hoursSinceDelivery <= 24;

                if (isFinalSale) {
                  return (
                    <div className="space-y-2">
                      <a
                        href={`https://wa.me/917356019103?text=${encodeURIComponent(`Hi Hive Support, I need help with my Final Sale order ${order.orderNumber} (damaged or incorrect item).`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-amber-300 transition-all cursor-pointer shadow-xs"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-700" />
                        <span>Report Damaged / Incorrect Item</span>
                      </a>
                      <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-medium pt-0.5">
                        <span>Helpline: <a href="tel:+917356019103" className="font-bold text-slate-800 underline">+91 73560 19103</a></span>
                        <span>•</span>
                        <a href={`mailto:support@hivenow.in?subject=Report Damaged/Defective Item Order ${order.orderNumber}`} className="text-slate-800 underline font-medium">Email Support</a>
                      </div>
                    </div>
                  );
                }

                if (isDelivered && isWindowActive) {
                  return (
                    <a
                      href={`mailto:support@hivenow.in?subject=Return/Exchange Request Order ${order.orderNumber}`}
                      className="w-full py-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 border border-amber-300 dark:border-amber-800 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      <span>Request Return / Exchange (24h Window Active)</span>
                    </a>
                  );
                }

                return (
                  <a
                    href={`mailto:support@hivenow.in?subject=Order Issue Order ${order.orderNumber}`}
                    className="w-full py-3 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Report Wrong Item or Defect</span>
                  </a>
                );
              })()}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={downloading}
              onClick={() => downloadInvoice(order._id)}
              className="py-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>{downloading ? "Downloading..." : "Invoice"}</span>
            </button>

            <Link
              href="/shop"
              className="py-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all text-center shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <span>Continue Shopping</span>
            </Link>
          </div>
        </motion.div>

      </motion.main>
    </div>
  );
}
