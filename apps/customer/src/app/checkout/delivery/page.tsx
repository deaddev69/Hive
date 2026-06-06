"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, ShieldCheck, ChevronRight, Calendar, AlertTriangle, Sparkles, MapPin, Phone } from "lucide-react";
import { useAddressStore } from "@/store/address-store";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutStore } from "@/store/checkout-store";

export interface DeliverySlot {
  id: string;
  name: string;
  timeRange: string;
  availability: "Available" | "Limited" | "Full";
}

const mockSlots: DeliverySlot[] = [
  { id: "slot_morning", name: "Morning", timeRange: "10 AM – 1 PM", availability: "Available" },
  { id: "slot_afternoon", name: "Afternoon", timeRange: "1 PM – 4 PM", availability: "Available" },
  { id: "slot_evening", name: "Evening", timeRange: "4 PM – 7 PM", availability: "Limited" },
  { id: "slot_night", name: "Night", timeRange: "6 PM – 9 PM", availability: "Full" },
];

export default function DeliverySlotPage() {
  const router = useRouter();
  
  // Zustand State hooks
  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  
  const selectedDate = useCheckoutStore((state) => state.selectedDate);
  const selectedSlot = useCheckoutStore((state) => state.selectedSlot);
  const setDeliverySelection = useCheckoutStore((state) => state.setDeliverySelection);

  const [mounted, setMounted] = useState(false);
  const [dates, setDates] = useState<{ id: string; label: string }[]>([]);

  // Hydration delay protection & dynamic Date generation
  useEffect(() => {
    setMounted(true);
    
    // Generate next 7 days dynamically
    const generated = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      let label = "";
      if (i === 0) label = "Today";
      else if (i === 1) label = "Tomorrow";
      else {
        label = `${daysOfWeek[d.getDay()]}, ${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
      }
      
      generated.push({
        id: d.toISOString().split("T")[0] ?? String(i),
        label,
      });
    }
    setDates(generated);
  }, []);

  if (!mounted) {
    return <DeliverySlotSkeleton />;
  }

  const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId) || null;
  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 5000 ? 0 : 99;
  const total = subtotal + deliveryFee;

  const handleSelectDate = (dateLabel: string) => {
    setDeliverySelection(dateLabel, selectedSlot || "");
  };

  const handleSelectSlot = (slotName: string) => {
    setDeliverySelection(selectedDate || "", slotName);
  };

  const isContinueEnabled = !!selectedDate && !!selectedSlot;

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
          <span>Back to Address</span>
        </button>

        {/* Progress Indicator */}
        <div className="w-full bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-hive-text-muted max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Delivery Address</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 text-hive-dark">
            <span className="w-5 h-5 rounded-full bg-hive-dark text-hive-gold flex items-center justify-center text-[10px]">2</span>
            <span>Delivery Speed & Slot</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-hive-border text-hive-text flex items-center justify-center text-[10px]">3</span>
            <span>Secure Payment</span>
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark mt-4">
          Select Delivery Slot
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2">
          
          {/* Left panel: Date & Slot Selectors */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Date Selector */}
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                Select Delivery Date
              </span>

              {/* Horizontal Scroll on mobile, wraps on desktop */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin snap-x scroll-smooth sm:flex-wrap">
                {dates.map((date) => {
                  const isSelected = selectedDate === date.label;
                  return (
                    <button
                      key={date.id}
                      type="button"
                      onClick={() => handleSelectDate(date.label)}
                      className={`flex-shrink-0 snap-start px-5 py-3 rounded-2xl border text-xs font-bold transition-all duration-300 ${
                        isSelected
                          ? "bg-hive-dark text-hive-gold border-hive-dark"
                          : "bg-white border-hive-border/50 text-hive-text hover:border-hive-border"
                      }`}
                    >
                      {date.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Slot Selector Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                Select Time Window
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.name;
                  const isFull = slot.availability === "Full";
                  const isLimited = slot.availability === "Limited";

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => handleSelectSlot(slot.name)}
                      className={`bg-white border rounded-3xl p-5 shadow-sm text-left flex flex-col justify-between gap-3 relative transition-all duration-300 ${
                        isFull
                          ? "opacity-45 cursor-not-allowed border-hive-border/30 bg-hive-cream/10"
                          : isSelected
                          ? "border-hive-dark ring-1 ring-hive-dark bg-hive-comb/10"
                          : "border-hive-border/50 hover:border-hive-border"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-extrabold text-hive-dark">{slot.name}</span>
                          <span className="text-hive-text-muted font-semibold">{slot.timeRange}</span>
                        </div>
                        
                        {/* Availability Badges */}
                        <div>
                          {isFull ? (
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded-lg uppercase">
                              Full
                            </span>
                          ) : isLimited ? (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-lg uppercase">
                              Limited
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200/50 px-2 py-0.5 rounded-lg uppercase">
                              Available
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Estimated delivery notes */}
                      <p className="text-[10px] text-hive-text-muted leading-relaxed font-medium">
                        {isFull 
                          ? "All delivery couriers booked for this slot."
                          : isLimited
                          ? "Hyperlocal try-on slots filling fast. Lock in now."
                          : "Standard Try-On slot with flexible local courier windows."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>

          {/* Right panel: summary details review */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Selected Delivery Summary */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Delivery Summary
              </h2>

              <div className="space-y-3 text-xs font-medium text-hive-text leading-relaxed">
                {selectedAddress ? (
                  <div className="flex items-start gap-2 border-b border-hive-border/40 pb-3">
                    <MapPin className="w-4 h-4 text-hive-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-hive-dark block">Shipping Address</span>
                      <p className="text-hive-text-muted font-medium leading-normal mt-0.5">
                        {selectedAddress.name} • {selectedAddress.addressLine1}, {selectedAddress.city} ({selectedAddress.pincode})
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-500 font-bold">No shipping address selected.</p>
                )}

                {/* Selected Date/Time display */}
                <div className="flex items-start gap-2 border-b border-hive-border/40 pb-3">
                  <Calendar className="w-4 h-4 text-hive-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-hive-dark block">Estimated Speed Slot</span>
                    <p className="text-hive-text-muted font-medium leading-normal mt-0.5">
                      {selectedDate && selectedSlot 
                        ? `${selectedDate} (${selectedSlot})`
                        : "Please choose date & slot."}
                    </p>
                  </div>
                </div>

                {/* Estimate details note */}
                {selectedDate && selectedSlot && (
                  <div className="bg-hive-gold/5 border border-hive-gold/15 p-3 rounded-xl flex items-start gap-2 mt-1">
                    <Sparkles className="w-4.5 h-4.5 text-hive-amber flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-hive-text leading-relaxed">
                      Your outfit will be hand-delivered on <span className="font-extrabold">{selectedDate}</span>. Our boutique alterations agent will wait at your doorstep for checkout fittings.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Pricing totals review */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Billing Overview
              </h2>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Cart Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Delivery Speed Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Estimated Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Proceed to Review CTA */}
              <button
                type="button"
                disabled={!isContinueEnabled}
                onClick={() => router.push("/checkout/review")}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-3 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hive-amber"
              >
                <span>Continue To Order Review</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading State: DeliverySlotSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function DeliverySlotSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Back Link Skeleton */}
        <div className="h-4 w-24 bg-hive-comb/10 rounded-lg" />

        {/* Progress Bar Skeleton */}
        <div className="h-14 w-full bg-white border border-hive-border/20 rounded-3xl" />

        {/* Title Skeleton */}
        <div className="h-8 w-64 bg-hive-comb/15 rounded-xl mt-4" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-[80px] w-full bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[80px] w-full bg-white border border-hive-border/20 rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-[120px] bg-white border border-hive-border/20 rounded-3xl" />
              <div className="h-[120px] bg-white border border-hive-border/20 rounded-3xl" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[220px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
