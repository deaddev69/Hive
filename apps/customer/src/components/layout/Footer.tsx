import React from "react";
import { HiveLogo } from "@/components/shared/HiveLogo";
import Link from "next/link";

export const Footer: React.FC = () => {
  const SELLER_PORTAL_URL = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || "http://seller.localhost:3001";

  return (
    <>
      {/* Hyperlocal warm ivory footer transition strip */}
      <div className="w-full bg-[#FAF6F0] h-8 border-t border-hive-border/20" />
      
      <footer className="w-full bg-[#181511] text-hive-cream/90 border-t border-[#25211B] pt-6 pb-[calc(4rem+0.5rem)] md:pt-12 md:pb-[calc(4rem+1.5rem)] px-5 sm:px-8 lg:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-12">
          <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-12 pb-5 md:pb-8 border-b border-[#25211B]">
            
            {/* Column 1: Brand Info */}
            <div className="flex flex-col items-start gap-2 col-span-1">
              <HiveLogo size="sm" className="justify-start text-hive-gold scale-90 origin-left" />
              <p className="text-[10.5px] text-hive-cream/45 max-w-sm leading-relaxed hidden sm:block">
                Discover local fashion. Delivered in hours, not days.
              </p>
            </div>

            {/* Column 2 & 3 wrapper for mobile side-by-side grid */}
            <div className="grid grid-cols-2 gap-6 w-full md:w-auto md:flex md:gap-16">
              
              {/* Shop Column */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-hive-gold/90">Shop</h4>
                <div className="flex flex-col gap-1.5 text-[11px] md:text-xs">
                  <Link href="/products" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Shop</Link>
                  <Link href="/orders" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Orders</Link>
                  <Link href="/wishlist" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Wishlist</Link>
                </div>
              </div>

              {/* Partners & Legal Column */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-hive-gold/90">Partners & Legal</h4>
                <div className="flex flex-col gap-1.5 text-[11px] md:text-xs">
                  <Link href="/become-seller" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Sell on Hive</Link>
                  <Link href="/become-seller" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Partner Portal</Link>
                  <a href="mailto:support@hive.tailorbee.in" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Support</a>
                  <Link href="/terms#section-14" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Returns</Link>
                  <Link href="/terms" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Terms</Link>
                  <Link href="/terms#privacy-policy" className="text-hive-cream/55 hover:text-hive-gold transition-colors font-medium">Privacy</Link>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom copyright row */}
          <div className="flex flex-row justify-between items-center w-full text-[10px] text-hive-cream/35 font-medium tracking-wide">
            <span>© {new Date().getFullYear()} Hive</span>
            <span className="text-[9px] text-hive-cream/20 font-light lowercase tracking-normal">built by tailorbee</span>
          </div>
        </div>
      </footer>
    </>
  );
};

