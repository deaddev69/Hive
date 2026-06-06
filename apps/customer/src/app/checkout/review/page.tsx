"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShoppingBag, MapPin, Calendar, Clock, Sparkles, CreditCard, Phone, Ticket, AlertCircle, RefreshCw, Ruler, Store, Truck, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutStore } from "@/store/checkout-store";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { getEffectiveCheckoutItems } from "@/lib/getEffectiveCheckoutItems";

export default function OrderReviewPage() {
  const router = useRouter();

  // Zustand state stores
  const storedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const convexAddresses = useQuery(api.addresses.list) ?? [];

  const addresses = convexAddresses.map((a) => ({
    id: a._id,
    name: a.label,
    phone: "9876543210", // Fallback placeholder since phone is not in addresses schema
    addressLine1: a.line1,
    addressLine2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  }));

  const selectedAddressId = storedAddressId || (addresses.find(a => a.isDefault)?.id || addresses[0]?.id || null);

  const items = useCartStore((state) => state.items);
  const checkoutItems = useCheckoutStore((state) => state.checkoutItems);

  const selectedDate = useCheckoutStore((state) => state.selectedDate);
  const selectedSlot = useCheckoutStore((state) => state.selectedSlot);
  const selectedSlotWindow = useCheckoutStore((state) => state.selectedSlotWindow);
  const appliedPromo = useCheckoutStore((state) => state.appliedPromo);
  const discountAmount = useCheckoutStore((state) => state.discountAmount);
  const deliveryInstructions = useCheckoutStore((state) => state.deliveryInstructions);

  const setAppliedPromo = useCheckoutStore((state) => state.setAppliedPromo);
  const setDeliveryInstructions = useCheckoutStore((state) => state.setDeliveryInstructions);

  const [mounted, setMounted] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);

  const activeZones = useQuery(api.serviceability.getActiveZones);

  // Client hydration delay checker
  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId) || null;
  const orderItems = getEffectiveCheckoutItems(items, checkoutItems);
  const subtotal = orderItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Dynamic pricing calculations
  let deliveryFee = subtotal >= 5000 ? 0 : 99;
  if (appliedPromo === "FREESHIP") {
    deliveryFee = 0;
  }
  const taxAmount = 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee + taxAmount);

  // Validation redirect filter
  useEffect(() => {
    if (mounted && activeZones !== undefined) {
      if (!selectedAddressId) {
        router.replace("/checkout/address");
      } else if (!selectedDate || !selectedSlot) {
        router.replace("/checkout/delivery");
      } else if (selectedAddress) {
        const isServiceable = activeZones.some(
          (zone) => zone.city.trim().toLowerCase() === selectedAddress.city.trim().toLowerCase()
        );
        if (!isServiceable) {
          router.replace("/not-serviceable");
        }
      }
    }
  }, [mounted, selectedAddressId, selectedDate, selectedSlot, selectedAddress, activeZones, router]);

  if (!mounted) {
    return <OrderReviewSkeleton />;
  }

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccessMsg(null);
    const code = promoInput.trim().toUpperCase();

    if (!code) return;

    if (code === "WELCOME10") {
      const discount = Math.round(subtotal * 0.1);
      setAppliedPromo("WELCOME10", discount);
      setPromoSuccessMsg("WELCOME10 applied: 10% off discount saved.");
      setPromoInput("");
    } else if (code === "HIVEFIRST") {
      const discount = Math.min(500, subtotal);
      setAppliedPromo("HIVEFIRST", discount);
      setPromoSuccessMsg("HIVEFIRST applied: Flat ₹500 discount saved.");
      setPromoInput("");
    } else if (code === "FREESHIP") {
      setAppliedPromo("FREESHIP", 0);
      setPromoSuccessMsg("FREESHIP applied: Free shipping activated.");
      setPromoInput("");
    } else {
      setPromoError("Invalid coupon code.");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null, 0);
    setPromoSuccessMsg(null);
    setPromoError(null);
  };

  if (orderItems.length === 0 || !selectedAddress || !selectedDate || !selectedSlot) {
    return <OrderReviewSkeleton />;
  }

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.back()}
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Slot Selection</span>
        </button>

        {/* Progress Tracker Progress Indicator */}
        <div className="w-full bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-hive-text-muted max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Delivery Address</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Delivery Speed & Slot</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 text-hive-dark">
            <span className="w-5 h-5 rounded-full bg-hive-dark text-hive-gold flex items-center justify-center text-[10px]">3</span>
            <span>Order Review</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-hive-border text-hive-text flex items-center justify-center text-[10px]">4</span>
            <span>Secure Payment</span>
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark mt-4">
          Order Review & Summary
        </h1>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2 pb-16 sm:pb-0">

          {/* Left Panel: Summaries & Items table */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Address summary review */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-hive-border/40 pb-2">
                <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-hive-gold" />
                  <span>Shipping Address</span>
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/checkout/address")}
                  className="text-[10px] font-bold text-hive-amber uppercase tracking-wider hover:text-hive-dark transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs font-medium text-hive-text leading-relaxed">
                <p className="font-extrabold text-hive-dark">{selectedAddress.name}</p>
                <p className="mt-0.5">{selectedAddress.addressLine1}</p>
                {selectedAddress.addressLine2 && <p>{selectedAddress.addressLine2}</p>}
                <p>{selectedAddress.city}, {selectedAddress.state} - <span className="font-extrabold">{selectedAddress.pincode}</span></p>
                <p className="text-hive-text-muted mt-2.5 flex items-center gap-1.5 font-bold">
                  <Phone className="w-3.5 h-3.5 opacity-60" />
                  <span>{selectedAddress.phone}</span>
                </p>
              </div>
            </div>

            {/* 2. Slot selection review */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-hive-border/40 pb-2">
                <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-hive-gold" />
                  <span>Delivery Speed Schedule</span>
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/checkout/delivery")}
                  className="text-[10px] font-bold text-hive-amber uppercase tracking-wider hover:text-hive-dark transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs font-medium text-hive-text space-y-1.5">
                <p className="text-hive-dark font-extrabold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-hive-gold" />
                  <span>Date: {selectedDate}</span>
                </p>
                <p className="text-hive-text-muted font-bold ml-5.5">
                  Window: {selectedSlotWindow || selectedSlot}
                </p>
                <p className="text-[10px] text-green-700 bg-green-50 border border-green-200/50 px-2.5 py-1 rounded-xl inline-block ml-5.5 font-semibold">
                  Hyperlocal Fit-Agent Included: Try-on and minor alterations supported at the door.
                </p>
              </div>
            </div>

            {/* 3. Items list review */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-hive-gold" />
                <span>Items in Shopping bag</span>
              </h3>

              <div className="divide-y divide-hive-border/30 flex flex-col">
                {orderItems.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-4 py-4.5 first:pt-0 last:pb-0">
                    <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-hive-cream/30 border border-hive-border/20 flex-shrink-0">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-hive-comb/25" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-start text-left gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                          {item.boutiqueName}
                        </span>
                        <h4 className="text-xs font-bold text-hive-dark mt-0.5 line-clamp-1">{item.name}</h4>
                        <span className="inline-flex items-center text-[9px] font-extrabold text-hive-dark bg-hive-comb px-2 py-0.5 rounded-lg mt-1 border border-hive-gold/15">
                          Size: {item.size}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-hive-dark block">
                          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-hive-text-muted mt-0.5 block">
                          ₹{item.price.toLocaleString("en-IN")} x {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Delivery Instructions Order Notes input */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3">
              <label htmlFor="notes" className="text-xs font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-2">
                <span>Courier Instructions (Order Notes)</span>
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="e.g. Leave with building security gate, call before arrival, or ring bell."
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                className="w-full p-4.5 text-xs border border-hive-border/50 rounded-2xl focus:outline-none focus:border-hive-amber bg-white font-medium placeholder:opacity-50"
              />
            </div>
          </div>

          {/* Right Panel: Pricing calculations & trust banners */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Summary pricing totals card */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Order Billing
              </h2>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Items Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                {/* Promo discounts details */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200/20">
                    <span className="flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-green-600 animate-pulse" />
                      <span>Applied Coupon</span>
                    </span>
                    <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Delivery Speed Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Estimated Tax</span>
                  <span>₹{taxAmount}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Payable Amount</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Promo code widget */}
              <div className="border-t border-hive-border/40 pt-4 mt-1 text-left">
                <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block mb-2">
                  Have a Coupon?
                </span>

                {!appliedPromo ? (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium uppercase placeholder:opacity-50"
                    />
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-xl bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all text-xs font-extrabold uppercase shadow-sm"
                    >
                      Apply
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-green-800 flex items-center gap-1 uppercase">
                        {appliedPromo}
                      </span>
                      <span className="text-[9px] text-green-700 font-medium">Coupon active</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-[10px] font-extrabold uppercase tracking-wide text-red-500 hover:text-red-700 bg-transparent hover:bg-red-50/50 px-2 py-1 rounded-lg transition-all"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {promoError && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{promoError}</span>
                  </div>
                )}
                {promoSuccessMsg && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 mt-2">
                    <span>{promoSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Proceed to Payment CTA */}
              <button
                type="button"
                onClick={() => router.push("/checkout/payment")}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-3 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-hive-amber hidden sm:flex"
              >
                <span>Continue To Payment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Mini Trust Strip list */}
            <div className="bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm space-y-3.5 text-left">
              <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block">
                Hive Assurances
              </span>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <Store className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">Verified Boutiques</span>
                    <span className="text-hive-text-muted">Directly hand-woven and dispatched.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <Ruler className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">Measurement Transparency</span>
                    <span className="text-hive-text-muted">Exact tape dimensions specified for size chips.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <Truck className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">Same-Day Delivery Support</span>
                    <span className="text-hive-text-muted">Fittings and alterations agents at door.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">48-Hour Replacement Policy</span>
                    <span className="text-hive-text-muted">Easy exchange and fits protection.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. Sticky Bottom CTA Bar (Mobile Viewports Only) */}
      <div className="fixed bottom-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-md border-t border-hive-border/40 p-4 flex items-center justify-between gap-4 shadow-2xl sm:hidden">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-hive-text-muted">
            Total Payable
          </span>
          <span className="text-base font-extrabold text-hive-dark">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.push("/checkout/payment")}
          className="flex-1 max-w-[200px] h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Pay Now</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading State: OrderReviewSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function OrderReviewSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Back Link Skeleton */}
        <div className="h-4 w-24 bg-hive-comb/10 rounded-lg" />

        {/* Progress Bar Skeleton */}
        <div className="h-14 w-full bg-white border border-hive-border/20 rounded-3xl" />

        {/* Title Skeleton */}
        <div className="h-8 w-60 bg-hive-comb/15 rounded-xl mt-4" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-[140px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[140px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[160px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[280px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
