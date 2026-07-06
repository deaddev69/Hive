"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PremiumShoppingBag } from "@/components/shared/PremiumShoppingBag";
import { ArrowRight, Ticket, Check, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { CartItemComponent } from "@/components/cart/CartItem";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { formatRupees } from "@hive/utils";
import { useConvexMutation } from "@/hooks/useConvexMutation";
import { useCheckoutStore } from "@/store/checkout-store";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getCartCount = useCartStore((state) => state.getCartCount);
  const getCartTotal = useCartStore((state) => state.getCartTotal);

  const { token, isAuthenticated } = useSessionStore();
  const cartData = useQuery(api.cart.getCart, isAuthenticated && token ? { token } : "skip");
  const hasIssues = cartData?.hasIssues ?? false;
  const blockingReason = cartData?.blockingReason;

  const [cleaning, setCleaning] = useState(false);
  const removeInvalidMutation = useConvexMutation(useMutation(api.cart.removeInvalidItems).withOptimisticUpdate((localStore, args) => {
    if (args.token) {
      const cart = localStore.getQuery(api.cart.getCart, { token: args.token });
      if (cart && cart.items) {
        localStore.setQuery(
          api.cart.getCart,
          { token: args.token },
          {
            ...cart,
            items: cart.items.filter((item: any) =>
              item.status !== "deleted" && item.status !== "inactive" && item.status !== "suspended"
            ),
            hasIssues: false,
            blockingReason: undefined,
          }
        );
      }
    }
  }));
  const removeItemFromZustand = useCartStore((state) => state.removeItem);

  const handleRemoveInvalid = async () => {
    setCleaning(true);
    try {
      if (isAuthenticated && token) {
        await removeInvalidMutation({ token });
      }
      
      // Clean up local Zustand items too
      if (cartData && cartData.items) {
        for (const item of cartData.items) {
          if (!item.isValid && (item.status === "deleted" || item.status === "inactive" || item.status === "suspended")) {
            removeItemFromZustand(item.productId, item.size);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  const updateAvailableStock = useCartStore((state) => state.updateAvailableStock);
  const [stockSyncedMessage, setStockSyncedMessage] = useState<string | null>(null);

  // Sync cart quantities with live backend stock
  useEffect(() => {
    if (cartData && cartData.items) {
      let changed = false;
      cartData.items.forEach((backendItem) => {
        const localItem = items.find(
          (i) => i.productId === backendItem.productId && i.size === backendItem.size
        );
        if (localItem && backendItem.availableStock !== undefined) {
          if (localItem.quantity > backendItem.availableStock) {
            updateAvailableStock(localItem.productId, localItem.size, backendItem.availableStock);
            changed = true;
          } else if (localItem.availableStock !== backendItem.availableStock) {
            // Update availableStock silently to keep it fresh
            updateAvailableStock(localItem.productId, localItem.size, backendItem.availableStock);
          }
        }
      });
      if (changed) {
        setStockSyncedMessage("Some items in your bag have been updated due to stock changes.");
        // Clear message after 10 seconds
        setTimeout(() => setStockSyncedMessage(null), 10000);
      }
    }
  }, [cartData, items, updateAvailableStock]);

  const [mounted, setMounted] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const activePromo = useCheckoutStore((state) => state.appliedPromo);
  const setAppliedPromo = useCheckoutStore((state) => state.setAppliedPromo);
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
  let deliveryFee = 99; // in rupees

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
      const discount = Math.round(subtotal * 0.1);
      setAppliedPromo("WELCOME10", discount);
      setPromoSuccessMsg("WELCOME10 applied successfully! 10% off discount saved.");
      setPromoInput("");
    } else if (code === "HIVEFIRST") {
      const discount = Math.min(500, subtotal);
      setAppliedPromo("HIVEFIRST", discount);
      setPromoSuccessMsg("HIVEFIRST applied successfully! Flat ₹500 discount saved.");
      setPromoInput("");
    } else if (code === "FREESHIP") {
      setAppliedPromo("FREESHIP", 0);
      setPromoSuccessMsg("FREESHIP applied successfully! Free boutique shipping enabled.");
      setPromoInput("");
    } else {
      setPromoError("Invalid coupon code. Try WELCOME10, HIVEFIRST, or FREESHIP.");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null, 0);
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
            <PremiumShoppingBag className="w-8 h-8 text-hive-gold" strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hive-amber opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-hive-amber"></span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-hive-dark">Your Hive Bag is empty.</h1>
            <p className="text-xs text-hive-text-muted max-w-[290px] mx-auto leading-relaxed font-medium">
              Discover unique handcrafted designer apparel and bespoke alteration services near you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              type="button"
              onClick={() => router.push("/shop/all")}
              className="px-6 h-14 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 active:scale-[0.98] transition-all rounded-lg text-xs font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Browse Products</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/collections")}
              className="px-6 h-14 bg-white border border-hive-gold text-hive-dark hover:bg-hive-cream/40 active:scale-[0.98] transition-all rounded-lg text-xs font-semibold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5"
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
        <div className="border-b border-hive-border/40 pb-5 space-y-1.5">
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl text-hive-dark tracking-tight leading-none">
              Hive Bag
            </h1>
            <span className="text-sm text-hive-text-muted font-bold leading-none">
              ({itemsCount} {itemsCount === 1 ? "Item" : "Items"})
            </span>
          </div>
          <p className="text-xs text-hive-text-muted font-medium mt-1 leading-relaxed">
            Review your items and sizing before checkout.
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
                  <span>{formatRupees(subtotal)}</span>
                </div>
                
                {/* Discount display */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-semibold text-green-700 bg-green-50/50 px-2 py-1 rounded-lg border border-green-200/20">
                    <span className="flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-green-600" />
                      <span>Coupon Discount</span>
                    </span>
                    <span>-{formatRupees(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? "FREE" : formatRupees(deliveryFee)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Estimated Tax</span>
                  <span>{formatRupees(taxAmount)}</span>
                </div>

                {/* Promo Code section integrated inline */}
                <div className="pt-2">
                  {!activePromo ? (
                    !showPromoInput ? (
                      <button
                        type="button"
                        onClick={() => setShowPromoInput(true)}
                        className="text-xs font-bold text-hive-gold hover:text-hive-dark transition-colors tracking-wide underline decoration-dotted underline-offset-4 focus:outline-none"
                      >
                        Have a promo code?
                      </button>
                    ) : (
                      <form onSubmit={handleApplyPromo} className="flex gap-2 mt-1 animate-[fadeIn_0.2s_ease-out]">
                        <input
                          type="text"
                          placeholder="e.g. WELCOME10"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          className="flex-1 h-8 px-2.5 text-xs border border-hive-border rounded-lg focus:outline-none focus:border-hive-amber bg-white font-semibold placeholder:opacity-50 uppercase"
                        />
                        <button
                          type="submit"
                          className="h-8 px-3 rounded-lg bg-white border border-hive-gold text-hive-dark hover:bg-hive-cream/40 active:scale-[0.98] transition-all text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm focus:outline-none"
                        >
                          Apply
                        </button>
                      </form>
                    )
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl mt-1">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-extrabold text-green-800 flex items-center gap-1 uppercase">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          {activePromo}
                        </span>
                        {activePromo === "WELCOME10" && <span className="text-[8px] text-green-700 font-medium">10% Off Applied</span>}
                        {activePromo === "HIVEFIRST" && <span className="text-[8px] text-green-700 font-medium">₹500 Off Applied</span>}
                        {activePromo === "FREESHIP" && <span className="text-[8px] text-green-700 font-medium">Free Delivery Applied</span>}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-[9px] font-extrabold uppercase tracking-wide text-red-500 hover:text-red-700 bg-transparent hover:bg-red-50/50 px-1.5 py-0.5 rounded transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Promo Feedback status */}
                  {promoError && (
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-red-600 mt-1.5 bg-red-50/50 border border-red-200/50 px-2 py-1 rounded-lg">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{promoError}</span>
                    </div>
                  )}
                  {promoSuccessMsg && (
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-700 mt-1.5 bg-green-50/20 border border-green-100/50 px-2 py-1 rounded-lg">
                      <span>{promoSuccessMsg}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Order Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    {formatRupees(total)}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                disabled={hasIssues}
                onClick={() => router.push("/checkout/address")}
                className="w-full h-14 bg-hive-gold text-hive-dark hover:bg-hive-gold/90 active:scale-[0.98] transition-all rounded-lg mt-3 font-semibold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-sm focus:outline-none disabled:bg-hive-border/40 disabled:text-hive-text-muted/50 disabled:cursor-not-allowed"
              >
                <span>Secure Checkout →</span>
              </button>

              {hasIssues && blockingReason && (
                <div className="flex flex-col gap-2 mt-4 text-left p-3.5 bg-red-50 border border-red-200/60 rounded-2xl animate-fade">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{blockingReason}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveInvalid}
                    disabled={cleaning}
                    className="w-full h-9 bg-white border border-red-200 hover:bg-red-50/50 text-red-700 font-extrabold uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    {cleaning ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-red-700 border-t-transparent animate-spin" />
                    ) : (
                      <span>Remove unavailable items</span>
                    )}
                  </button>
                </div>
              )}
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
