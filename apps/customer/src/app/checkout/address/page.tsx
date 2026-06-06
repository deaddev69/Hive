"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, MapPin, Sparkles, ChevronRight, X, Phone, User, Landmark, Building, Bell, ShoppingBag } from "lucide-react";
import { useAddressStore, Address } from "@/store/address-store";
import { isPincodeServiceable } from "@/data/mockServiceablePincodes";
import { useCartStore } from "@/store/cart-store";

export default function CheckoutAddressPage() {
  const router = useRouter();
  
  // Zustand Store selectors
  const addresses = useAddressStore((state) => state.addresses);
  const selectedAddressId = useAddressStore((state) => state.selectedAddressId);
  const addAddress = useAddressStore((state) => state.addAddress);
  const updateAddress = useAddressStore((state) => state.updateAddress);
  const deleteAddress = useAddressStore((state) => state.deleteAddress);
  const selectAddress = useAddressStore((state) => state.selectAddress);
  
  const getCartTotal = useCartStore((state) => state.getCartTotal);
  const items = useCartStore((state) => state.items);

  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Address form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "",
    isDefault: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Waitlist for unserviceable area
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <AddressSkeleton />;
  }

  const selectedAddress = addresses.find((addr) => addr.id === selectedAddressId) || null;
  const isServiceable = selectedAddress ? isPincodeServiceable(selectedAddress.pincode) : false;
  
  const subtotal = getCartTotal();
  const deliveryFee = subtotal >= 5000 ? 0 : 99;
  const total = subtotal + (isServiceable ? deliveryFee : 0);

  const handleOpenAddForm = () => {
    setEditingAddress(null);
    setFormData({
      name: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      landmark: "",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "",
      isDefault: false,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleOpenEditForm = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddress(addr);
    setFormData({
      name: addr.name,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      landmark: addr.landmark || "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = "Phone must be exactly 10 digits";
    }
    if (!formData.addressLine1.trim()) errors.addressLine1 = "Address line 1 is required";
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.state.trim()) errors.state = "State is required";
    if (!formData.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = "Pincode must be exactly 6 digits";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingAddress) {
      updateAddress(editingAddress.id, formData);
    } else {
      addAddress(formData);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this address?")) {
      deleteAddress(id);
    }
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setWaitlistSuccess(true);
    setTimeout(() => {
      setWaitlistSuccess(false);
      setWaitlistEmail("");
    }, 3500);
  };

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-hive-cream/30 py-20 px-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-hive-comb/40 flex items-center justify-center border border-hive-border/40 mx-auto">
            <ShoppingBag className="w-8 h-8 text-hive-gold stroke-[1.8]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-xl font-bold text-hive-dark">Your bag is empty</h1>
            <p className="text-xs text-hive-text-muted max-w-[280px] mx-auto leading-relaxed">
              Please add items to your cart before proceeding to shipping configuration.
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
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.back()}
          className="self-start flex items-center gap-2 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bag</span>
        </button>

        {/* Checkout Steps Progress Indicator */}
        <div className="w-full bg-white border border-hive-border/40 rounded-3xl p-5 shadow-sm max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-hive-text-muted">
          <div className="flex items-center gap-2 text-hive-dark">
            <span className="w-5 h-5 rounded-full bg-hive-dark text-hive-gold flex items-center justify-center text-[10px]">1</span>
            <span>Delivery Address</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-hive-border text-hive-text flex items-center justify-center text-[10px]">2</span>
            <span>Delivery Speed & Slot</span>
          </div>
          <div className="w-8 h-px bg-hive-border/60 hidden sm:block flex-1 mx-4" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-5 h-5 rounded-full bg-hive-border text-hive-text flex items-center justify-center text-[10px]">3</span>
            <span>Secure Payment</span>
          </div>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-black text-hive-dark text-left mt-4">
          Select Delivery Address
        </h1>

        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left items-start">
          
          {/* Left panel: Saved addresses */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Grid of Address cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => {
                const isSelected = addr.id === selectedAddressId;
                const serviceable = isPincodeServiceable(addr.pincode);
                
                return (
                  <div
                    key={addr.id}
                    onClick={() => selectAddress(addr.id)}
                    className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4 relative cursor-pointer group transition-all duration-300 ${
                      isSelected
                        ? "border-hive-dark ring-1 ring-hive-dark"
                        : "border-hive-border/50 hover:border-hive-border"
                    }`}
                  >
                    {/* Default badge & selector */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="selected_address"
                          checked={isSelected}
                          onChange={() => selectAddress(addr.id)}
                          className="w-4.5 h-4.5 accent-hive-dark cursor-pointer"
                        />
                        <span className="text-xs font-bold text-hive-dark truncate max-w-[140px]">
                          {addr.name}
                        </span>
                      </div>
                      
                      {addr.isDefault && (
                        <span className="text-[9px] font-extrabold uppercase bg-hive-comb text-hive-dark px-2 py-0.5 rounded-lg border border-hive-gold/15">
                          Default
                        </span>
                      )}
                    </div>

                    {/* Address details block */}
                    <div className="space-y-1 text-xs text-hive-text leading-relaxed font-medium">
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>{addr.city}, {addr.state} - <span className="font-extrabold">{addr.pincode}</span></p>
                      <p className="text-hive-text-muted mt-1.5 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 opacity-60" />
                        <span>{addr.phone}</span>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5 text-[10px] font-extrabold uppercase tracking-wide">
                      
                      {/* Serviceability quick indicator tag */}
                      <div>
                        {serviceable ? (
                          <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200/40">
                            Serviceable
                          </span>
                        ) : (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/40">
                            Unserviceable
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditForm(addr, e)}
                          className="flex items-center gap-1 text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(addr.id, e)}
                          className="flex items-center gap-1 text-hive-text-muted hover:text-red-500 transition-colors duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add address dotted trigger card */}
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="bg-transparent border-2 border-dashed border-hive-border hover:border-hive-gold rounded-3xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 min-h-[160px] group text-hive-text-muted hover:text-hive-dark focus:outline-none"
              >
                <Plus className="w-6 h-6 stroke-[1.8] group-hover:scale-110 transition-transform duration-300 text-hive-gold" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Add New Address
                </span>
              </button>
            </div>
            
          </div>

          {/* Right panel: Summary card & serviceability check */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Serviceability card */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Serviceability Status
              </h2>

              {selectedAddress ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-5 h-5 text-hive-gold flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-left">
                      <span className="font-extrabold text-hive-dark block">
                        Pincode: {selectedAddress.pincode}
                      </span>
                      <span className="text-hive-text-muted">
                        Checking hyperlocal courier coverage...
                      </span>
                    </div>
                  </div>

                  {isServiceable ? (
                    <div className="bg-green-50 border border-green-200 p-3.5 rounded-2xl space-y-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase bg-green-100 text-green-800 border border-green-200">
                        ✓ Serviceable Zone
                      </span>
                      <p className="text-xs font-bold text-green-700 leading-snug">
                        ✓ Same-Day Delivery Available in this region!
                      </p>
                      <p className="text-[10px] text-green-600/80 font-medium">
                        Alteration try-on delivery service supported.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl space-y-2 text-left">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200">
                          ✕ Not Available
                        </span>
                        <p className="text-xs font-extrabold text-red-700 leading-snug">
                          &quot;We&apos;re not in this area yet.&quot;
                        </p>
                        <p className="text-[10px] text-hive-text-muted font-medium">
                          Hive handcrafts and alters boutique items locally. We are launching here soon!
                        </p>
                      </div>

                      {/* Mock Notify list */}
                      <form onSubmit={handleWaitlistSubmit} className="space-y-2 pt-1 border-t border-hive-border/40">
                        <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block">
                          Request Launch In Pincode {selectedAddress.pincode}
                        </span>
                        
                        {!waitlistSuccess ? (
                          <div className="flex gap-2">
                            <input
                              type="email"
                              required
                              placeholder="Enter your email"
                              value={waitlistEmail}
                              onChange={(e) => setWaitlistEmail(e.target.value)}
                              className="flex-1 h-9 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                            />
                            <button
                              type="submit"
                              className="h-9 px-4 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 transition-all text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-sm"
                            >
                              Notify
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Added to waitlist! We will notify you.</span>
                          </div>
                        )}
                      </form>
                      
                      <Link
                        href="/products"
                        className="text-xs text-center font-extrabold uppercase tracking-widest text-hive-dark hover:text-hive-amber transition-colors duration-200 block border border-hive-border py-2.5 rounded-xl bg-white"
                      >
                        Back To Products
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-hive-text-muted bg-hive-gold/5 border border-hive-gold/15 p-4 rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-hive-amber flex-shrink-0" />
                  <span>Please select a delivery address or add a new one.</span>
                </div>
              )}
            </div>

            {/* 2. Order summary totals review */}
            <div className="bg-white border border-hive-border/50 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-extrabold text-hive-dark uppercase tracking-wider border-b border-hive-border/40 pb-2">
                Price Details
              </h2>
              
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Cart Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold text-hive-text-muted">
                  <span>Boutique Delivery</span>
                  <span>{isServiceable ? (deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`) : "₹0"}</span>
                </div>
                <div className="flex justify-between items-center border-t border-hive-border/40 pt-3 mt-1.5">
                  <span className="text-sm font-extrabold text-hive-dark">Estimated Total</span>
                  <span className="text-base font-extrabold text-hive-dark">
                    ₹{total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Checkout slot selection CTA */}
              <button
                type="button"
                disabled={!selectedAddress || !isServiceable}
                onClick={() => router.push("/checkout/delivery")}
                className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl mt-3 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hive-amber"
              >
                <span>Select Delivery Slot</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
          
        </div>
      </div>

      {/* Address Form Popup Modal (Create / Edit) */}
      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Modal Backdrop */}
          <div className="absolute inset-0 bg-hive-dark/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          
          {/* Modal Surface */}
          <div className="bg-hive-cream border border-hive-border rounded-3xl w-full max-w-lg p-6 shadow-2xl relative z-10 animate-[scaleUp_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-hive-border/40 pb-3 mb-4 text-left">
              <h3 className="font-serif text-lg font-bold text-hive-dark">
                {editingAddress ? "Edit Delivery Address" : "Add Delivery Address"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 rounded-full hover:bg-hive-border/40 text-hive-text-muted hover:text-hive-dark transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form inputs */}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="form-name" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="form-name"
                    type="text"
                    required
                    placeholder="e.g. Aditi Rao"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`h-10 px-3 text-xs border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium ${
                      formErrors.name ? "border-red-500" : "border-hive-border"
                    }`}
                  />
                  {formErrors.name && <span className="text-[9px] font-bold text-red-600">{formErrors.name}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="form-phone" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    id="form-phone"
                    type="tel"
                    required
                    placeholder="10-digit mobile phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`h-10 px-3 text-xs border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium ${
                      formErrors.phone ? "border-red-500" : "border-hive-border"
                    }`}
                  />
                  {formErrors.phone && <span className="text-[9px] font-bold text-red-600">{formErrors.phone}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="form-address1" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                  Address Line 1
                </label>
                <input
                  id="form-address1"
                  type="text"
                  required
                  placeholder="Flat, House no., Apartment complex"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className={`h-10 px-3 text-xs border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium ${
                    formErrors.addressLine1 ? "border-red-500" : "border-hive-border"
                  }`}
                />
                {formErrors.addressLine1 && <span className="text-[9px] font-bold text-red-600">{formErrors.addressLine1}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="form-address2" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    id="form-address2"
                    type="text"
                    placeholder="Street name, Sector, Area"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="form-landmark" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Landmark (Optional)
                  </label>
                  <input
                    id="form-landmark"
                    type="text"
                    placeholder="e.g. Near HDFC Bank"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="h-10 px-3 text-xs border border-hive-border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="form-city" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    City
                  </label>
                  <input
                    id="form-city"
                    type="text"
                    required
                    placeholder="e.g. Hyderabad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`h-10 px-3 text-xs border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium ${
                      formErrors.city ? "border-red-500" : "border-hive-border"
                    }`}
                  />
                  {formErrors.city && <span className="text-[9px] font-bold text-red-600">{formErrors.city}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="form-state" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    State
                  </label>
                  <input
                    id="form-state"
                    type="text"
                    required
                    placeholder="e.g. Telangana"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={`h-10 px-3 text-xs border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium ${
                      formErrors.state ? "border-red-500" : "border-hive-border"
                    }`}
                  />
                  {formErrors.state && <span className="text-[9px] font-bold text-red-600">{formErrors.state}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="form-pincode" className="text-[10px] font-bold text-hive-text-muted uppercase tracking-wider">
                    Pincode
                  </label>
                  <input
                    id="form-pincode"
                    type="text"
                    required
                    placeholder="6-digit pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className={`h-10 px-3 text-xs border rounded-xl focus:outline-none focus:border-hive-amber bg-white font-medium ${
                      formErrors.pincode ? "border-red-500" : "border-hive-border"
                    }`}
                  />
                  {formErrors.pincode && <span className="text-[9px] font-bold text-red-600">{formErrors.pincode}</span>}
                </div>
              </div>

              {/* Set default toggle */}
              <div className="flex items-center gap-2 pt-2 select-none text-xs font-semibold text-hive-dark">
                <input
                  id="form-default"
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-hive-dark cursor-pointer"
                />
                <label htmlFor="form-default" className="cursor-pointer">
                  Make this my default delivery address
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-hive-border/40 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 border border-hive-border hover:bg-hive-dark/5 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest text-hive-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-hive-dark text-hive-gold hover:bg-hive-dark/95 active:scale-[0.98] transition-all rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-sm"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading State: AddressSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function AddressSkeleton() {
  return (
    <div className="min-h-screen bg-hive-cream/30 py-12 px-4 sm:px-6 lg:px-8 animate-pulse select-none text-left">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Back Link Skeleton */}
        <div className="h-4 w-24 bg-hive-comb/10 rounded-lg" />

        {/* Progress Bar Skeleton */}
        <div className="h-14 w-full bg-white border border-hive-border/20 rounded-3xl" />

        {/* Header Title Skeleton */}
        <div className="h-8 w-60 bg-hive-comb/15 rounded-xl mt-4" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[220px] bg-white border border-hive-border/20 rounded-3xl" />
            <div className="h-[180px] bg-white border border-hive-border/20 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
