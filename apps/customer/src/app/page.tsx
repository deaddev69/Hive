"use client";

import React from "react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useSessionStore } from "@/context/SessionContext";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, StatCard } from "@hive/ui";
import { MapPin, ShoppingBag, Sparkles, Plus, AlertCircle, ShoppingCart } from "lucide-react";

export default function HomePage() {
  const { pincode, regionName, isServiceable, setGateOpen } = useLocation();
  const { addToCart, itemsCount } = useCart();
  const { user, loginAsMockUser } = useSessionStore();

  return (
    <div className="flex flex-col items-center p-8 bg-hive-cream/20 min-h-[75vh] text-hive-text">
      {/* Shell Inner Container */}
      <div className="max-w-4xl w-full flex flex-col gap-8">
        
        {/* Welcome Block */}
        <section className="bg-white border border-hive-border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-bold text-hive-gold uppercase tracking-wider">
              Permanent Application Shell
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-serif">
              Welcome to Hive customer
            </h2>
            <p className="text-xs text-hive-text-muted max-w-md">
              Future pages (product profiles, search filters, order forms) will inject directly into this wrapper shell.
            </p>
          </div>
          {!user && (
            <Button variant="primary" onClick={() => loginAsMockUser("customer")}>
              Sign In (Mock Profile)
            </Button>
          )}
        </section>

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

          </div>
        </section>

      </div>
    </div>
  );
}
