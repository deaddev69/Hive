"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, Bell, AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";
import { cn } from "@hive/ui";
import { ProductDetail } from "@/lib/mockProductDetails";
import { useCartStore } from "@/store/cart-store";
import { useCart } from "@/context/CartContext";
import { useCheckoutStore } from "@/store/checkout-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { cleanProductTitle } from "./ProductCard";
import { useLocation } from "@/context/LocationContext";
import { checkServiceability } from "../../../../../convex/lib/serviceability";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Modal } from "@hive/ui";
import { useSessionStore } from "@/context/SessionContext";
import { inrToPaise } from "@hive/utils";

function formatNextDayLabel(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    const year = parts[0] || 2026;
    const month = parts[1] || 1;
    const day = parts[2] || 1;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
import { getBoutiqueStatus } from "../../../../../convex/shared/boutiqueStatus";

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: AddToCartButton
// ─────────────────────────────────────────────────────────────────────────────
interface AddToCartButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  className?: string;
  isServiceable?: boolean;
  variant?: "default" | "unified";
  isPreorder?: boolean;
  preorderType?: "CLOSED_TODAY" | "CLOSED_EXTENDED";
  nextDayLabel?: string;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  disabled,
  loading,
  onClick,
  className = "",
  isServiceable = true,
  variant = "default",
  isPreorder = false,
  preorderType,
  nextDayLabel = "",
}) => {
  const isUnified = variant === "unified";
  const isDisabled = disabled || !isServiceable;

  return (
    <button
      type="button"
      disabled={isDisabled || loading}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs transition-all duration-300 relative outline-none select-none group cursor-pointer",
        isUnified ? (
          cn(
            "h-full w-[65%] rounded-l-2xl rounded-r-none border-0",
            isDisabled
              ? "bg-stone-100 text-stone-400 cursor-not-allowed"
              : "bg-hive-dark text-stone-100 group-hover:text-hive-gold active:scale-[0.98] group-hover:shadow-[0_12px_24px_rgba(245,166,35,0.22)]"
          )
        ) : (
          cn(
            "h-12 w-full rounded-xl",
            isDisabled
              ? "bg-stone-100 border border-stone-200 text-stone-400 cursor-not-allowed"
              : "bg-hive-dark text-stone-100 active:scale-[0.98] hover:shadow-[0_8px_24px_rgba(245,166,35,0.18)]"
          )
        ),
        className
      )}
    >
      {loading ? (
        <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
      ) : !isServiceable ? (
        <span>Unavailable</span>
      ) : (
        <>
          <ShoppingBag className={cn(
            "w-4 h-4 transition-all duration-300",
            !isDisabled && "group-hover:text-hive-gold group-hover:scale-110"
          )} />
          <span className={cn(
            "transition-colors duration-300",
            !isDisabled && "group-hover:text-hive-gold"
          )}>
            {isPreorder
              ? (preorderType === "CLOSED_TODAY" ? "Book for Tomorrow" : `Book for ${nextDayLabel}`)
              : "Add to Bag"}
          </span>
        </>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: BuyNowButton
// ─────────────────────────────────────────────────────────────────────────────
interface BuyNowButtonProps {
  disabled: boolean;
  onClick: () => void;
  className?: string;
  isServiceable?: boolean;
  variant?: "default" | "unified";
  isPreorder?: boolean;
  preorderType?: "CLOSED_TODAY" | "CLOSED_EXTENDED";
  nextDayLabel?: string;
}

export const BuyNowButton: React.FC<BuyNowButtonProps> = ({
  disabled,
  onClick,
  className = "",
  isServiceable = true,
  variant = "default",
  isPreorder = false,
  preorderType,
  nextDayLabel = "",
}) => {
  const isUnified = variant === "unified";
  const isDisabled = disabled || !isServiceable;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 outline-none select-none group cursor-pointer",
        isUnified ? (
          cn(
            "h-full w-[35%] rounded-r-2xl rounded-l-none bg-hive-cream text-hive-dark hover:bg-hive-cream/80 active:scale-[0.98]",
            isDisabled
              ? "bg-stone-50/50 text-stone-300 cursor-not-allowed border-l border-stone-200"
              : "border-l border-hive-border/40"
          )
        ) : (
          cn(
            "h-12 w-full rounded-xl border border-hive-dark bg-hive-cream text-hive-dark hover:bg-hive-cream/80 active:scale-[0.98]",
            isDisabled
              ? "border-stone-200 text-stone-300 cursor-not-allowed bg-stone-50/50"
              : ""
          )
        ),
        className
      )}
    >
      <span className="transition-colors duration-300">
        {!isServiceable
          ? "Unavailable"
          : isPreorder
          ? "Pre-Order"
          : "Buy Now"}
      </span>
      {isServiceable && (
        <ArrowRight className={cn(
          "w-4 h-4 transition-all duration-300",
          !isDisabled && "group-hover:translate-x-1.5 group-hover:text-hive-gold"
        )} />
      )}
    </button>
  );
};



// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: StickyMobilePurchaseBar
// ─────────────────────────────────────────────────────────────────────────────
interface StickyMobilePurchaseBarProps {
  productName: string;
  price: number;
  selectedSize: string;
  inventoryCount: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onSelectSizePrompt: () => void;
  loading: boolean;
  className?: string;
  isServiceable?: boolean;
  resolvedStatus?: string;
  isPreorder?: boolean;
  preorderType?: "CLOSED_TODAY" | "CLOSED_EXTENDED";
  nextDayLabel?: string;
}

export const StickyMobilePurchaseBar: React.FC<StickyMobilePurchaseBarProps> = ({
  productName,
  price,
  selectedSize,
  inventoryCount,
  onAddToCart,
  onBuyNow,
  onSelectSizePrompt,
  loading,
  className = "",
  isServiceable = true,
  resolvedStatus = "open",
  isPreorder = false,
  preorderType,
  nextDayLabel = "",
}) => {
  const isOutOfStock = selectedSize ? inventoryCount === 0 : false;
  const isOffline = resolvedStatus === "closed" || resolvedStatus === "temporarily_unavailable";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-stone-200/80 px-5 pt-2.5 pb-[calc(0.6rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-2xl lg:hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]",
        className
      )}
    >
      {/* Price — compact, secondary to CTAs */}
      <div className="flex flex-col text-left justify-center select-none flex-shrink-0 whitespace-nowrap">
        <span className="text-xs font-bold text-stone-900 leading-none">
          ₹{price.toLocaleString("en-IN")}
        </span>
        <span className={cn(
          "text-[10px] tracking-wide mt-0.5 block leading-none",
          selectedSize ? "text-stone-400 font-medium" : "text-amber-800 font-bold uppercase"
        )}>
          {selectedSize ? `Size ${selectedSize}` : "Size Required"}
        </span>
      </div>

      {/* Button CTA */}
      <div className="flex-1 min-w-[180px]">
        {resolvedStatus === "closed" ? (
          <button
            type="button"
            disabled
            className="h-14 w-full rounded-2xl bg-red-50 text-red-600 font-bold uppercase tracking-wider text-[11px] cursor-not-allowed leading-tight px-1"
          >
            Store Closed
          </button>
        ) : resolvedStatus === "temporarily_unavailable" ? (
          <button
            type="button"
            disabled
            className="h-14 w-full rounded-2xl bg-red-50 text-red-600 font-bold uppercase tracking-wider text-[10px] cursor-not-allowed leading-tight px-1"
          >
            Limit Reached
          </button>
        ) : !isServiceable ? (
          <button
            type="button"
            disabled
            className="h-14 w-full rounded-2xl bg-stone-100 text-stone-400 font-bold uppercase tracking-wider text-[10px] cursor-not-allowed leading-tight px-0.5"
          >
            Unavailable
          </button>
        ) : !selectedSize ? (
          <button
            type="button"
            onClick={onSelectSizePrompt}
            className="h-14 w-full rounded-2xl bg-hive-dark text-white font-bold uppercase tracking-widest text-xs shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
          >
            Select Size
          </button>
        ) : isOutOfStock ? (
          <button
            type="button"
            disabled
            className="h-14 w-full rounded-2xl bg-stone-100 text-stone-400 font-bold uppercase tracking-wider text-xs cursor-not-allowed"
          >
            Sold Out
          </button>
        ) : (
          <div className="flex w-full h-14 shadow-sm transition-all duration-300 items-stretch">
            <AddToCartButton
              variant="unified"
              disabled={isOffline}
              loading={loading}
              onClick={onAddToCart}
              isServiceable={isServiceable}
              className="h-full text-[11px] tracking-wider"
              isPreorder={isPreorder}
              preorderType={preorderType}
              nextDayLabel={nextDayLabel}
            />
            <BuyNowButton
              variant="unified"
              disabled={isOffline}
              onClick={onBuyNow}
              isServiceable={isServiceable}
              className="h-full text-[11px] tracking-wider"
              isPreorder={isPreorder}
              preorderType={preorderType}
              nextDayLabel={nextDayLabel}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Wrapper: PurchaseActions
// ─────────────────────────────────────────────────────────────────────────────
export interface PurchaseActionsProps {
  product: ProductDetail;
  selectedSize: string;
  onOpenSizeGuide: () => void;
  className?: string;
}

export const PurchaseActions: React.FC<PurchaseActionsProps> = ({
  product,
  selectedSize,
  onOpenSizeGuide,
  className = "",
}) => {
  const [loading, setLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [crossBoutiqueModalOpen, setCrossBoutiqueModalOpen] = useState(false);
  const handleSelectSizePrompt = () => {
    const el = document.getElementById("size-selector-section");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const setCheckoutItems = useCheckoutStore((state) => state.setCheckoutItems);
  const { setSidebarOpen } = useCart();
  const { latitude, longitude, setGateOpen } = useLocation();

  const clearCartMutation = useMutation(api.cart.clearCart).withOptimisticUpdate((localStore, args) => {
    const tokenQueryArg = { token: token || undefined };
    const cart = localStore.getQuery(api.cart.getCart, tokenQueryArg);
    if (cart) {
      localStore.setQuery(
        api.cart.getCart,
        tokenQueryArg,
        {
          items: [],
          hasIssues: false,
          blockingReason: undefined,
        }
      );
    }
  });
  const { token, isAuthenticated } = useSessionStore();
  
  const logFunnelEvent = useMutation(api.analytics.logFunnelEvent);

  // Track when cross-boutique modal is shown
  React.useEffect(() => {
    if (crossBoutiqueModalOpen) {
      logFunnelEvent({
        eventType: "cross_boutique_modal_shown",
        productId: (product.slug ?? (product as any)._id ?? product.id) as any,
        boutiqueId: (product.boutique?.id ?? (product as any).boutiqueId) as any,
      }).catch(err => console.error("Failed to log analytics:", err));
    }
  }, [crossBoutiqueModalOpen, product, logFunnelEvent]);

  // ── Single source of truth for stock ──────────────────────────────────────
  // Convex DB products use `stockBySize`; mock products use `inventory`.
  const stockMap: Record<string, number> =
    (product as any).stockBySize ?? product.inventory ?? {};

  console.log("[PurchaseActions] stockMap:", stockMap, "selectedSize:", selectedSize);

  const inventoryCount = selectedSize ? (stockMap[selectedSize] ?? 0) : 0;
  const isOutOfStock = selectedSize ? inventoryCount === 0 : false;
  const isLowStock = selectedSize ? inventoryCount > 0 && inventoryCount <= 3 : false;

  const isLocationServiceable = React.useMemo(() => {
    if (latitude === null || longitude === null) return true;
    const serviceability = checkServiceability(latitude, longitude, product.boutique as any);
    return serviceability.serviceable;
  }, [latitude, longitude, product.boutique]);

  const boutiqueStatus = product.boutique
    ? getBoutiqueStatus(product.boutique as any, Date.now())
    : { type: "OPEN" as const };
  const isStoreOffline = boutiqueStatus.type === "PAUSED";
  const isPreorderMode = boutiqueStatus.type === "CLOSED_TODAY" || boutiqueStatus.type === "CLOSED_EXTENDED";
  const resolvedStatus = boutiqueStatus.type === "PAUSED"
    ? (boutiqueStatus.reason === "vacation" ? ("closed" as const) : ("temporarily_unavailable" as const))
    : (product.boutique as any).storeStatus === "busy"
    ? ("busy" as const)
    : ("open" as const);

  const triggerToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const handleClearAndContinue = async () => {
    setCrossBoutiqueModalOpen(false);
    
    // Log replacement event
    logFunnelEvent({
      eventType: "cross_boutique_replace_selected",
      productId: (product.slug ?? (product as any)._id ?? product.id) as any,
      boutiqueId: (product.boutique?.id ?? (product as any).boutiqueId) as any,
    }).catch(err => console.error("Failed to log analytics:", err));
    
    // 1. Clear Zustand cart
    const clearCartZustand = useCartStore.getState().clearCart;
    clearCartZustand();
    
    // 2. Clear backend cart if logged in
    if (isAuthenticated && token) {
      try {
        await clearCartMutation({ token });
      } catch (err) {
        console.error("Failed to clear Convex cart:", err);
      }
    }
    
    // 3. Add new item
    addItem({
      productId: product.slug ?? (product as any)._id ?? product.id,
      size: selectedSize,
      price: product.price,
      name: product.name,
      imageUrl: product.images[0] || "",
      boutiqueName: product.boutique.name,
      boutiqueId: product.boutique.id,
      isPreorder: isPreorderMode,
      scheduledProcessingDate: isPreorderMode ? (boutiqueStatus as any).nextOperatingDay : undefined,
    });
    setSidebarOpen(true);
    triggerToast(`Added ${cleanProductTitle(product.name)} (Size ${selectedSize}) to your bag!`);
  };

  const handleSaveToWishlist = () => {
    // Log wishlist save event
    logFunnelEvent({
      eventType: "cross_boutique_wishlist_selected",
      productId: (product.slug ?? (product as any)._id ?? product.id) as any,
      boutiqueId: (product.boutique?.id ?? (product as any).boutiqueId) as any,
    }).catch(err => console.error("Failed to log analytics:", err));

    const toggleItem = useWishlistStore.getState().toggleItem;
    const hasItem = useWishlistStore.getState().hasItem;
    
    if (product.slug) {
      if (!hasItem(product.slug)) {
        toggleItem({
          id: product.id ?? (product as any)._id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          imageUrl: product.images[0] || "",
          boutiqueName: product.boutique.name,
        });
      }
      setCrossBoutiqueModalOpen(false);
      triggerToast(`Saved ${cleanProductTitle(product.name)} for later`);
    }
  };

  const handleAddToCart = () => {
    if (latitude === null || longitude === null) {
      triggerToast("Please select your delivery location to purchase.", "info");
      setGateOpen(true);
      return;
    }

    if (!selectedSize) {
      triggerToast("Please select a size first", "info");
      return;
    }

    if (isStoreOffline) {
      triggerToast("This boutique is currently closed or not accepting orders.", "info");
      return;
    }

    if (!isLocationServiceable) {
      triggerToast("Currently unavailable at your location", "info");
      return;
    }

    // Check cross-boutique mismatch
    const currentCartItems = useCartStore.getState().items;
    const firstItem = currentCartItems[0];
    if (firstItem && firstItem.boutiqueName !== product.boutique.name) {
      setCrossBoutiqueModalOpen(true);
      return;
    }

    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);

      addItem({
        productId: product.slug ?? (product as any)._id ?? product.id,
        size: selectedSize,
        price: product.price,
        name: product.name,
        imageUrl: product.images[0] || "",
        boutiqueName: product.boutique.name,
        boutiqueId: product.boutique.id,
        availableStock: inventoryCount,
        isPreorder: isPreorderMode,
        scheduledProcessingDate: isPreorderMode ? (boutiqueStatus as any).nextOperatingDay : undefined,
      });

      setSidebarOpen(true);

      console.log(`Add to bag: ${product.name} (Size: ${selectedSize})`);
      triggerToast(`Added ${cleanProductTitle(product.name)} (Size ${selectedSize}) to your bag!`);
    }, 850);
  };

  const handleBuyNow = () => {
    if (latitude === null || longitude === null) {
      triggerToast("Please select your delivery location to purchase.", "info");
      setGateOpen(true);
      return;
    }

    if (!selectedSize) {
      triggerToast("Please select a size first", "info");
      return;
    }

    if (isStoreOffline) {
      triggerToast("This boutique is currently closed or not accepting orders.", "info");
      return;
    }

    if (!isLocationServiceable) {
      triggerToast("Currently unavailable at your location", "info");
      return;
    }

    setCheckoutItems([
      {
        productId: product.slug ?? (product as any)._id ?? product.id,
        size: selectedSize,
        quantity: 1,
        price: product.price,
        name: product.name,
        imageUrl: product.images[0] || "",
        boutiqueName: product.boutique.name,
        boutiqueId: product.boutique.id ?? (product as any).boutiqueId,
        isPreorder: isPreorderMode,
        scheduledProcessingDate: isPreorderMode ? (boutiqueStatus as any).nextOperatingDay : undefined,
      },
    ]);

    router.push("/checkout/address");
  };

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail) return;
    setNotifySuccess(true);
    triggerToast(`Got it! We will notify you at ${notifyEmail} once this size restocks.`, "success");
    setTimeout(() => {
      setNotifyEmail("");
      setNotifySuccess(false);
    }, 4000);
  };

  const showAlert = 
    resolvedStatus === "closed" ||
    resolvedStatus === "temporarily_unavailable" ||
    resolvedStatus === "busy" ||
    isPreorderMode ||
    (!isStoreOffline && (!isLocationServiceable || !selectedSize || isOutOfStock || isLowStock));

  return (
    <div id="purchase-actions-section" className={cn("w-full flex flex-col gap-4 text-left", className)}>

      {/* 1. Validation Alerts & Feedback */}
      {showAlert && (
        <div className="flex flex-col gap-2 w-full">
          {isPreorderMode ? (
            <div className="flex flex-col gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3.5 py-2.5 rounded-xl border border-amber-200 w-full">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <span>Pre-Order Active: {product.boutique.name || "This boutique"} is currently offline.</span>
              </div>
              <p className="text-[10px] text-amber-600 font-medium pl-6 leading-normal">
                You can book now to secure your items. Your order will be prepared when they open at {(boutiqueStatus as any).openingTime} on{" "}
                {boutiqueStatus.type === "CLOSED_TODAY"
                  ? "tomorrow"
                  : formatNextDayLabel((boutiqueStatus as any).nextOperatingDay)}
                .
              </p>
            </div>
          ) : resolvedStatus === "closed" ? (
            <div className="flex flex-col gap-1 text-xs font-bold text-red-700 bg-red-50 px-3.5 py-2.5 rounded-xl border border-red-200 w-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>Store Closed: {product.boutique.name || "This boutique"} is currently offline.</span>
              </div>
              {(product.boutique as any).storeMessage && (
                <p className="text-[10px] text-red-600/90 font-medium pl-6 leading-normal">
                  Notice: {(product.boutique as any).storeMessage}
                </p>
              )}
            </div>
          ) : resolvedStatus === "temporarily_unavailable" ? (
            <div className="flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 px-3.5 py-2.5 rounded-xl border border-red-200 w-full">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>Not Accepting Orders: Store capacity reached for today. Please try again tomorrow.</span>
            </div>
          ) : resolvedStatus === "busy" ? (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 w-full">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <span>High Demand: Orders may take longer to prepare today.</span>
              </div>
              {(product.boutique as any).prepTimeMinutes && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold pl-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Est. Preparation Time: {(product.boutique as any).prepTimeMinutes} mins</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Standard stock alerts only if store is NOT closed/unavailable */}
          {!isStoreOffline && (
            <>
              {!isLocationServiceable ? (
                <div className="flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200 w-full">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>Currently unavailable at your location</span>
                </div>
              ) : !selectedSize ? (
                null
              ) : isOutOfStock ? (
                <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200 w-full">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Out of Stock: The requested size is currently unavailable.</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* 2. CTAs (Add to Cart / Buy Now / Out Of Stock form) */}
      {isStoreOffline ? (
        <div className="hidden lg:flex w-full h-12 rounded-2xl items-stretch opacity-60">
          <AddToCartButton
            variant="unified"
            disabled={true}
            loading={false}
            onClick={handleAddToCart}
            isServiceable={false}
          />
          <BuyNowButton 
            variant="unified"
            disabled={true} 
            onClick={handleBuyNow} 
            isServiceable={false} 
          />
        </div>
      ) : isOutOfStock ? (
        <div className="bg-[#FAF8F5] border border-hive-border/40 rounded-2xl p-4.5 space-y-3.5">
          <div className="text-xs">
            <span className="font-extrabold uppercase tracking-wider text-hive-dark block">
              Restock Notification
            </span>
            <p className="text-hive-text-muted mt-1 leading-relaxed font-medium">
              We handcraft our pieces in limited runs. Enter your email to be the first to know when size {selectedSize} is back.
            </p>
          </div>

          <form onSubmit={handleNotifyMe} className="flex gap-2">
            <input
              type="email"
              required
              disabled={notifySuccess}
              placeholder="Enter your email address"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="flex-1 h-11 px-4 text-xs border border-hive-border/50 rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium disabled:opacity-60 transition-colors"
            />
            <button
              type="submit"
              disabled={notifySuccess}
              className="h-11 px-5 rounded-xl bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm disabled:bg-hive-border/40 disabled:text-hive-text-muted/65"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notify Me</span>
            </button>
          </form>
        </div>
      ) : !selectedSize ? (
        <button
          type="button"
          onClick={handleSelectSizePrompt}
          className="hidden lg:flex h-12 w-full rounded-2xl bg-hive-dark text-white font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] shadow-sm hover:shadow cursor-pointer items-center justify-center"
        >
          Select Size
        </button>
      ) : (
        <div className="hidden lg:flex w-full h-12 rounded-2xl shadow-sm transition-all duration-300 items-stretch">
          <AddToCartButton
            variant="unified"
            disabled={!selectedSize}
            loading={loading}
            onClick={handleAddToCart}
            isServiceable={isLocationServiceable}
            isPreorder={isPreorderMode}
            preorderType={(boutiqueStatus.type === "CLOSED_TODAY" || boutiqueStatus.type === "CLOSED_EXTENDED") ? boutiqueStatus.type : undefined}
            nextDayLabel={boutiqueStatus.type === "CLOSED_EXTENDED" ? formatNextDayLabel((boutiqueStatus as any).nextOperatingDay) : ""}
          />
          <BuyNowButton 
            variant="unified"
            disabled={!selectedSize} 
            onClick={handleBuyNow} 
            isServiceable={isLocationServiceable}
            isPreorder={isPreorderMode}
            preorderType={(boutiqueStatus.type === "CLOSED_TODAY" || boutiqueStatus.type === "CLOSED_EXTENDED") ? boutiqueStatus.type : undefined}
            nextDayLabel={boutiqueStatus.type === "CLOSED_EXTENDED" ? formatNextDayLabel((boutiqueStatus as any).nextOperatingDay) : ""}
          />
        </div>
      )}

      {/* Sentinel for Scroll Observer */}
      <div className="w-full h-px pointer-events-none" />

      {/* 4. Self-Contained Success/Feedback Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] max-w-md w-[90%] sm:w-auto bg-[#1c1917]/95 border border-stone-850/50 text-white rounded-full px-5 py-3.5 flex items-center gap-3 shadow-2xl animate-[toastInCenter_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", toast.type === "success" ? "bg-green-500/25 text-green-400" : "bg-hive-gold/25 text-hive-gold")}>
            {toast.type === "success" ? (
              <CheckCircle className="w-3.5 h-3.5 stroke-[2.8]" />
            ) : (
              <Info className="w-3.5 h-3.5 stroke-[2.8]" />
            )}
          </div>
          <span className="text-xs font-semibold text-white/95 leading-none tracking-wide pr-1 select-none">
            {toast.message}
          </span>
        </div>
      )}

      {/* 5. Sticky Mobile purchase bar */}
      <StickyMobilePurchaseBar
        productName={product.name}
        price={product.price}
        selectedSize={selectedSize}
        inventoryCount={inventoryCount}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onSelectSizePrompt={handleSelectSizePrompt}
        loading={loading}
        isServiceable={isLocationServiceable && !isStoreOffline}
        resolvedStatus={resolvedStatus}
        isPreorder={isPreorderMode}
        preorderType={(boutiqueStatus.type === "CLOSED_TODAY" || boutiqueStatus.type === "CLOSED_EXTENDED") ? boutiqueStatus.type : undefined}
        nextDayLabel={boutiqueStatus.type === "CLOSED_EXTENDED" ? formatNextDayLabel((boutiqueStatus as any).nextOperatingDay) : ""}
      />

      <style>{`
        @keyframes toastInCenter {
          from { opacity: 0; transform: translate(-50%, -15px) scale(0.97); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>

      {/* 6. Boutique Mismatch Warning Modal */}
      <Modal
        isOpen={crossBoutiqueModalOpen}
        onClose={() => {
          logFunnelEvent({
            eventType: "cross_boutique_dismissed",
            productId: (product.slug ?? (product as any)._id ?? product.id) as any,
            boutiqueId: (product.boutique?.id ?? (product as any).boutiqueId) as any,
          }).catch(err => console.error("Failed to log analytics:", err));
          setCrossBoutiqueModalOpen(false);
        }}
        title={
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-700 block mb-0.5">
              LOCAL PARTNER FULFILLMENT
            </span>
            <h2 className="text-base sm:text-lg font-bold text-hive-text">
              Separate Order Required
            </h2>
          </div>
        }
        className="max-w-md"
      >
        <div className="flex flex-col py-1 px-1 text-left select-none">
          <p className="text-xs text-stone-500 leading-relaxed font-normal mb-1">
            Items from different Hive partners are fulfilled separately for faster delivery and better service coordination.
          </p>
          <span className="text-[11px] text-stone-400 font-medium block mb-5">
            Delivered directly by each Hive partner
          </span>

          <hr className="border-stone-100 mb-5" />

          {/* Visual Comparison: Current Order vs Selected Item */}
          <div className="space-y-4 mb-5">
            {/* Current Order */}
            <div className="bg-stone-50/60 border border-stone-100 p-3.5 rounded-xl flex items-center gap-3">
              <div className="relative w-10 h-13 rounded overflow-hidden bg-stone-100 border border-stone-200/50 flex-shrink-0">
                {items[0]?.imageUrl ? (
                  <img
                     src={items[0].imageUrl}
                     alt={items[0].name}
                     className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] text-stone-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                  Current Order
                </span>
                <span className="text-xs font-semibold text-stone-850 block truncate">
                  {items[0]?.boutiqueName}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[10px] text-stone-500 font-normal">
                    {items.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} {items.reduce((acc, curr) => acc + (curr.quantity || 1), 0) === 1 ? "item" : "items"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-stone-900">
                    ₹{items.reduce((acc, curr) => acc + curr.price * (curr.quantity || 1), 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow/Indicator */}
            <div className="flex justify-center -my-2.5 relative z-10">
              <div className="w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 text-xs font-light">
                ↓
              </div>
            </div>

            {/* Selected Item */}
            <div className="bg-stone-50/60 border border-stone-100 p-3.5 rounded-xl flex items-center gap-3">
              <div className="relative w-10 h-13 rounded overflow-hidden bg-stone-100 border border-stone-200/50 flex-shrink-0">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] text-stone-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                  New Selection
                </span>
                <span className="text-xs font-semibold text-stone-850 block truncate">
                  {cleanProductTitle(product.name)}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[10px] text-stone-500 font-normal block truncate">
                    {product.boutique?.name}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-stone-900">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-stone-100 mb-5" />

          {/* Helper Text for Wishlist */}
          <p className="text-[10px] text-stone-400 text-center font-normal mb-3 px-2">
            Not ready to switch? Save this item to continue shopping from your current partner.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col w-full mt-1">
            <button
              onClick={handleClearAndContinue}
              className="h-11 w-full bg-stone-900 text-white hover:bg-stone-950 active:scale-[0.98] transition-all rounded-full text-xs sm:text-sm font-semibold shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Shop From This Partner</span>
              <span>→</span>
            </button>
            <span className="text-[10px] text-stone-400 font-normal mt-1.5 text-center block">
              Your current bag will be replaced.
            </span>
            
            <button
              onClick={handleSaveToWishlist}
              className="h-11 w-full bg-stone-100/80 text-stone-850 hover:bg-stone-200 active:scale-[0.98] transition-all rounded-full text-xs sm:text-sm font-semibold mt-3.5 flex items-center justify-center"
            >
              Save For Later
            </button>
            
            <button
              onClick={() => {
                logFunnelEvent({
                  eventType: "cross_boutique_dismissed",
                  productId: (product.slug ?? (product as any)._id ?? product.id) as any,
                  boutiqueId: (product.boutique?.id ?? (product as any).boutiqueId) as any,
                }).catch(err => console.error("Failed to log analytics:", err));
                setCrossBoutiqueModalOpen(false);
              }}
              className="w-full text-center text-xs text-stone-600 hover:text-stone-900 font-semibold py-2 transition-colors focus:outline-none mt-2"
            >
              Keep Browsing
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State: PurchaseActionsSkeleton
// ─────────────────────────────────────────────────────────────────────────────
export const PurchaseActionsSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-4 text-left animate-pulse">
      {/* Alert Banner Skeleton */}
      <div className="h-9 w-full bg-hive-comb/10 border border-hive-border/20 rounded-xl" />

      {/* Button Stack Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-12 w-full bg-hive-comb/15 rounded-xl" />
        <div className="h-12 w-full bg-hive-comb/10 border border-hive-border/20 rounded-xl" />
      </div>


    </div>
  );
};
