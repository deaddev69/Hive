import React from "react";
import { HiveLogo } from "@/components/shared/HiveLogo";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-hive-dark text-hive-cream border-t border-slate-900 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand Information */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <HiveLogo size="sm" className="mb-3 justify-center md:justify-start" />
          <p className="text-[11px] text-hive-text-muted max-w-xs">
            Hyperlocal boutique fashion delivered to your doorstep in Kochi in hours. Custom alterations and trial on delivery.
          </p>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap justify-center gap-6 text-xs text-hive-cream/60">
          <a href="#" className="hover:text-hive-gold transition-colors font-medium">Boutiques Directory</a>
          <a href="#" className="hover:text-hive-gold transition-colors font-medium">Terms of Service</a>
          <a href="#" className="hover:text-hive-gold transition-colors font-medium">Refund Policy</a>
          <a href="#" className="hover:text-hive-gold transition-colors font-medium">Support Contact</a>
        </div>

        {/* Copy remarks */}
        <div className="text-[10px] text-hive-text-muted text-center md:text-right">
          © {new Date().getFullYear()} TailorBee. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
