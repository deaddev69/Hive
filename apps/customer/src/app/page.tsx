"use client";

import React, { useState } from "react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useSessionStore } from "@/context/SessionContext";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { MapPin, Sparkles, Plus, ShoppingCart } from "lucide-react";
import { HeroSection } from "@/components/home/HeroSection";
import { OccasionRail } from "@/components/home/OccasionRail";
import { ProductCardDemo } from "@/components/product/ProductCardDemo";

export default function HomePage() {
  const { pincode, regionName, isServiceable, setGateOpen } = useLocation();
  const { addToCart, itemsCount } = useCart();
  const { user, loginAsMockUser } = useSessionStore();
  const [selectedOccasion, setSelectedOccasion] = useState("all");

  return (
    <div className="flex flex-col items-center bg-hive-cream/10 min-h-screen text-hive-text w-full">
      {/* Phase 4.1: Hero Section */}
      <HeroSection />

      {/* Phase 4.2: Occasion Rail */}
      <OccasionRail
        selectedOccasion={selectedOccasion}
        onOccasionChange={setSelectedOccasion}
      />

      {/* Phase 4.3: Product Card Demo Showcase */}
      <ProductCardDemo />

      {/* Shell Inner Container - Testing Controls */}
      <div className="max-w-7xl w-full mx-auto px-6 lg:px-8 py-12 flex flex-col gap-8">
        
        {/* Mock Sign In Control Bar */}
        {!user && (
          <section className="bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-hive-gold uppercase tracking-wider">
                Permanent Application Shell
              </span>
              <h2 className="text-lg font-bold font-serif mt-0.5">
                Sign in to validate session and checkout states
              </h2>
            </div>
            <Button variant="primary" onClick={() => loginAsMockUser("customer")}>
              Sign In (Mock Profile)
            </Button>
          </section>
        )}

        {/* Live Interaction Playground */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card: State Management Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2 text-left">
                <Sparkles className="w-5 h-5 text-hive-gold" /> Shell Triggers
              </CardTitle>
              <CardDescription className="text-left">
                Validate reactive changes across context boundaries
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-left">
              {/* Cart action trigger */}
              <div className="flex items-center justify-between border-b border-hive-border/40 pb-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Shopping Cart Store</span>
                  <span className="text-xs text-hive-text-muted">Adds mock products to client bag</span>
                </div>
                <Button variant="primary" size="sm" onClick={() => addToCart(1)} className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              {/* Location action trigger */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Location Gate Checker</span>
                  <span className="text-xs text-hive-text-muted">Displays pincode entry prompt</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setGateOpen(true)} className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-hive-gold" /> Change Loc
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card: Current Shell States */}
          <div className="flex flex-col gap-6">
            
            {/* Location Status Card */}
            <Card className="flex-1">
              <CardContent className="p-6 flex flex-col justify-between h-full gap-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-hive-text-muted">
                    Location Status
                  </span>
                  <MapPin className="w-5 h-5 text-hive-gold" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-extrabold">
                    {pincode ? pincode : "No Location Set"}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {pincode ? (
                      isServiceable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          Serviced: {regionName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          Unserviceable Zone
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-hive-text-muted font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        Pending selection
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cart Status Card */}
            <Card className="flex-1">
              <CardContent className="p-6 flex flex-col justify-between h-full gap-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-hive-text-muted">
                    Cart Status
                  </span>
                  <ShoppingCart className="w-5 h-5 text-hive-gold" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-extrabold">
                    {itemsCount} {itemsCount === 1 ? "Item" : "Items"}
                  </span>
                  <span className="text-xs text-hive-text-muted">
                    Tracks items count across router transitions
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Occasion Status Card */}
            <Card className="flex-1">
              <CardContent className="p-6 flex flex-col justify-between h-full gap-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-hive-text-muted">
                    Selected Occasion
                  </span>
                  <Sparkles className="w-5 h-5 text-hive-gold" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-extrabold capitalize">
                    {selectedOccasion}
                  </span>
                  <span className="text-xs text-hive-text-muted">
                    Reactive filter state managed by home page
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>
        </section>

      </div>
    </div>
  );
}
