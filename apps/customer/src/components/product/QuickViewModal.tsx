"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Modal } from "@hive/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { useSessionStore } from "@/context/SessionContext";
import { calculateDistanceKm } from "@/lib/distance";
import { inrToPaise } from "@hive/utils";
import {
  ShieldCheck,
  ShoppingBag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { cn } from "@hive/ui";
import { cleanProductTitle } from "./ProductCard";

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productSlug: string;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  isOpen,
  onClose,
  productSlug
}) => {
  const router = useRouter();
  const product = useQuery(api.products.getProduct, { slug: productSlug });
  const { latitude, longitude, city } = useLocation();
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const { setSidebarOpen } = useCart();

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [crossBoutiqueModalOpen, setCrossBoutiqueModalOpen] = useState(false);

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
  useEffect(() => {
    if (crossBoutiqueModalOpen && product) {
      logFunnelEvent({
        eventType: "cross_boutique_modal_shown",
        productId: (product.slug ?? product._id) as any,
        boutiqueId: product.boutiqueId as any,
      }).catch(err => console.error("Failed to log analytics:", err));
    }
  }, [crossBoutiqueModalOpen, product, logFunnelEvent]);

  // Reset local state when modal opens/closes or product changes
  useEffect(() => {
    if (isOpen) {
      setSelectedSize("");
      setActiveImageIdx(0);
      setAdding(false);
      setToast(null);
      setCrossBoutiqueModalOpen(false);
    }
  }, [isOpen, productSlug]);

  // Handle keyboard Escape close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Disable body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (product === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <div className="bg-white shadow-2xl flex flex-col w-full border border-stone-100 z-10 h-full max-h-[40vh] md:h-auto md:max-w-md md:rounded-[24px] rounded-t-[24px] overflow-hidden justify-center items-center p-10">
          <Loader2 className="w-8 h-8 animate-spin text-stone-850" />
          <span className="text-xs text-stone-500 font-medium tracking-wide mt-3">
            Retrieving product...
          </span>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
        <div className="bg-white shadow-2xl flex flex-col w-full border border-stone-100 z-10 h-full max-h-[40vh] md:h-auto md:max-w-md md:rounded-[24px] rounded-t-[24px] overflow-hidden items-center justify-center p-10 text-center gap-3">
          <span className="text-lg font-serif font-semibold text-stone-900">Unavailable</span>
          <p className="text-xs text-stone-500 max-w-xs">
            This item is no longer available in our collection.
          </p>
          <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-stone-950 text-white hover:bg-stone-900 rounded-full text-xs font-medium uppercase tracking-wider transition-all">
            Close
          </button>
        </div>
      </div>
    );
  }

  const isUnavailable = (product as any).isUnavailable ?? false;
  const stockMap: Record<string, number> = product.stockBySize ?? {};
  const currentStock = selectedSize ? (stockMap[selectedSize] ?? 0) : 0;
  const isOutOfStock = selectedSize ? currentStock === 0 : false;

  // Calculate local delivery serviceability matching details page
  const isLocationServiceable = (() => {
    if (latitude === null || longitude === null) return true;
    const bLat = product.boutique?.latitude;
    const bLng = product.boutique?.longitude;
    const bRad = product.boutique?.deliveryRadiusKm ?? 15;
    if (bLat === undefined || bLng === undefined) return true;
    const dist = calculateDistanceKm(latitude, longitude, bLat, bLng);
    return dist <= bRad;
  })();

  const resolvedStatus = product.boutique?.storeStatus || "open";
  const isAcceptingOrders = product.boutique?.isAcceptingOrders !== false;
  const isStoreOffline = resolvedStatus === "closed" || resolvedStatus === "temporarily_unavailable" || !isAcceptingOrders;

  const handleClearAndContinue = async () => {
    setCrossBoutiqueModalOpen(false);
    
    // Log replacement event
    logFunnelEvent({
      eventType: "cross_boutique_replace_selected",
      productId: (product.slug ?? product._id) as any,
      boutiqueId: product.boutiqueId as any,
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
      productId: product.slug ?? product._id,
      size: selectedSize,
      price: inrToPaise(product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price),
      name: product.name,
      imageUrl: product.images[0] || product.imageUrl || "",
      boutiqueName: product.boutiqueName,
      boutiqueId: product.boutiqueId
    });
    setSidebarOpen(true);
    onClose();
  };

  const handleSaveToWishlist = () => {
    // Log wishlist save event
    logFunnelEvent({
      eventType: "cross_boutique_wishlist_selected",
      productId: (product.slug ?? product._id) as any,
      boutiqueId: product.boutiqueId as any,
    }).catch(err => console.error("Failed to log analytics:", err));

    const toggleItem = useWishlistStore.getState().toggleItem;
    const hasItem = useWishlistStore.getState().hasItem;
    
    if (product.slug) {
      if (!hasItem(product.slug)) {
        toggleItem({
          id: product._id,
          slug: product.slug,
          name: product.name,
          price: product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price,
          imageUrl: product.images?.[0] || product.imageUrl || "",
          boutiqueName: product.boutiqueName,
        });
      }
      setCrossBoutiqueModalOpen(false);
      setToast("Saved to Wishlist!");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAddToCart = () => {
    if (isUnavailable) return;
    if (isStoreOffline) {
      setToast("This boutique is currently closed or not accepting orders.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!selectedSize) {
      setToast("Please select a size first");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (!isLocationServiceable) {
      setToast("Currently unavailable at your location");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Check cross-boutique mismatch
    const currentCartItems = useCartStore.getState().items;
    const firstItem = currentCartItems[0];
    if (firstItem && firstItem.boutiqueName !== product.boutiqueName) {
      setCrossBoutiqueModalOpen(true);
      return;
    }

    setAdding(true);
    setTimeout(() => {
      addItem({
        productId: product.slug ?? product._id,
        size: selectedSize,
        price: inrToPaise(product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price),
        name: product.name,
        imageUrl: product.images[0] || product.imageUrl || "",
        boutiqueName: product.boutiqueName,
        boutiqueId: product.boutiqueId
      });
      setAdding(false);
      setSidebarOpen(true);
      onClose();
    }, 600);
  };

  const images = product.images || [product.imageUrl].filter(Boolean);
  const discountPercent = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer / Modal Container */}
      <div
        className={cn(
          "bg-white shadow-2xl flex flex-col transition-all duration-300 w-full border border-stone-100 z-10",
          // Mobile: bottom aligned, takes full width, capped height (70vh)
          "h-full max-h-[70vh] rounded-t-[24px] overflow-hidden",
          // Desktop: centered, fixed width, automatic height
          "md:h-auto md:max-w-md md:max-h-[85vh] md:rounded-[24px]"
        )}
      >
        {/* Header - No title, handle and close only */}
        <div className="flex items-center justify-end px-5 py-3 flex-shrink-0 relative">
          {/* Drag Handle for Mobile aesthetics */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-stone-200 md:hidden" />
          
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-50 transition-colors text-stone-400 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-0 md:px-6 md:pb-6 scrollbar-none select-none">
          
          {/* ── MOBILE ONLY PREMIUM BOTTOM SHEET LAYOUT ── */}
          <div className="flex flex-col gap-4 md:hidden">
            {/* Top split row: Image on left, details on right */}
            <div className="flex gap-4 items-start">
              {/* Product Thumbnail */}
              <div className="relative h-[110px] w-[82px] rounded-2xl overflow-hidden bg-stone-50 border border-stone-150/60 flex-shrink-0">
                {images.length > 0 ? (
                  <Image
                    src={images[activeImageIdx]}
                    alt={product.name}
                    fill
                    sizes="82px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-stone-50 flex items-center justify-center text-stone-400 text-[10px]">
                    No Image
                  </div>
                )}
              </div>

              {/* Product Meta */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left h-[110px]">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-serif font-semibold text-stone-900 leading-snug truncate">
                    {cleanProductTitle(product.name)}
                  </h3>
                  <div className="text-[11px] text-stone-500 font-normal">
                    by {product.boutiqueName}
                  </div>
                </div>

                {/* Price & Serviceability */}
                <div className="flex flex-col gap-0.5 mt-1">
                  {discountPercent > 0 ? (
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-stone-900">
                        ₹{(product.discountPrice ?? product.price).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-stone-400 line-through">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[8px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-stone-900">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  )}
                  {isLocationServiceable && !isStoreOffline && (() => {
                    const currentHour = new Date().getHours();
                    const deliveryDayText = (currentHour >= 8 && currentHour < 20) ? "today" : "tomorrow";
                    return (
                      <p className="text-[9px] text-stone-500 font-normal">
                        Delivers {deliveryDayText} in {city || "Kochi"}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Sizing Block (Directly visible, no scrolling needed) */}
            <div className="space-y-2 mt-2 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block text-center">
                Select Size
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {product.sizes?.map((sz: string) => {
                  const stock = stockMap[sz] ?? 0;
                  const isSzOut = stock <= 0 || isUnavailable;
                  const isSzSelected = selectedSize === sz;

                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={isSzOut}
                      onClick={() => setSelectedSize(sz)}
                      className={cn(
                        "h-10 px-4 rounded border text-xs font-normal tracking-wide transition-all duration-150 relative flex items-center justify-center min-w-[42px]",
                        isSzOut
                          ? "border-stone-100 bg-stone-50/50 text-stone-300 opacity-50 cursor-not-allowed line-through"
                          : isSzSelected
                          ? "border-stone-950 bg-stone-950 text-white font-medium"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-900 active:scale-95"
                      )}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── DESKTOP ONLY STANDARD LAYOUT ── */}
          <div className="hidden md:flex flex-col gap-3.5">
            
            {/* Image Gallery (centered, reduced height) */}
            <div className="relative h-[200px] w-full max-w-[180px] mx-auto rounded-xl overflow-hidden bg-stone-50 border border-stone-100 group/gallery flex-shrink-0">
              {images.length > 0 ? (
                <Image
                  src={images[activeImageIdx]}
                  alt={product.name}
                  fill
                  sizes="200px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-stone-50 flex items-center justify-center text-stone-400 text-xs">
                  No Image
                </div>
              )}

              {/* Slider arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-stone-700 border border-stone-200/50 flex items-center justify-center backdrop-blur-sm transition-all shadow-sm active:scale-90 opacity-0 group-hover/gallery:opacity-100 z-10"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx((prev) => (prev + 1) % images.length)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-stone-700 border border-stone-200/50 flex items-center justify-center backdrop-blur-sm transition-all shadow-sm active:scale-90 opacity-0 group-hover/gallery:opacity-100 z-10"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails row */}
            {images.length > 1 && (
              <div className="flex gap-1.5 justify-center overflow-x-auto pb-0.5 scrollbar-none flex-shrink-0">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={cn(
                      "relative w-9 aspect-[3/4] rounded border transition-all flex-shrink-0 bg-stone-50",
                      idx === activeImageIdx ? "border-stone-850 ring-1 ring-stone-850" : "border-transparent hover:border-stone-200"
                    )}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Merchandising Details & Decisions */}
            <div className="flex flex-col gap-2.5 text-center">
              
              {/* Product Info Block */}
              <div className="space-y-0.5">
                <h3 className="text-base md:text-lg font-serif font-semibold text-stone-900 leading-snug">
                  {cleanProductTitle(product.name)}
                </h3>
                
                {/* Brand Name & Verified status */}
                <div className="text-xs text-stone-500 font-normal flex items-center justify-center gap-1.5">
                  <span>by {product.boutiqueName}</span>
                  {product.boutique?.verified && (
                    <span className="text-[10px] text-stone-400 font-medium lowercase italic">Verified</span>
                  )}
                </div>
              </div>

              {/* Price & Delivery block */}
              <div className="flex flex-col items-center gap-0.5 select-none">
                {discountPercent > 0 ? (
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-lg font-bold text-stone-900">
                      ₹{(product.discountPrice ?? product.price).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-stone-400 line-through">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                      {discountPercent}% OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-stone-900">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                )}
                {isLocationServiceable && !isStoreOffline && (() => {
                  const currentHour = new Date().getHours();
                  const deliveryDayText = (currentHour >= 8 && currentHour < 20) ? "today" : "tomorrow";
                  return (
                    <p className="text-[11px] text-stone-500 font-normal">
                      Delivers {deliveryDayText} in {city || "Kochi"}
                    </p>
                  );
                })()}
              </div>

              {/* Size Selection */}
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block text-center">
                  Select Size
                </span>
                
                <div className="flex flex-wrap justify-center gap-1.5">
                  {product.sizes?.map((sz: string) => {
                    const stock = stockMap[sz] ?? 0;
                    const isSzOut = stock <= 0 || isUnavailable;
                    const isSzSelected = selectedSize === sz;

                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={isSzOut}
                        onClick={() => setSelectedSize(sz)}
                        className={cn(
                          "h-10 px-4 rounded border text-xs font-normal tracking-wide transition-all duration-150 relative flex items-center justify-center min-w-[40px]",
                          isSzOut
                            ? "border-stone-100 bg-stone-50/50 text-stone-300 opacity-50 cursor-not-allowed line-through"
                            : isSzSelected
                            ? "border-stone-950 bg-stone-950 text-white font-medium"
                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-900 active:scale-95"
                        )}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Sticky Footer (Actions only, price moved to top) */}
        <div className="border-t border-stone-100 px-5 py-4 bg-white flex-shrink-0 z-10">
          {toast && (
            <div className="text-[11px] font-medium text-red-650 bg-red-50/50 py-1.5 px-3 rounded-lg border border-red-100 text-center mb-3 animate-fade">
              {toast}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={adding || isOutOfStock || !isLocationServiceable || isUnavailable || isStoreOffline}
              onClick={handleAddToCart}
              className={cn(
                "h-11 w-full rounded-full flex items-center justify-center gap-1.5 font-medium text-xs tracking-wider uppercase transition-all duration-150 select-none shadow-sm",
                (isOutOfStock || !isLocationServiceable || isUnavailable || isStoreOffline)
                  ? "bg-stone-100 text-stone-450 border border-stone-200/50 cursor-not-allowed shadow-none"
                  : "bg-stone-950 text-white hover:bg-stone-900 active:scale-[0.98]"
              )}
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2]" />
                  <span>
                    {isStoreOffline
                      ? "Boutique Closed"
                      : !isLocationServiceable
                      ? "Unavailable in your area"
                      : isOutOfStock
                      ? "Sold Out"
                      : "Add to Bag"}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                onClose();
                router.push(`/products/${product.slug}`);
              }}
              className="text-xs text-stone-500 hover:text-stone-900 font-medium tracking-wide flex items-center justify-center gap-1 py-1 transition-all select-none"
            >
              <span>View Full Details</span>
              <span>→</span>
            </button>
          </div>
        </div>

      </div>

      {/* Boutique Mismatch Warning Modal */}
      <Modal
        isOpen={crossBoutiqueModalOpen}
        onClose={() => {
          logFunnelEvent({
            eventType: "cross_boutique_dismissed",
            productId: (product.slug ?? product._id) as any,
            boutiqueId: product.boutiqueId as any,
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
                {(product.images?.[0] || product.imageUrl) ? (
                  <img
                    src={product.images?.[0] || product.imageUrl}
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
                    {product.boutiqueName}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-stone-900">
                    ₹{(product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price).toLocaleString("en-IN")}
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
                  productId: (product.slug ?? product._id) as any,
                  boutiqueId: product.boutiqueId as any,
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
