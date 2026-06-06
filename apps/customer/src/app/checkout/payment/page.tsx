"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, ShoppingBag, Landmark, Wallet, Sparkles, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAddressStore } from "@/store/address-store";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutStore } from "@/store/checkout-store";

export default function SecurePaymentPage() {
  const router = useRouter();

  // Zustand State hooks
  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  
  const items = useCartStore((state) => state.items);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const selectedDate = useCheckoutStore((state) => state.selectedDate);
  const selectedSlot = useCheckoutStore((state) => state.selectedSlot);
  const discountAmount = useCheckoutStore((state) => state.discountAmount);
  const clearCheckout = useCheckoutStore((state) => state.clearCheckout);

  const [mounted, setMounted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentType, setPaymentType] = useState("upi");
  
  // Payment fields
  const [vpa, setVpa] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gating redirect filter
  useEffect(() => {
    if (mounted) {
      if (!selectedAddressId) {
        router.replace("/checkout/address");
      } else if (!selectedDate || !selectedSlot) {
        router.replace("/checkout/delivery");
      }
    }
  }, [mounted, selectedAddressId, selectedDate, selectedSlot, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-hive-cream/30 flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-3 border-hive-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId) || null;
  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 5000 ? 0 : 99;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);

    // Simulate Payment gateway processing delay
    setTimeout(() => {
      setIsPaying(false);
      setOrderNumber(`#HIVE-${Math.floor(Math.random() * 90000) + 10000}`);
      setPaymentConfirmed(true);

      // Reset cart and checkout states
      clearCart();
      clearCheckout();
    }, 1800);
  };

  // 1. Success confirmation prompt
  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-16 px-6 flex items-center justify-center text-left">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-green-500">
            <CheckCircle2 className="w-10 h-10 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Payment Successful!</h1>
            <p className="text-xs text-hive-text-muted">
              Order confirmed successfully. Your outfit will be fitted and delivered by the boutique partner.
            </p>
          </div>

          <div className="p-4 bg-hive-cream/40 border border-hive-border/50 rounded-2xl text-left space-y-2.5">
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Order ID</span>
              <span className="text-hive-dark font-extrabold">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Delivery Day</span>
              <span className="text-hive-dark font-extrabold">{selectedDate || "Today"}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Fittings Slot</span>
              <span className="text-hive-dark font-extrabold">{selectedSlot || "Evening"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <span>Continue Shopping</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        <style>{`
          @keyframes scaleUp {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Empty Checkout redirection warning
  if (items.length === 0 && !paymentConfirmed) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 mx-auto">
            <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-xl font-bold text-hive-dark">No payment pending</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              Please check your shopping bag and proceed from checkout address screens.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-6 h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2 shadow-sm"
          >
            <span>Go Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none text-left">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.back()}
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Order Review</span>
        </button>

        {/* Progress Tracker */}
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
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            <span>Order Review</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 text-hive-dark">
            <span className="w-5 h-5 rounded-full bg-hive-dark text-hive-gold flex items-center justify-center text-[10px]">4</span>
            <span>Secure Payment</span>
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark mt-4">
          Secure Payment Gateway
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2">
          
          {/* Left panel: Payment types */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Payment Method cards */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-6">
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType("upi")}
                  className={`flex-1 flex flex-col items-center p-4 rounded-2xl border text-center transition-all ${
                    paymentType === "upi"
                      ? "border-hive-dark bg-hive-comb/20"
                      : "border-hive-border/60 hover:border-hive-border"
                  }`}
                >
                  <Wallet className="w-5 h-5 text-hive-dark mb-2" />
                  <span className="text-xs font-bold text-hive-dark">UPI / GPay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("card")}
                  className={`flex-1 flex flex-col items-center p-4 rounded-2xl border text-center transition-all ${
                    paymentType === "card"
                      ? "border-hive-dark bg-hive-comb/20"
                      : "border-hive-border/60 hover:border-hive-border"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-hive-dark mb-2" />
                  <span className="text-xs font-bold text-hive-dark">Credit Card</span>
                </button>
              </div>

              {/* Form inputs */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                
                {paymentType === "upi" ? (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label htmlFor="upi-vpa" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                      UPI VPA Address
                    </label>
                    <input
                      id="upi-vpa"
                      type="text"
                      required
                      placeholder="e.g. aditi@upi"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label htmlFor="card-number" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                        Card Number
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        required
                        maxLength={16}
                        placeholder="16-digit credit card number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 text-left">
                        <label htmlFor="card-expiry" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                          Expiry MM/YY
                        </label>
                        <input
                          id="card-expiry"
                          type="text"
                          required
                          maxLength={5}
                          placeholder="e.g. 12/28"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <label htmlFor="card-cvv" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                          CVV
                        </label>
                        <input
                          id="card-cvv"
                          type="password"
                          required
                          maxLength={3}
                          placeholder="3 digits"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Secure warning badges */}
                <div className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200/50 p-3.5 rounded-2xl mt-4">
                  <ShieldCheck className="w-4.5 h-4.5 text-green-500 flex-shrink-0" />
                  <span>SSL encrypted checkout. Handcrafted fashion try-and-buy orders are protected.</span>
                </div>

                <button
                  type="submit"
                  disabled={isPaying}
                  className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-4 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isPaying ? (
                    <span className="w-5 h-5 rounded-full border-2 border-hive-gold border-t-transparent animate-spin" />
                  ) : (
                    <span>Pay & Place Order (₹{total.toLocaleString("en-IN")})</span>
                  )}
                </button>
              </form>
            </div>
            
          </div>

          {/* Right panel: Summary billing calculations review */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Order Billing
              </h2>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Items Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-semibold text-green-700">
                    <span>Active Discount</span>
                    <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Delivery Speed Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Amount Payable</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
