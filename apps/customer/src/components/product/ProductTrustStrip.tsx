import React from "react";
import { ShieldCheck, Ruler, Truck, RefreshCw } from "lucide-react";

interface TrustItem {
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: ShieldCheck,
    title: "100% Verified Origin",
    description: "Handcrafted directly by local independent boutiques in Kerala.",
  },
  {
    icon: Ruler,
    title: "Fit Guarantee",
    description: "Every item is physically measured before being packed.",
  },
  {
    icon: Truck,
    title: "Same Day Shipping",
    description: "Delivered to your doorstep in 4-hour slots where eligible.",
  },
  {
    icon: RefreshCw,
    title: "48h Replacements",
    description: "Easy replacement requests within 48 hours of delivery.",
  },
];

export const ProductTrustStrip: React.FC = () => {
  return (
    <div className="w-full bg-hive-cream/20 border border-hive-border/40 rounded-3xl p-5 md:p-6 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {TRUST_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex gap-3 items-start group">
              {/* Icon outer box */}
              <div className="w-9 h-9 rounded-xl bg-white border border-hive-border/60 flex items-center justify-center text-hive-amber flex-shrink-0 shadow-sm group-hover:scale-105 group-hover:border-hive-gold/50 transition-all duration-300">
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-extrabold text-hive-dark">{item.title}</h4>
                <p className="text-hive-text-muted mt-1 leading-relaxed font-medium">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
