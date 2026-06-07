"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ShoppingBag,
  Landmark,
  Wallet,
  Sparkles,
  ShieldCheck,
  Lock,
  Smartphone,
  Banknote,
  ChevronRight,
  Ticket,
  AlertCircle,
  ShieldAlert,
  Award,
  Truck,
  RotateCcw
} from "lucide-react";
import { useCartStore, CartItem } from "@/store/cart-store";
import { useCheckoutStore } from "@/store/checkout-store";
import { useOrderStore } from "@/store/order-store";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { getEffectiveCheckoutItems } from "@/lib/getEffectiveCheckoutItems";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interface definitions
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentMethodConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Secure Payment Page
// ─────────────────────────────────────────────────────────────────────────────
export default function SecurePaymentPage() {
  const router = useRouter();
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();

  // Convex: persistent addresses for the logged-in user
  const convexAddresses = useQuery(api.addresses.list) ?? [];
  const placeOrderMutation = useMutation(api.orders.placeOrder);
  const clearCartMutation = useMutation(api.cart.clearCart);

  // selectedAddressId comes from checkout store (set by address page)
  const storedAddressId = useCheckoutStore((state) => state.selectedAddressId);

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const selectedDate = useCheckoutStore((state) => state.selectedDate);
  const selectedSlot = useCheckoutStore((state) => state.selectedSlot);
  const selectedSlotWindow = useCheckoutStore((state) => state.selectedSlotWindow);
  const discountAmount = useCheckoutStore((state) => state.discountAmount);
  const appliedPromo = useCheckoutStore((state) => state.appliedPromo);
  const selectedPaymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const checkoutItems = useCheckoutStore((state) => state.checkoutItems);
  const setSelectedPaymentMethod = useCheckoutStore((state) => state.setSelectedPaymentMethod);
  const clearCheckout = useCheckoutStore((state) => state.clearCheckout);
  const placeOrder = useOrderStore((state) => state.placeOrder);

  const [mounted, setMounted] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // Ref to bypass validation guard while submitting order
  const isOrderPlacing = useRef(false);

  // Specific payment states
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  // Hydration checker
  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve selectedAddress from Convex addresses list
  const selectedAddress = convexAddresses.find((a) => a._id === storedAddressId)
    ?? convexAddresses.find((a) => a.isDefault)
    ?? convexAddresses[0]
    ?? null;

  const orderItems = getEffectiveCheckoutItems(items, checkoutItems);

  // Validation redirect filter: block access if previous checkout phases are missing
  // Skip when order is being placed — clearCheckout nullifies state before navigation completes
  useEffect(() => {
    if (mounted && !isOrderPlacing.current) {
      if (!storedAddressId) {
        router.replace("/checkout/address");
      } else if (!selectedDate || !selectedSlot) {
        router.replace("/checkout/delivery");
      }
    }
  }, [mounted, storedAddressId, selectedDate, selectedSlot, router]);

  if (!mounted || !clerkLoaded) {
    return <PaymentSkeleton />;
  }

  // Auth guard — redirect to sign-in before any Convex mutation can throw
  if (!isSignedIn) {
    router.replace("/sign-in?redirect_url=" + encodeURIComponent("/checkout/payment"));
    return <PaymentSkeleton />;
  }

  // Pre-requisites validation
  if (orderItems.length === 0 || !selectedAddress || !selectedDate || !selectedSlot) {
    return <PaymentSkeleton />;
  }

  // Price calculations
  const subtotal = orderItems.reduce((total: number, item: CartItem) => total + item.price * item.quantity, 0);
  let deliveryFee = subtotal >= 5000 ? 0 : 99;
  if (appliedPromo === "FREESHIP") {
    deliveryFee = 0;
  }
  const taxAmount = 0;
  const codFee = selectedPaymentMethod === "cod" ? 49 : 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee + taxAmount + codFee);

  // Available Payment Methods config
  const paymentMethods: PaymentMethodConfig[] = [
    {
      id: "upi",
      title: "UPI (Recommended)",
      description: "Fastest Checkout • GPay, PhonePe, Paytm, BHIM",
      icon: Smartphone,
      recommended: true,
    },
    {
      id: "card",
      title: "Credit / Debit Card",
      description: "Visa, Mastercard, RuPay, Amex supported",
      icon: CreditCard,
    },
    {
      id: "netbanking",
      title: "Net Banking",
      description: "Secure payment via major Indian banks",
      icon: Landmark,
    },
    {
      id: "wallet",
      title: "Wallets",
      description: "Paytm, PhonePe, Amazon Pay wallets",
      icon: Wallet,
    },
    {
      id: "cod",
      title: "Cash On Delivery (COD)",
      description: "Pay at door • Additional ₹49 handling fee",
      icon: Banknote,
    },
  ];

  // Validation before placing order
  const validatePaymentInput = (): boolean => {
    if (!selectedPaymentMethod) return false;

    if (selectedPaymentMethod === "upi") {
      if (!upiId || !upiId.includes("@")) {
        setUpiError("Please enter a valid UPI ID (e.g. name@upi)");
        return false;
      }
      setUpiError(null);
    }

    if (selectedPaymentMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        setCardError("Card number must be 16 digits");
        return false;
      }
      if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setCardError("Expiry must be in MM/YY format");
        return false;
      }
      if (cardCvv.length < 3) {
        setCardError("CVV must be 3 or 4 digits");
        return false;
      }
      if (!cardHolder.trim()) {
        setCardError("Please enter Cardholder Name");
        return false;
      }
      setCardError(null);
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethod) return;
    if (!validatePaymentInput()) return;
    if (!selectedAddress) return;

    const snapshotItems = orderItems.map((item: CartItem) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      boutiqueName: item.boutiqueName,
      size: item.size,
      quantity: item.quantity,
    }));

    const snapshotDate = selectedDate!;
    const snapshotSlot = selectedSlot!;

    isOrderPlacing.current = true;
    setIsPlacingOrder(true);

    try {
      const result = await placeOrderMutation({
        addressId: selectedAddress._id as Id<"addresses">,
        addressSnapshot: {
          label: selectedAddress.label,
          line1: selectedAddress.line1 ?? "",
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          lat: 0,
          lng: 0,
        },
        deliveryDate: snapshotDate,
        deliverySlot: snapshotSlot,
        paymentMethod: selectedPaymentMethod,
        items: snapshotItems,
        subtotal,
        deliveryFee,
        discount: discountAmount,
        total,
      });
      console.log("PLACE ORDER RESULT", result);

      // Store orderNumber for success page
      if (result) {
        placeOrder({
          id: result.orderNumber,
          convexId: result.orderId,
          items: orderItems,
          subtotal,
          discount: discountAmount,
          deliveryFee,
          codFee,
          total,
          paymentMethod: selectedPaymentMethod,
          address: {
            id: selectedAddress._id,
            name: selectedAddress.label,
            phone: "",
            addressLine1: selectedAddress.line1 ?? "",
            addressLine2: selectedAddress.line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            isDefault: selectedAddress.isDefault,
          },
          deliveryDate: snapshotDate,
          deliverySlot: snapshotSlot,
        });
      }

      const isBuyNow = checkoutItems.length > 0;

      // Navigate first, then cleanup
      router.push(`/order/success?orderId=${result.orderNumber}`);
      setTimeout(() => {
        if (!isBuyNow) {
          clearCartMutation({}).catch(console.error);
          clearCart();
        }
        clearCheckout();
        setIsPlacingOrder(false);
        // Do NOT set isOrderPlacing.current = false upon success to prevent unmount race redirects
      }, 500);
    } catch (err) {
      console.error("[PlaceOrder] Failed:", err);
      setIsPlacingOrder(false);
      isOrderPlacing.current = false;
      alert("Failed to place order. Please try again.");
    }
  };


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
          <span>Back to Order Review</span>
        </button>

        {/* Progress Tracker Progress Indicator */}
        <div className="w-full bg-white border border-hive-border/45 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-hive-text-muted max-w-4xl mx-auto">
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
          Choose Payment Method
        </h1>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2 pb-24 sm:pb-0">

          {/* Left Panel: Payment Method Selection */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm space-y-6">

              <div className="border-b border-hive-border/40 pb-4">
                <span className="text-xs font-extrabold text-hive-dark uppercase tracking-wider block">
                  Select a Secure Payment Option
                </span>
                <p className="text-[11px] text-hive-text-muted mt-1">
                  All transactions are 256-bit SSL encrypted for absolute security.
                </p>
              </div>

              {/* PaymentMethodSelector component layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Payment method cards list - 5 columns on medium screens */}
                <div className="md:col-span-5 flex flex-col gap-3">
                  {paymentMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      isSelected={selectedPaymentMethod === method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    />
                  ))}
                </div>

                {/* Sub-form section based on selection - 7 columns */}
                <div className="md:col-span-7 bg-hive-cream/10 border border-hive-border/30 rounded-2xl p-5 min-h-[280px] flex flex-col justify-between">

                  {!selectedPaymentMethod ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <Lock className="w-8 h-8 text-hive-text-muted/40" />
                      <p className="text-xs font-bold text-hive-text-muted">
                        Please select a payment method from the left to complete your order.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">

                      {/* UPI Detail Form */}
                      {selectedPaymentMethod === "upi" && (
                        <div className="space-y-4 text-left">
                          <div>
                            <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block mb-1">
                              Instant UPI Payment
                            </span>
                            <h4 className="text-xs font-extrabold text-hive-dark">Pay using UPI ID</h4>
                            <p className="text-[10px] text-hive-text-muted mt-0.5">
                              Enter your VPA / UPI address and click Place Order to verify in your UPI App.
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5 mt-2">
                            <label htmlFor="upiId" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                              UPI ID (VPA)
                            </label>
                            <input
                              id="upiId"
                              type="text"
                              required
                              placeholder="e.g. username@upi"
                              value={upiId}
                              onChange={(e) => {
                                setUpiId(e.target.value);
                                if (upiError) setUpiError(null);
                              }}
                              className="h-10 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full placeholder:opacity-50"
                            />
                            {upiError && (
                              <span className="text-[10px] text-red-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {upiError}
                              </span>
                            )}
                          </div>

                          {/* Quick UPI icons */}
                          <div className="pt-2">
                            <span className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider block mb-2">
                              Or Choose a Popular App
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {["Google Pay", "PhonePe", "Paytm UPI", "BHIM UPI"].map((app) => (
                                <button
                                  key={app}
                                  type="button"
                                  onClick={() => {
                                    setUpiId(`customer@${app.toLowerCase().replace(/\s+/g, "")}`);
                                    if (upiError) setUpiError(null);
                                  }}
                                  className="py-2.5 px-3 border border-hive-border/50 hover:border-hive-amber rounded-xl text-[10px] font-bold text-hive-dark bg-white flex items-center justify-between transition-colors"
                                >
                                  <span>{app}</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card Detail Form */}
                      {selectedPaymentMethod === "card" && (
                        <div className="space-y-4 text-left">
                          <div>
                            <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block mb-1">
                              Debit or Credit Card
                            </span>
                            <h4 className="text-xs font-extrabold text-hive-dark">Enter Card Information</h4>
                          </div>

                          {cardError && (
                            <div className="p-2.5 bg-red-50 border border-red-200/50 rounded-xl flex items-center gap-1.5 text-[10px] text-red-600 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{cardError}</span>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                              <label htmlFor="cardNumber" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                                Card Number
                              </label>
                              <div className="relative">
                                <input
                                  id="cardNumber"
                                  type="text"
                                  placeholder="4111 2222 3333 4444"
                                  maxLength={19}
                                  value={cardNumber}
                                  onChange={(e) => {
                                    // simple digit-only and formatting card layout spacing
                                    const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                                    const matches = v.match(/\d{4,16}/g);
                                    const match = (matches && matches[0]) || "";
                                    const parts = [];

                                    for (let i = 0, len = match.length; i < len; i += 4) {
                                      parts.push(match.substring(i, i + 4));
                                    }

                                    if (parts.length > 0) {
                                      setCardNumber(parts.join(" "));
                                    } else {
                                      setCardNumber(v);
                                    }
                                    if (cardError) setCardError(null);
                                  }}
                                  className="h-10 pl-4 pr-10 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full placeholder:opacity-50"
                                />
                                <CreditCard className="w-4 h-4 text-hive-text-muted/65 absolute right-3 top-3" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label htmlFor="cardExpiry" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                                  Expiry MM/YY
                                </label>
                                <input
                                  id="cardExpiry"
                                  type="text"
                                  placeholder="MM/YY"
                                  maxLength={5}
                                  value={cardExpiry}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/[^0-9]/g, "");
                                    if (val.length >= 2) {
                                      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                                    }
                                    setCardExpiry(val);
                                    if (cardError) setCardError(null);
                                  }}
                                  className="h-10 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full placeholder:opacity-50"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label htmlFor="cardCvv" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                                  CVV
                                </label>
                                <input
                                  id="cardCvv"
                                  type="password"
                                  placeholder="123"
                                  maxLength={4}
                                  value={cardCvv}
                                  onChange={(e) => {
                                    setCardCvv(e.target.value.replace(/[^0-9]/g, ""));
                                    if (cardError) setCardError(null);
                                  }}
                                  className="h-10 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full placeholder:opacity-50"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label htmlFor="cardHolder" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                                Cardholder Name
                              </label>
                              <input
                                id="cardHolder"
                                type="text"
                                placeholder="Aditi Rao"
                                value={cardHolder}
                                onChange={(e) => {
                                  setCardHolder(e.target.value);
                                  if (cardError) setCardError(null);
                                }}
                                className="h-10 px-4 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full placeholder:opacity-50"
                              />
                            </div>
                          </div>

                          {/* Card provider icons strip */}
                          <div className="pt-2 flex items-center justify-between border-t border-hive-border/40">
                            <span className="text-[8px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                              Supported Networks
                            </span>
                            <div className="flex gap-2">
                              {["Visa", "Mastercard", "RuPay", "Amex"].map((cardName) => (
                                <span
                                  key={cardName}
                                  className="px-2 py-1 bg-white border border-hive-border/40 rounded-lg text-[8px] font-extrabold text-hive-dark select-none"
                                >
                                  {cardName}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Net Banking Form */}
                      {selectedPaymentMethod === "netbanking" && (
                        <div className="space-y-4 text-left">
                          <div>
                            <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block mb-1">
                              Net Banking Secure Portal
                            </span>
                            <h4 className="text-xs font-extrabold text-hive-dark">Choose Popular Banks</h4>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "sbi", name: "SBI" },
                              { id: "hdfc", name: "HDFC" },
                              { id: "icici", name: "ICICI" },
                              { id: "axis", name: "Axis" }
                            ].map((bank) => {
                              const isBankSelected = selectedBank === bank.id;
                              return (
                                <button
                                  key={bank.id}
                                  type="button"
                                  onClick={() => setSelectedBank(bank.id)}
                                  className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-colors duration-200 ${isBankSelected
                                    ? "border-hive-dark bg-hive-comb/30 text-hive-dark"
                                    : "border-hive-border/50 hover:border-hive-border bg-white text-hive-text-muted"
                                    }`}
                                >
                                  {bank.name}
                                </button>
                              );
                            })}
                          </div>

                          {/* Other bank select list */}
                          <div className="flex flex-col gap-1.5 pt-2">
                            <label htmlFor="otherBanks" className="text-[9px] font-extrabold text-hive-text-muted uppercase tracking-wider">
                              Or Select Another Bank
                            </label>
                            <select
                              id="otherBanks"
                              value={selectedBank}
                              onChange={(e) => setSelectedBank(e.target.value)}
                              className="h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium w-full"
                            >
                              <option value="">Choose a bank...</option>
                              <option value="kotak">Kotak Mahindra Bank</option>
                              <option value="pnb">Punjab National Bank</option>
                              <option value="bob">Bank of Baroda</option>
                              <option value="indusind">IndusInd Bank</option>
                              <option value="yes">Yes Bank</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Wallets Form */}
                      {selectedPaymentMethod === "wallet" && (
                        <div className="space-y-4 text-left">
                          <div>
                            <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block mb-1">
                              Digital Wallets
                            </span>
                            <h4 className="text-xs font-extrabold text-hive-dark">Select Wallet</h4>
                          </div>

                          <div className="flex flex-col gap-2.5">
                            {[
                              { id: "paytm", name: "Paytm" },
                              { id: "phonepe", name: "PhonePe Wallet" },
                              { id: "amazonpay", name: "Amazon Pay Wallet" }
                            ].map((wallet) => {
                              const isWalletSelected = selectedWallet === wallet.id;
                              return (
                                <button
                                  key={wallet.id}
                                  type="button"
                                  onClick={() => setSelectedWallet(wallet.id)}
                                  className={`py-3.5 px-4 rounded-xl border text-xs font-bold text-left flex justify-between items-center transition-colors duration-200 ${isWalletSelected
                                    ? "border-hive-dark bg-hive-comb/30 text-hive-dark"
                                    : "border-hive-border/50 hover:border-hive-border bg-white text-hive-text-muted"
                                    }`}
                                >
                                  <span>{wallet.name}</span>
                                  <span className={`w-3.5 h-3.5 rounded-full border border-hive-border flex items-center justify-center ${isWalletSelected ? "bg-hive-dark border-hive-dark" : "bg-white"
                                    }`}>
                                    {isWalletSelected && <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* COD Form */}
                      {selectedPaymentMethod === "cod" && (
                        <div className="space-y-4 text-left">
                          <div>
                            <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block mb-1">
                              Cash On Delivery (COD)
                            </span>
                            <h4 className="text-xs font-extrabold text-hive-dark">Verify order at doorstep</h4>
                          </div>

                          <div className="p-3.5 bg-amber-50/50 border border-hive-border/60 rounded-2xl text-[11px] text-hive-text font-medium space-y-2 leading-relaxed">
                            <p>
                              • An additional handling surcharge of <span className="font-extrabold text-hive-dark">₹49</span> applies on Cash on Delivery orders.
                            </p>
                            <p>
                              • Our boutique delivery partner will accept payments through <span className="font-extrabold">cash</span> or any <span className="font-extrabold">UPI QR code</span> at the door after your trial window.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Common Safe Security indicator inside form box */}
                      <div className="flex items-center gap-2 mt-4 text-[9px] text-green-700 font-semibold bg-green-50/30 p-2.5 border border-green-200/20 rounded-xl">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <span>Try-On Fits & Minor alterations covered by Hive protection.</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>

          {/* Right Panel: Pricing calculations & trust banners */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Payment Summary */}
            <PaymentSummary
              itemCount={orderItems.reduce((count: number, item: CartItem) => count + item.quantity, 0)}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              discountAmount={discountAmount}
              taxAmount={taxAmount}
              codFee={codFee}
              total={total}
            />

            {/* 2. Place Order Section */}
            <PlaceOrderSection
              selectedPaymentMethod={selectedPaymentMethod}
              total={total}
              isPlacingOrder={isPlacingOrder}
              onPlaceOrder={handlePlaceOrder}
              upiId={upiId}
              cardNumber={cardNumber}
              cardExpiry={cardExpiry}
              cardCvv={cardCvv}
              cardHolder={cardHolder}
            />

            {/* 3. Payment Trust Strip */}
            <PaymentTrustStrip />

          </div>

        </div>

      </div>

      {/* Mobile view docked sticky bottom Place Order panel */}
      <div className="fixed bottom-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-md border-t border-hive-border/40 p-4 flex items-center justify-between gap-4 shadow-2xl sm:hidden">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-hive-text-muted">
            Payable Amount
          </span>
          <span className="text-base font-extrabold text-hive-dark">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>

        <button
          type="button"
          disabled={!selectedPaymentMethod || isPlacingOrder}
          onClick={handlePlaceOrder}
          className="flex-1 max-w-[200px] h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlacingOrder ? (
            <span className="w-4 h-4 rounded-full border-2 border-hive-gold border-t-transparent animate-spin" />
          ) : (
            <>
              <span>Place Order</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: PaymentMethodCard
// ─────────────────────────────────────────────────────────────────────────────
function PaymentMethodCard({
  method,
  isSelected,
  onClick,
}: {
  method: PaymentMethodConfig;
  isSelected: boolean;
  onClick: () => void;
}) {
  const IconComponent = method.icon;
  return (
    <button
      type="button"
      disabled={method.disabled}
      onClick={onClick}
      className={`w-full text-left p-4.5 rounded-2xl border transition-all duration-200 select-none flex items-start gap-3 relative ${method.disabled
        ? "opacity-45 cursor-not-allowed border-hive-border/30 bg-hive-cream/10"
        : isSelected
          ? "border-hive-dark bg-hive-comb/15 ring-[0.5px] ring-hive-dark"
          : "border-hive-border/50 hover:border-hive-border/80 hover:bg-hive-cream/10 bg-white"
        }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${isSelected ? "bg-hive-dark border-hive-dark text-hive-gold" : "bg-hive-comb/30 border-hive-border/50 text-hive-dark"
        } flex-shrink-0`}>
        <IconComponent className="w-4.5 h-4.5" />
      </div>

      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-hive-dark">{method.title}</span>
          {method.recommended && (
            <span className="text-[8px] font-extrabold text-green-700 bg-green-50 border border-green-200/50 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              Recommended
            </span>
          )}
        </div>
        <p className="text-[10px] text-hive-text-muted font-medium leading-normal">
          {method.description}
        </p>
      </div>

      {/* Selected indicator checkmark bubble */}
      {isSelected && (
        <span className="w-4 h-4 rounded-full bg-hive-dark border border-hive-gold flex items-center justify-center text-[8px] font-bold text-hive-gold absolute right-4 top-4">
          ✓
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: PaymentSummary
// ─────────────────────────────────────────────────────────────────────────────
function PaymentSummary({
  itemCount,
  subtotal,
  deliveryFee,
  discountAmount,
  taxAmount,
  codFee,
  total,
}: {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  taxAmount: number;
  codFee: number;
  total: number;
}) {
  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
      <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
        Order Billing
      </h2>

      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
          <span>Total Items</span>
          <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
        </div>

        <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
          <span>Items Subtotal</span>
          <span>₹{subtotal.toLocaleString("en-IN")}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-xs font-semibold text-green-700 bg-green-50/50 px-2 py-1 rounded-lg border border-green-200/20">
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-green-600" />
              <span>Applied Discount</span>
            </span>
            <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
          <span>Delivery Speed Fee</span>
          <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
        </div>

        <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
          <span>Estimated Tax</span>
          <span>₹{taxAmount}</span>
        </div>

        {codFee > 0 && (
          <div className="flex justify-between items-center text-xs font-semibold text-hive-amber bg-amber-50/40 px-2 py-1 rounded-lg border border-hive-gold/10">
            <span>COD Handling Surcharge</span>
            <span>+₹{codFee}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-hive-border/40 pt-3.5 mt-1.5">
          <span className="text-sm font-extrabold text-hive-dark">Amount Payable</span>
          <span className="text-base font-extrabold text-hive-dark">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: PlaceOrderSection
// ─────────────────────────────────────────────────────────────────────────────
function PlaceOrderSection({
  selectedPaymentMethod,
  total,
  isPlacingOrder,
  onPlaceOrder,
  upiId,
  cardNumber,
  cardExpiry,
  cardCvv,
  cardHolder,
}: {
  selectedPaymentMethod: string | null;
  total: number;
  isPlacingOrder: boolean;
  onPlaceOrder: () => void;
  upiId: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardHolder: string;
}) {
  // Check if selection is filled, and if input forms are ready
  let isFormValid = !!selectedPaymentMethod;
  if (selectedPaymentMethod === "upi") {
    isFormValid = !!upiId.trim();
  } else if (selectedPaymentMethod === "card") {
    isFormValid = !!cardNumber.trim() && !!cardExpiry.trim() && !!cardCvv.trim() && !!cardHolder.trim();
  }

  return (
    <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-3">

      {!selectedPaymentMethod && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200/50 p-2.5 rounded-xl">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-bold">Select payment method to place order.</span>
        </div>
      )}

      {selectedPaymentMethod && !isFormValid && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200/50 p-2.5 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-bold">Please complete details inside payment form.</span>
        </div>
      )}

      <button
        type="button"
        disabled={!isFormValid || isPlacingOrder}
        onClick={onPlaceOrder}
        className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hive-amber hidden sm:flex"
      >
        {isPlacingOrder ? (
          <span className="w-5 h-5 rounded-full border-2 border-hive-gold border-t-transparent animate-spin" />
        ) : (
          <>
            <span>Place Order (₹{total.toLocaleString("en-IN")})</span>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>

      <span className="text-[9px] text-hive-text-muted text-center leading-relaxed font-medium">
        By placing the order, you authorize the hyperlocal try-and-buy fitting service at delivery.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: PaymentTrustStrip
// ─────────────────────────────────────────────────────────────────────────────
function PaymentTrustStrip() {
  const guarantees = [
    { title: "Secure Payments", desc: "256-bit SSL network encryption.", icon: ShieldCheck },
    { title: "Encrypted Transactions", desc: "No card storage details kept.", icon: Lock },
    { title: "Verified Boutiques", desc: "Original designer authentication tags.", icon: Award },
    { title: "Buyer Protection", desc: "Refund protection for cancellations.", icon: Lock },
    { title: "48-Hour Replacement Support", desc: "Doorstep exchanges and sizing assistance.", icon: RotateCcw }
  ];

  return (
    <div className="bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm space-y-3.5 text-left">
      <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-wider block">
        Secure Escrow Guarantees
      </span>

      <div className="space-y-3">
        {guarantees.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-hive-comb/30 flex items-center justify-center border border-hive-border/40 text-hive-dark flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-hive-gold" />
              </div>
              <div className="text-[10px]">
                <span className="font-extrabold text-hive-dark block">{item.title}</span>
                <span className="text-hive-text-muted leading-normal mt-0.5">{item.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loader component
// ─────────────────────────────────────────────────────────────────────────────
function PaymentSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Back link skeleton */}
        <div className="h-4 w-24 bg-hive-comb/10 rounded-lg" />

        {/* Progress tracker skeleton */}
        <div className="h-14 w-full bg-white border border-hive-border/20 rounded-3xl" />

        {/* Title skeleton */}
        <div className="h-8 w-60 bg-hive-comb/15 rounded-xl mt-4" />

        {/* Two columns grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-[380px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[220px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[140px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[200px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>

      </div>
    </div>
  );
}
