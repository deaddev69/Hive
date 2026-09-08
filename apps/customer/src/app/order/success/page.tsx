"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Copy,
  Zap,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Lock,
  Sparkles,
} from "lucide-react";
import { useOrderStore } from "@/store/order-store";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { toast } from "@hive/utils";
import { ScratchRewardCard } from "@/components/checkout/ScratchRewardCard";
import { SponsoredOfferCard } from "@/components/checkout/SponsoredOfferCard";

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned Post-Purchase Confirmation (Lean, Focused, Monetizable)
// Layer 1: Confirmation Hero (Payment successful, amount, order #)
// Layer 2: Delivery Reassurance (90-Min Express, Lucide Zap vector icon)
// Layer 3: Attention Surface (Interactive Scratch Reward & Sponsored Offer)
// Layer 4: Primary & Secondary Actions (View Order Details → & Continue Shopping)
// Layer 5: Trust & Reassurance Strip
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  const latestOrder = useOrderStore((state) => state.latestOrder);
  const { token } = useSessionStore();

  const queriedOrder = useQuery(
    api.orders.getOrderByNumber,
    orderIdParam ? { orderNumber: orderIdParam } : "skip"
  );

  // Queries for post-purchase promotion layers (safe with fallbacks)
  const rewardPromotions = useQuery(api.promotions.getPostPurchasePromotions, {
    placement: "ORDER_SUCCESS_REWARD",
  });
  const sponsoredPromotions = useQuery(api.promotions.getPostPurchasePromotions, {
    placement: "ORDER_SUCCESS_SPONSORED",
  });

  // Auto-generate invoice PDF (fire-and-forget in background)
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
        // Silent fail — invoice still retrievable in Order Details
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queriedOrder?._id, token]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoading = orderIdParam ? queriedOrder === undefined : false;

  if (!mounted || isLoading) {
    return <OrderSuccessSkeleton />;
  }

  // Map queried order properties to match latestOrder store format
  const resolvedOrder = (() => {
    if (orderIdParam && queriedOrder) {
      return {
        id: queriedOrder.orderNumber,
        convexId: queriedOrder._id,
        subtotal: queriedOrder.subtotal,
        discount: queriedOrder.discount || 0,
        deliveryFee: queriedOrder.deliveryFee || 0,
        total: queriedOrder.total,
        createdAt: queriedOrder.createdAt,
      };
    }
    if (latestOrder) {
      return {
        id: latestOrder.id,
        convexId: (latestOrder as any).convexId,
        subtotal: latestOrder.subtotal,
        discount: latestOrder.discount || 0,
        deliveryFee: latestOrder.deliveryFee || 0,
        total: latestOrder.total,
        createdAt: Date.now(),
      };
    }
    // High-fidelity preview fallback
    return {
      id: "HIVE-TL196W-7840",
      convexId: undefined,
      subtotal: 134788,
      discount: 0,
      deliveryFee: 8933,
      total: 143721,
      createdAt: Date.now(),
    };
  })();

  const handleCopyOrderNumber = async () => {
    if (!resolvedOrder.id) return;
    try {
      await navigator.clipboard.writeText(resolvedOrder.id);
      setCopied(true);
      toast.success("Order number copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info("Order #" + resolvedOrder.id);
    }
  };

  const formattedTotal = (resolvedOrder.total / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Calculate dynamic delivery ETA (order time + 90 mins)
  const deliveryEtaTime = (() => {
    try {
      const orderTime = resolvedOrder.createdAt || Date.now();
      const etaDate = new Date(orderTime + 90 * 60 * 1000);
      return etaDate.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return null;
    }
  })();

  const destinationOrderId = resolvedOrder.convexId || resolvedOrder.id;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-6 space-y-3.5 sm:space-y-4 pb-14">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LAYER 1: CONFIRMATION HERO                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative w-full rounded-3xl bg-white border border-stone-200/80 p-6 sm:p-7 shadow-xs text-center overflow-hidden">
        {/* Confetti celebration accents */}
        <div className="relative inline-flex items-center justify-center mb-3">
          {/* Ambient celebration particles */}
          <div className="absolute -top-3 -left-4 text-amber-400 rotate-12 select-none pointer-events-none">
            <Sparkles className="w-4 h-4 fill-amber-300" />
          </div>
          <div className="absolute -top-3.5 -right-4 text-amber-400 -rotate-12 select-none pointer-events-none">
            <Sparkles className="w-4 h-4 fill-amber-300" />
          </div>
          <div className="absolute -bottom-1 -left-5 text-emerald-400 select-none pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          </div>
          <div className="absolute -bottom-1 -right-5 text-amber-400 select-none pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          </div>

          {/* Green checkmark circle */}
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 border-2 border-white">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
        </div>

        {/* Headings */}
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Payment Successful
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
          Your order has been placed successfully.
        </p>

        {/* Copyable Order ID Chip */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-mono font-bold text-stone-600 transition-colors cursor-pointer group"
          >
            <span>Order #{resolvedOrder.id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors" />
            )}
          </button>
        </div>

        {/* Amount Paid */}
        <div className="mt-3.5 pt-3.5 border-t border-stone-100">
          <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            ₹{formattedTotal}
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-stone-400">
            <span>paid securely</span>
            <Lock className="w-3 h-3 text-stone-400 stroke-[2.2]" />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LAYER 2: DELIVERY REASSURANCE (90-MIN EXPRESS)                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section
        onClick={() => router.push(`/orders/${destinationOrderId}`)}
        className="w-full rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-stone-300 transition-colors group"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Amber Vector Icon Container (STRICTLY NO EMOJI) */}
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-500 shadow-2xs shrink-0">
            <Zap className="w-5 h-5 fill-amber-400 text-amber-500 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-900 tracking-tight truncate">
              90-Min Express Delivery
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {deliveryEtaTime
                ? `Today · Expected by ${deliveryEtaTime}`
                : "Today · Within 90 minutes"}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all shrink-0" />
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LAYER 3: ATTENTION SURFACE (REWARDS & SPONSORED OFFERS)             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Slot 1: Gamified Scratch Card Reward */}
      <section>
        <ScratchRewardCard
          orderNumber={resolvedOrder.id}
          promotion={rewardPromotions?.[0]}
        />
      </section>

      {/* Slot 2: Sponsored / Partner Brand Promotion */}
      <section>
        <SponsoredOfferCard promotion={sponsoredPromotions?.[0]} />
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LAYER 4: PRIMARY & SECONDARY ACTIONS                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="space-y-2.5 pt-1">
        {/* Primary CTA: View Order Details */}
        <button
          type="button"
          onClick={() => router.push(`/orders/${destinationOrderId}`)}
          className="w-full h-12 rounded-2xl bg-stone-900 hover:bg-black text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] cursor-pointer"
        >
          <span>View Order Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Secondary CTA: Continue Shopping */}
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="w-full h-12 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90 font-bold text-sm shadow-2xs flex items-center justify-center transition-colors cursor-pointer"
        >
          <span>Continue Shopping</span>
        </button>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LAYER 5: TRUST & SUPPORT REASSURANCE STRIP                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <footer className="pt-2 pb-2">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 sm:gap-6 text-[11px] text-stone-500 font-medium">
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-stone-400 stroke-[2.2]" />
            <span>1-Day Easy Returns</span>
          </div>
          <span className="text-stone-300 select-none">·</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400 stroke-[2.2]" />
            <span>Verified Quality</span>
          </div>
          <span className="text-stone-300 select-none">·</span>
          <a
            href={`https://wa.me/917356019103?text=${encodeURIComponent(
              `Hi Hive Support, I need assistance regarding my order ${resolvedOrder.id}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-stone-400 stroke-[2.2]" />
            <span>Need Help?</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrderSuccessSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-4 animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-64 rounded-3xl bg-stone-100 border border-stone-200/60" />
      {/* Delivery Card Skeleton */}
      <div className="h-20 rounded-2xl bg-stone-100 border border-stone-200/60" />
      {/* Scratch Card Skeleton */}
      <div className="h-36 rounded-3xl bg-stone-100 border border-stone-200/60" />
      {/* Sponsored Banner Skeleton */}
      <div className="h-28 rounded-2xl bg-stone-100 border border-stone-200/60" />
      {/* Action Buttons */}
      <div className="h-12 rounded-2xl bg-stone-200" />
      <div className="h-12 rounded-2xl bg-stone-100 border border-stone-200" />
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
