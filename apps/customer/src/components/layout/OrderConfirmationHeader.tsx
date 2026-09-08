"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Minimal post-checkout confirmation header.
 * Replaces the full shopping Navbar on /order/success to reduce visual competition
 * and give the customer a focused "post-purchase" experience.
 */
export const OrderConfirmationHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-neutral-950 border-b border-stone-200/80 dark:border-neutral-800/80 select-none">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 w-full h-12 flex items-center justify-between gap-4">
        {/* Left: Back to Orders */}
        <div className="flex-1 flex justify-start">
          <Link
            href="/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors duration-150 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
            <span>Orders</span>
          </Link>
        </div>

        {/* Center: hive·now wordmark */}
        <div className="flex-shrink-0 flex justify-center">
          <Link href="/" className="hover:opacity-85 transition-opacity">
            <Image
              src="/hive-logo-gold-trimmed.png"
              alt="hive·now"
              width={100}
              height={28}
              priority
              className="h-5 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right: spacer for centering */}
        <div className="flex-1" />
      </div>
    </header>
  );
};
