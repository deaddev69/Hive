"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, ArrowRight, Store, Ruler, Truck, RefreshCw, Ticket, Check, AlertCircle, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { CartItemComponent } from "@/components/cart/CartItem";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getCartCount = useCartStore((state) => state.getCartCount);
  const getCartTotal = useCartStore((state) => state.getCartTotal);

  const [mounted, setMounted] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [activePromo, setActivePromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);

  // Hydration delay protection
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <CartPageSkeleton />;
  }

  const itemsCount = getCartCount();
  const subtotal = getCartTotal();

  // Promo Code calculations
  let discountAmount = 0;
  let deliveryFee = subtotal >= 5000 ? 0 : 99;

  if (activePromo === "WELCOME10") {
    discountAmount = Math.round(subtotal * 0.1); // 10% off items subtotal
  } else if (activePromo === "HIVEFIRST") {
    discountAmount = Math.min(500, subtotal); // Flat ₹500 off
  } else if (activePromo === "FREESHIP") {
    deliveryFee = 0; // Waive delivery
  }

  const taxAmount = 0; // Tax is estimated at ₹0 for now
  const total = Math.max(0, subtotal - discountAmount + deliveryFee + taxAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccessMsg(null);
    const code = promoInput.trim().toUpperCase();

    if (!code) return;

    if (code === "WELCOME10") {
      setActivePromo("WELCOME10");
      setPromoSuccessMsg("WELCOME10 applied successfully! 10% off discount saved.");
      setPromoInput("");
    } else if (code === "HIVEFIRST") {
      setActivePromo("HIVEFIRST");
      setPromoSuccessMsg("HIVEFIRST applied successfully! Flat ₹500 discount saved.");
      setPromoInput("");
    } else if (code === "FREESHIP") {
      setActivePromo("FREESHIP");
      setPromoSuccessMsg("FREESHIP applied successfully! Free boutique shipping enabled.");
      setPromoInput("");
    } else {
      setPromoError("Invalid coupon code. Try WELCOME10, HIVEFIRST, or FREESHIP.");
    }
  };

  const handleRemovePromo = () => {
    setActivePromo(null);
    setPromoSuccessMsg(null);
    setPromoError(null);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Empty State View
  // ───────────────────────────────────────────────────────────────────────────
  if (itemsCount === 0) {
    return (
      <div className="min-h-[70vh] bg-hive-cream/30 py-20 px-6 flex items-center justify-center text-left">
        <div className="max-w-md w-full text-center space-y-6 animate-[fadeIn_0.4s_ease-out_forwards]">
          <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 mx-auto relative">
            <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hive-amber opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-hive-amber"></span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Your shopping bag is empty.</h1>
            <p className="text-xs text-hive-text-muted max-w-[290px] mx-auto leading-relaxed font-medium">
              Discover unique handcrafted designer apparel and bespoke alteration services near you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="px-6 h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Browse Products</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/collections")}
              className="px-6 h-12 border border-hive-dark text-hive-dark hover:bg-hive-dark/5 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5"
            >
              <span>Browse Collections</span>
            </button>
          </div>
        </div>
        
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 text-left">
        
        {/* Header Title block */}
        <div className="border-b border-hive-border/40 pb-5">
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark">
              Shopping Bag
            </h1>
            <span className="text-sm text-hive-text-muted font-bold">
              ({itemsCount} {itemsCount === 1 ? "Item" : "Items"})
            </span>
          </div>
          <p className="text-xs text-hive-text-muted mt-1 leading-relaxed">
            Review your boutique selections and try-on configurations before checkout.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Items list */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {items.map((item) => (
              <CartItemComponent key={`${item.productId}-${item.size}`} item={item} />
            ))}

            {/* Back to shopping action */}
            <Link
              href="/products"
              className="self-start text-xs font-extrabold uppercase tracking-widest text-hive-dark hover:text-hive-amber transition-colors duration-200 mt-2 flex items-center gap-1.5 focus:outline-none"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Right: Summary card */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Summary details */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Order Summary
              </h2>

              {/* Pricing breakdown */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                
                {/* Discount display */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-semibold text-green-700 bg-green-50/50 px-2 py-1 rounded-lg border border-green-200/20">
                    <span className="flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-green-600" />
                      <span>Coupon Discount</span>
                    </span>
                    <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Boutique Delivery</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Estimated Tax</span>
                  <span>₹{taxAmount}</span>
                </div>

                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Order Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* 2. Promo Code Input form */}
              <div className="border-t border-hive-border/40 pt-4 mt-1">
                <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block mb-2">
                  Promo / Coupon Code
                </span>
                
                {!activePromo ? (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium placeholder:opacity-50 uppercase"
                    />
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-xl bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all text-xs font-extrabold uppercase tracking-wider shadow-sm"
                    >
                      Apply
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-extrabold text-green-800 flex items-center gap-1 uppercase">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        {activePromo}
                      </span>
                      {activePromo === "WELCOME10" && <span className="text-[9px] text-green-700 font-medium">10% Off Applied</span>}
                      {activePromo === "HIVEFIRST" && <span className="text-[9px] text-green-700 font-medium">₹500 Off Applied</span>}
                      {activePromo === "FREESHIP" && <span className="text-[9px] text-green-700 font-medium">Free Delivery Applied</span>}
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

                {/* Promo Feedback status */}
                {promoError && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 mt-2 bg-red-50 border border-red-200/50 px-2.5 py-1 rounded-xl">
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

              {/* Estimated Delivery Speed banner */}
              {subtotal < 5000 && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-hive-text-muted bg-hive-gold/5 border border-hive-gold/15 p-2 rounded-xl mt-1 text-left">
                  <Truck className="w-4 h-4 text-hive-amber flex-shrink-0" />
                  <span>Add ₹{(5000 - subtotal).toLocaleString("en-IN")} more for Free Delivery!</span>
                </div>
              )}

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={() => router.push("/checkout/address")}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-3 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-hive-amber"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* 3. Small Mini Trust Strip */}
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
                    <span className="text-hive-text-muted">100% authentic designer apparel.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <Ruler className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">Real Measurements</span>
                    <span className="text-hive-text-muted">Detailed size matrix for every design.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <Truck className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">Same-Day Delivery</span>
                    <span className="text-hive-text-muted">Hyperlocal shipping inside service zones.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 text-hive-gold" />
                  </div>
                  <div className="text-[10px]">
                    <span className="font-extrabold text-hive-dark block">48-Hour Replacement</span>
                    <span className="text-hive-text-muted">Easy boutique replacements supported.</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading State: CartPageSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function CartPageSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Title Skeleton */}
        <div className="border-b border-hive-border/40 pb-5 space-y-2 text-left">
          <div className="h-8 w-48 bg-hive-comb/15 rounded-xl" />
          <div className="h-4 w-96 bg-hive-comb/10 rounded-lg" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Items Skeleton */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="h-[120px] w-full bg-hive-comb/10 border border-hive-border/20 rounded-2xl" />
            <div className="h-[120px] w-full bg-hive-comb/10 border border-hive-border/20 rounded-2xl" />
          </div>

          {/* Right Summary Skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[300px] w-full bg-hive-comb/15 border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] w-full bg-hive-comb/10 border border-hive-border/20 rounded-3xl" />
          </div>
        </div>

      </div>
    </div>
  );
}
