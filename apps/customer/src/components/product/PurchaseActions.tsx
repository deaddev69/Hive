"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingBag, ArrowRight, Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@hive/ui";
import { ProductDetail } from "@/lib/mockProductDetails";
import { useCartStore } from "@/store/cart-store";
import { useCart } from "@/context/CartContext";
import { useCheckoutStore } from "@/store/checkout-store";
import { useLocation } from "@/context/LocationContext";
import { calculateDistanceKm } from "@/lib/distance";

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: AddToCartButton
// ─────────────────────────────────────────────────────────────────────────────
interface AddToCartButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  className?: string;
  isServiceable?: boolean;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  disabled,
  loading,
  onClick,
  className = "",
  isServiceable = true,
}) => {
  return (
    <button
      type="button"
      disabled={disabled || loading || !isServiceable}
      onClick={onClick}
      className={cn(
        "h-12 w-full rounded-xl flex items-center justify-center gap-2.5 font-extrabold uppercase tracking-widest transition-all duration-300 relative outline-none focus-visible:ring-2 focus-visible:ring-hive-amber focus-visible:ring-offset-2 select-none",
        (disabled || !isServiceable)
          ? "bg-hive-border/40 border border-hive-border/20 text-hive-text-muted/50 cursor-not-allowed"
          : "bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] shadow-sm hover:shadow-md",
        className
      )}
    >
      {loading ? (
        <span className="w-5 h-5 rounded-full border-2 border-hive-gold border-t-transparent animate-spin" />
      ) : !isServiceable ? (
        <span>Delivery Not Available In Your Area</span>
      ) : (
        <>
          <ShoppingBag className="w-4.5 h-4.5 stroke-[2.2]" />
          <span>Add to Bag</span>
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
}

export const BuyNowButton: React.FC<BuyNowButtonProps> = ({
  disabled,
  onClick,
  className = "",
  isServiceable = true,
}) => {
  return (
    <button
      type="button"
      disabled={disabled || !isServiceable}
      onClick={onClick}
      className={cn(
        "h-12 w-full rounded-xl border border-hive-dark text-hive-dark font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 hover:bg-hive-dark/5 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-hive-amber select-none",
        (disabled || !isServiceable)
          ? "border-hive-border/40 text-hive-text-muted/40 cursor-not-allowed bg-slate-100/50"
          : "",
        className
      )}
    >
      <span>{isServiceable ? "Buy Now" : "Delivery Not Available"}</span>
      {isServiceable && <ArrowRight className="w-4.5 h-4.5 stroke-[2.2]" />}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: AskBoutiqueButton (WhatsApp chat link)
// ─────────────────────────────────────────────────────────────────────────────
interface AskBoutiqueButtonProps {
  productName: string;
  className?: string;
}

export const AskBoutiqueButton: React.FC<AskBoutiqueButtonProps> = ({
  productName,
  className = "",
}) => {
  const whatsappNumber = "919999999999";
  const rawMsg = `Hi, I have a question about the ${productName}.`;
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(rawMsg)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "h-12 w-full rounded-xl border border-[#25D366]/40 hover:border-[#25D366]/70 text-[#128C7E] font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 hover:bg-[#25D366]/5 outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] text-xs select-none",
        className
      )}
    >
      <MessageCircle className="w-4.5 h-4.5 fill-current text-[#25D366]" />
      <span>Ask Boutique Partner</span>
    </a>
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
  onSelectSizePrompt: () => void;
  loading: boolean;
  className?: string;
  isServiceable?: boolean;
}

export const StickyMobilePurchaseBar: React.FC<StickyMobilePurchaseBarProps> = ({
  productName,
  price,
  selectedSize,
  inventoryCount,
  onAddToCart,
  onSelectSizePrompt,
  loading,
  className = "",
  isServiceable = true,
}) => {
  const isOutOfStock = selectedSize ? inventoryCount === 0 : false;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-md border-t border-hive-border/40 p-4 flex items-center justify-between gap-4 shadow-2xl md:hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]",
        className
      )}
    >
      {/* Product Details Section */}
      <div className="flex flex-col text-left">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-hive-text-muted">
          {selectedSize ? `Size: ${selectedSize}` : "Select Size"}
        </span>
        <span className="text-base font-extrabold text-hive-dark">
          ₹{price.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Button CTA */}
      <div className="flex-1 max-w-[200px]">
        {!isServiceable ? (
          <button
            type="button"
            disabled
            className="h-11 w-full rounded-xl bg-hive-border/40 text-hive-text-muted/50 font-extrabold uppercase tracking-wider text-[10px] cursor-not-allowed leading-tight px-1"
          >
            Delivery Not Available
          </button>
        ) : !selectedSize ? (
          <button
            type="button"
            onClick={onSelectSizePrompt}
            className="h-11 w-full rounded-xl bg-hive-amber text-white font-extrabold uppercase tracking-wider text-xs shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            Select Size
          </button>
        ) : isOutOfStock ? (
          <button
            type="button"
            disabled
            className="h-11 w-full rounded-xl bg-hive-border/40 text-hive-text-muted/50 font-extrabold uppercase tracking-wider text-xs cursor-not-allowed"
          >
            Sold Out
          </button>
        ) : (
          <AddToCartButton
            disabled={false}
            loading={loading}
            onClick={onAddToCart}
            className="h-11 text-xs"
            isServiceable={isServiceable}
          />
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

  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const setCheckoutItems = useCheckoutStore((state) => state.setCheckoutItems);
  const { setSidebarOpen } = useCart();
  const { latitude, longitude } = useLocation();

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
    const bLat = (product.boutique as any).latitude;
    const bLng = (product.boutique as any).longitude;
    const bRad = (product.boutique as any).deliveryRadiusKm ?? 15;
    if (bLat === undefined || bLng === undefined) return true;
    const dist = calculateDistanceKm(latitude, longitude, bLat, bLng);
    return dist <= bRad;
  }, [latitude, longitude, product.boutique]);

  const triggerToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      triggerToast("Please select a size first", "info");
      return;
    }

    if (!isLocationServiceable) {
      triggerToast("Delivery is not available in your area.", "info");
      return;
    }

    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);

      addItem({
        productId: product.id,
        size: selectedSize,
        price: product.price,
        name: product.name,
        imageUrl: product.images[0] || "",
        boutiqueName: product.boutique.name,
      });

      setSidebarOpen(true);

      console.log(`Add to bag: ${product.name} (Size: ${selectedSize})`);
      triggerToast(`Added ${product.name} (Size ${selectedSize}) to your bag!`);
    }, 850);
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      triggerToast("Please select a size first", "info");
      return;
    }

    if (!isLocationServiceable) {
      triggerToast("Delivery is not available in your area.", "info");
      return;
    }

    setCheckoutItems([
      {
        productId: product.id,
        size: selectedSize,
        quantity: 1,
        price: product.price,
        name: product.name,
        imageUrl: product.images[0] || "",
        boutiqueName: product.boutique.name,
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

  return (
    <div className={cn("w-full flex flex-col gap-4 text-left border-t border-hive-border/40 pt-5 mt-4", className)}>

      {/* 1. Validation Alerts & Feedback */}
      <div className="min-h-[30px] flex items-center">
        {!isLocationServiceable ? (
          <div className="flex items-center gap-2 text-xs font-bold text-red-700 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200 w-full">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>Delivery unavailable for your selected location.</span>
          </div>
        ) : !selectedSize ? (
          <div className="flex items-center gap-2 text-xs font-bold text-hive-amber bg-hive-gold/10 px-3.5 py-1.5 rounded-xl border border-hive-gold/25 w-full">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Please select a size to view availability and purchase options.</span>
          </div>
        ) : isOutOfStock ? (
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1.5 rounded-xl border border-red-200 w-full">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Out of Stock: The requested size is currently unavailable.</span>
          </div>
        ) : isLowStock ? (
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 animate-pulse w-full">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500 fill-current" />
            <span>Hurry! Only {inventoryCount} left in stock for size {selectedSize}.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-3.5 py-1.5 rounded-xl border border-green-200 w-full">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>In Stock and eligible for shipping.</span>
          </div>
        )}
      </div>

      {/* 2. CTAs (Add to Cart / Buy Now / Out Of Stock form) */}
      {isOutOfStock ? (
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
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <AddToCartButton
            disabled={!selectedSize}
            loading={loading}
            onClick={handleAddToCart}
            isServiceable={isLocationServiceable}
          />
          <BuyNowButton disabled={!selectedSize} onClick={handleBuyNow} isServiceable={isLocationServiceable} />
        </div>
      )}

      {/* 3. WhatsApp Action */}
      <AskBoutiqueButton productName={product.name} />

      {/* 4. Self-Contained Success/Feedback Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[99999] max-w-sm w-full bg-hive-dark border border-hive-gold/30 text-white rounded-2xl p-4 flex gap-3 shadow-2xl items-start animate-[toastIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", toast.type === "success" ? "bg-green-500/20 text-green-400" : "bg-hive-gold/20 text-hive-gold")}>
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>
          <div className="text-xs">
            <span className="font-extrabold uppercase tracking-wider text-hive-gold block">
              {toast.type === "success" ? "Success" : "Notification"}
            </span>
            <p className="text-white/90 mt-0.5 leading-relaxed font-semibold">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* 5. Sticky Mobile purchase bar */}
      <StickyMobilePurchaseBar
        productName={product.name}
        price={product.price}
        selectedSize={selectedSize}
        inventoryCount={inventoryCount}
        onAddToCart={handleAddToCart}
        onSelectSizePrompt={onOpenSizeGuide}
        loading={loading}
        isServiceable={isLocationServiceable}
      />

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State: PurchaseActionsSkeleton
// ─────────────────────────────────────────────────────────────────────────────
export const PurchaseActionsSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-4 text-left border-t border-hive-border/40 pt-5 mt-4 animate-pulse">
      {/* Alert Banner Skeleton */}
      <div className="h-9 w-full bg-hive-comb/10 border border-hive-border/20 rounded-xl" />

      {/* Button Stack Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-12 w-full bg-hive-comb/15 rounded-xl" />
        <div className="h-12 w-full bg-hive-comb/10 border border-hive-border/20 rounded-xl" />
      </div>

      {/* Whatsapp Button Skeleton */}
      <div className="h-12 w-full bg-hive-comb/10 border border-hive-border/20 rounded-xl" />
    </div>
  );
};
