"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, ShieldCheck, ChevronRight, Calendar, Sparkles } from "lucide-react";
import { useAddressStore } from "@/store/address-store";
import { useCartStore } from "@/store/cart-store";

const mockSlots = [
  { id: "slot_1", time: "3:00 PM - 6:00 PM Today", status: "Available", type: "Same-Day Try-On" },
  { id: "slot_2", time: "6:00 PM - 9:00 PM Today", status: "Available", type: "Same-Day Try-On" },
  { id: "slot_3", time: "9:00 AM - 12:00 PM Tomorrow", status: "Available", type: "Standard" },
  { id: "slot_4", time: "12:00 PM - 3:00 PM Tomorrow", status: "Available", type: "Standard" },
];

export default function DeliverySlotPage() {
  const router = useRouter();
  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  const getCartTotal = useCartStore((state) => state.getCartTotal);

  const [mounted, setMounted] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("slot_1");
  const [shippingType, setShippingType] = useState("hyperlocal");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-hive-cream/30 flex items-center justify-center animate-pulse">
        <div className="h-14 w-full max-w-4xl bg-white rounded-3xl" />
      </div>
    );
  }

  const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId) || null;
  const subtotal = getCartTotal();
  const deliveryFee = shippingType === "hyperlocal" ? 99 : 0;
  const total = subtotal + deliveryFee;

  const handleProceedToPayment = () => {
    alert("Proceeding to Razorpay secure payment gateways...");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
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
        <div className="w-full bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-hive-text-muted">
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mt-2">
          
          {/* Left panel: Slots & details */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Address summary card */}
            {selectedAddress && (
              <div className="bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm space-y-2 text-xs font-medium text-hive-text leading-relaxed">
                <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                  Delivering To
                </span>
                <p className="font-extrabold text-hive-dark">{selectedAddress.name}</p>
                <p>{selectedAddress.addressLine1}, {selectedAddress.city} - <span className="font-bold">{selectedAddress.pincode}</span></p>
              </div>
            )}

            {/* Delivery type selectors */}
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                Choose Delivery Speed
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hyperlocal same-day try-on slot option */}
                <button
                  type="button"
                  onClick={() => {
                    setShippingType("hyperlocal");
                    setSelectedSlotId("slot_1");
                  }}
                  className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col gap-2 cursor-pointer transition-all duration-300 text-left ${
                    shippingType === "hyperlocal"
                      ? "border-hive-dark ring-1 ring-hive-dark"
                      : "border-hive-border/50 hover:border-hive-border"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-extrabold text-hive-dark flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-hive-gold" />
                      <span>Hyperlocal Try-On</span>
                    </span>
                    <span className="text-xs font-extrabold text-hive-dark">₹99</span>
                  </div>
                  <p className="text-[10px] text-hive-text-muted leading-relaxed font-medium">
                    Same-day delivery with try-and-buy alterations. Return at the door if fit isn&apos;t perfect.
                  </p>
                </button>

                {/* Standard option */}
                <button
                  type="button"
                  onClick={() => {
                    setShippingType("standard");
                    setSelectedSlotId("slot_3");
                  }}
                  className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col gap-2 cursor-pointer transition-all duration-300 text-left ${
                    shippingType === "standard"
                      ? "border-hive-dark ring-1 ring-hive-dark"
                      : "border-hive-border/50 hover:border-hive-border"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-extrabold text-hive-dark flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-hive-gold" />
                      <span>Standard Delivery</span>
                    </span>
                    <span className="text-xs font-extrabold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md text-[9px] uppercase border border-green-200">
                      FREE
                    </span>
                  </div>
                  <p className="text-[10px] text-hive-text-muted leading-relaxed font-medium">
                    Delivered within 24-48 hours. Standard refund replacements apply.
                  </p>
                </button>
              </div>
            </div>

            {/* Time Slot Picker Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                Select Time Window
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mockSlots
                  .filter((slot) => (shippingType === "hyperlocal" ? slot.type === "Same-Day Try-On" : slot.type === "Standard"))
                  .map((slot) => {
                    const isSelected = slot.id === selectedSlotId;
                    
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`bg-white border rounded-2xl p-4 shadow-sm text-left flex justify-between items-center cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-hive-dark bg-hive-comb/10 ring-1 ring-hive-dark"
                            : "border-hive-border/50 hover:border-hive-border"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 text-xs font-bold text-hive-dark">
                          <span>{slot.time}</span>
                          <span className="text-[9px] text-hive-text-muted font-medium capitalize">
                            Speed: {slot.type}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-4.5 h-4.5 rounded-full bg-hive-dark flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right panel: pricing subtotal summaries */}
          <div className="md:col-span-4 space-y-6">
            
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Order Review
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
                  <span className="text-sm font-extrabold text-hive-dark">Total Amount</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Secure Payment Trigger CTA */}
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-3 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-hive-amber"
              >
                <ShieldCheck className="w-4.5 h-4.5 text-hive-gold stroke-[2.2]" />
                <span>Proceed to Payment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
