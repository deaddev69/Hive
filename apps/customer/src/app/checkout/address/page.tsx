"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, CreditCard, ShoppingBag, Landmark, Wallet, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

export default function CheckoutAddressPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const [mounted, setMounted] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  
  // Shipping details state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");

  // Hydration delay protection
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

  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 5000 ? 0 : 99;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !pincode || !phone) {
      alert("Please fill in all required fields.");
      return;
    }
    setIsOrdering(true);
    // Simulate placing order
    setTimeout(() => {
      setIsOrdering(false);
      setOrderPlaced(true);
      clearCart(); // Clear Zustand store
    }, 1500);
  };

  // Success view
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-16 px-6 flex items-center justify-center text-left">
        <div className="max-w-md w-full bg-white border border-hive-border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto text-green-500">
            <CheckCircle2 className="w-10 h-10 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Order Confirmed!</h1>
            <p className="text-xs text-hive-text-muted">
              Thank you for shopping with Hive. Your designer outfit is being packed by the boutique partner.
            </p>
          </div>

          <div className="p-4 bg-hive-cream/40 border border-hive-border/50 rounded-2xl text-left space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Order Number</span>
              <span className="text-hive-dark">#HIVE-{Math.floor(Math.random() * 90000) + 10000}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
              <span>Estimated Delivery</span>
              <span className="text-hive-dark">Today, by 8:00 PM</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-hive-text-muted uppercase tracking-wider border-t border-hive-border/40 pt-2 mt-1">
              <span>Delivery Address</span>
              <span className="text-hive-dark font-semibold">{city}</span>
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

  // Empty checkout state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 mx-auto">
            <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-xl font-bold text-hive-dark">No items to checkout</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              It looks like your shopping bag is empty. Explore our handpicked boutique collections first.
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
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.back()}
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shopping</span>
        </button>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark text-left">
          Secure Checkout
        </h1>

        {/* Form and items grids */}
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Left: Input fields */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Shipping Details */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                1. Delivery Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="name" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="phone" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Mobile Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="address" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                  Street Address
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  placeholder="Flat, House no., Apartment, Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="city" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    disabled
                    value={city}
                    className="h-11 px-4 text-xs border border-hive-border rounded-xl bg-hive-cream/40 text-hive-text-muted font-medium cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="pincode" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Pincode
                  </label>
                  <input
                    id="pincode"
                    type="text"
                    required
                    placeholder="6-digit pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="h-11 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                2. Payment Method
              </h2>

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
                  <span className="text-xs font-bold text-hive-dark">Credit/Debit Card</span>
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
                  <span className="text-xs font-bold text-hive-dark">Net Banking</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Order Review Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <h2 className="text-sm font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Order Summary
              </h2>

              {/* Items List */}
              <div className="flex flex-col gap-4 divide-y divide-hive-border/30 max-h-[300px] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div key={`${item.productId}-${item.size}`} className={`flex gap-3 pt-3 ${index === 0 ? "pt-0 border-t-0" : ""}`}>
                    <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-hive-cream/30 border border-hive-border/20 flex-shrink-0">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-hive-comb/25" />
                      )}
                    </div>
                    <div className="flex-grow text-left">
                      <h4 className="text-xs font-bold text-hive-dark line-clamp-1">{item.name}</h4>
                      <span className="text-[10px] text-hive-text-muted block mt-0.5">Size: {item.size} • Qty: {item.quantity}</span>
                      <span className="text-xs font-extrabold text-hive-dark block mt-1">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total calculations */}
              <div className="space-y-2.5 border-t border-hive-border/40 pt-4">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Boutique Delivery</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Order Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Place Order CTA Button */}
              <button
                type="submit"
                disabled={isOrdering}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isOrdering ? (
                  <span className="w-5 h-5 rounded-full border-2 border-hive-gold border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Place Order (₹{total.toLocaleString("en-IN")})</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
        </form>
      </div>
    </div>
  );
}
