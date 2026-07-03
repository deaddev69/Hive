"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Home, Briefcase, ChevronDown } from "lucide-react";
import { HiveLogo } from "@/components/shared/HiveLogo";
import { useCheckoutStore } from "@/store/checkout-store";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";

interface CheckoutHeaderProps {
  backHref: string;
  subline: string;
}

export const CheckoutHeader: React.FC<CheckoutHeaderProps> = ({ backHref, subline }) => {
  const { token } = useSessionStore();
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const savedAddresses = useQuery(api.addresses.list, { token: token || undefined }) ?? [];
  
  // Find selected address to extract label and city
  const selectedAddress = savedAddresses.find((addr: any) => addr._id === selectedAddressId);

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-hive-dark border-b border-slate-200/80 dark:border-neutral-800/80 select-none flex flex-col">
      {/* Top Row: Navigation, Logo, Destination */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-14 flex items-center justify-between gap-4">
        
        {/* Left Side: Deterministic Back button */}
        <div className="flex-1 flex justify-start">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-xs font-bold text-hive-text-muted hover:text-hive-dark transition-colors duration-150 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-hive-gold" />
            <span>Back</span>
          </Link>
        </div>

        {/* Center: Brand Logo */}
        <div className="flex-shrink-0 flex justify-center">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <HiveLogo noLink />
          </Link>
        </div>

        {/* Right Side: Shipping Capsule (Option 3 - Filled Luxury Icon) */}
        <div className="flex-1 flex justify-end items-center min-w-0">
          <div className="flex items-center min-w-0">
            {/* Map Pin Outline */}
            <MapPin className="w-4 h-4 text-hive-gold flex-shrink-0 mr-3" />
            
            {/* Divider and Badge Container */}
            <div className="border-l border-slate-200 dark:border-neutral-800/80 pl-3 flex items-center gap-2.5 min-w-0">
              {/* Circular Icon with light cream background */}
              <div className="w-8 h-8 rounded-full bg-hive-gold/10 flex items-center justify-center flex-shrink-0">
                {selectedAddress && selectedAddress.label.toLowerCase() === "home" ? (
                  <Home className="w-3.5 h-3.5 text-hive-dark" />
                ) : selectedAddress && selectedAddress.label.toLowerCase() === "work" ? (
                  <Briefcase className="w-3.5 h-3.5 text-hive-dark" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-hive-dark" />
                )}
              </div>
              
              {/* Text Block */}
              <div className="flex flex-col text-left min-w-0 leading-tight">
                <span className="text-[10px] font-black text-hive-dark uppercase tracking-wider truncate">
                  {selectedAddress ? selectedAddress.label : "CHOOSE"}
                </span>
                <span className="text-[9px] text-hive-text-muted font-bold truncate">
                  {selectedAddress ? (selectedAddress.city ? `${selectedAddress.city}, Kochi` : "Kochi") : "Address"}
                </span>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Orientation progress tracker */}
      <div className="w-full border-t border-slate-100 dark:border-neutral-800/60 h-8 flex items-center justify-center bg-slate-50/50 dark:bg-neutral-900/10">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-500">
          {subline}
        </span>
      </div>
    </header>
  );
};
