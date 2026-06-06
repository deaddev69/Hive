"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShoppingBag, MapPin, Calendar, Clock, Sparkles, CreditCard, Landmark, Wallet } from "lucide-react";
import { useAddressStore } from "@/store/address-store";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutStore } from "@/store/checkout-store";

export default function OrderReviewPage() {
  const router = useRouter();

  // Zustand stores
  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  
  const items = useCartStore((state) => state.items);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const selectedDate = useCheckoutStore((state) => state.selectedDate);
  const selectedSlot = useCheckoutStore((state) => state.selectedSlot);
  const clearCheckout = useCheckoutStore((state) => state.clearCheckout);

  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderNumber(`#HIVE-${Math.floor(Math.random() * 90000) + 10000}`);
      setOrderConfirmed(true);
      
      // Clear all stores on successful purchase
      clearCart();
      clearCheckout();
    }, 1800);
  };

  // 1. Success Order Overlay View
  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-16 px-6 flex items-center justify-center text-left">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-green-500">
            <CheckCircle2 className="w-10 h-10 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Order Confirmed!</h1>
            <p className="text-xs text-hive-text-muted">
              Thank you for shopping with Hive. Your boutique partner is preparing your designer outfits for delivery.
            </p>
          </div>

          <div className="p-4 bg-hive-cream/40 border border-hive-border/50 rounded-2xl text-left space-y-2.5">
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Order Number</span>
              <span className="text-hive-dark font-extrabold">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Delivery Date</span>
              <span className="text-hive-dark font-extrabold">{selectedDate || "Today"}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Delivery Slot</span>
              <span className="text-hive-dark font-extrabold">{selectedSlot || "Evening"}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider border-t border-hive-border/40 pt-2.5 mt-1.5">
              <span>Delivery Address</span>
              <span className="text-hive-dark font-semibold truncate max-w-[180px]">
                {selectedAddress ? `${selectedAddress.addressLine1}, ${selectedAddress.city}` : "Hyderabad"}
              </span>
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

  // 2. Empty Checkout bag view
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 mx-auto">
            <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-xl font-bold text-hive-dark">No items in checkout</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              Explore designer boutique sarees, kurtas, and fits before finalizing your order review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="px-6 h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest inline-flex items-center gap-2 shadow-sm"
          >
            <span>Browse Products</span>
          </button>
        </div>
      </div>
    );
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
          <span>Back to Slots</span>
        </button>

        {/* Progress Indicator */}
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
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark mt-4">
          Order Review & Payment
        </h1>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2">
          
          {/* Left panel: Address, slot and items reviews */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Address summary review */}
            {selectedAddress ? (
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
                    Change
                  </button>
                </div>
                <div className="text-xs font-medium text-hive-text leading-relaxed">
                  <p className="font-extrabold text-hive-dark">{selectedAddress.name}</p>
                  <p className="mt-0.5">{selectedAddress.addressLine1}</p>
                  {selectedAddress.addressLine2 && <p>{selectedAddress.addressLine2}</p>}
                  <p>{selectedAddress.city}, {selectedAddress.state} - <span className="font-extrabold">{selectedAddress.pincode}</span></p>
                  <p className="text-hive-text-muted mt-2 flex items-center gap-1.5 font-bold">
                    <span>Mobile:</span>
                    <span>{selectedAddress.phone}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-5 rounded-3xl text-xs font-bold text-red-600">
                Please complete address steps first.
              </div>
            )}

            {/* 2. Slot selection review */}
            {selectedDate && selectedSlot && (
              <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-hive-border/40 pb-2">
                  <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-hive-gold" />
                    <span>Delivery Slot Schedule</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => router.push("/checkout/delivery")}
                    className="text-[10px] font-bold text-hive-amber uppercase tracking-wider hover:text-hive-dark transition-colors"
                  >
                    Change
                  </button>
                </div>
                <div className="text-xs font-medium text-hive-text flex flex-col gap-1">
                  <p className="text-hive-dark font-extrabold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-hive-gold" />
                    <span>Date: {selectedDate}</span>
                  </p>
                  <p className="text-hive-text-muted font-bold ml-5.5">
                    Window: {selectedSlot}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Secure payment options select */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-hive-gold" />
                <span>Payment Method</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* UPI Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                    paymentMethod === "upi"
                      ? "border-hive-dark bg-hive-comb/20"
                      : "border-hive-border/60 hover:border-hive-border"
                  }`}
                >
                  <Wallet className="w-5 h-5 text-hive-dark mb-2" />
                  <span className="text-xs font-bold text-hive-dark">UPI / GPay</span>
                </button>

                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                    paymentMethod === "card"
                      ? "border-hive-dark bg-hive-comb/20"
                      : "border-hive-border/60 hover:border-hive-border"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-hive-dark mb-2" />
                  <span className="text-xs font-bold text-hive-dark">Credit Card</span>
                </button>

                {/* Netbanking Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("netbanking")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                    paymentMethod === "netbanking"
                      ? "border-hive-dark bg-hive-comb/20"
                      : "border-hive-border/60 hover:border-hive-border"
                  }`}
                >
                  <Landmark className="w-5 h-5 text-hive-dark mb-2" />
                  <span className="text-xs font-bold text-hive-dark">Netbanking</span>
                </button>
              </div>
            </div>
            
          </div>

          {/* Right panel: readonly items list & summary totals */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Order Review
              </h2>

              {/* Items List */}
              <div className="flex flex-col gap-4 divide-y divide-hive-border/30 max-h-[260px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3 pt-3 first:pt-0 first:border-t-0">
                    <div className="relative w-11 h-15 rounded-lg overflow-hidden bg-hive-cream/30 border border-hive-border/20 flex-shrink-0">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="44px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-hive-comb/25" />
                      )}
                    </div>
                    <div className="flex-grow text-left">
                      <h4 className="text-xs font-bold text-hive-dark line-clamp-1">{item.name}</h4>
                      <span className="text-[10px] text-hive-text-muted block mt-0.5">Size: {item.size} • Qty: {item.quantity}</span>
                      <span className="text-xs font-extrabold text-hive-dark block mt-0.5">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final billing math details */}
              <div className="space-y-2.5 border-t border-hive-border/40 pt-4 mt-1">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Items Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Delivery Speed Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Grand Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Place Order CTA trigger button */}
              <button
                type="button"
                disabled={isProcessing || !selectedAddress || !selectedDate}
                onClick={handlePlaceOrder}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-2 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hive-amber"
              >
                {isProcessing ? (
                  <span className="w-5 h-5 rounded-full border-2 border-hive-gold border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Place Order (₹{total.toLocaleString("en-IN")})</span>
                  </>
                )}
              </button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
