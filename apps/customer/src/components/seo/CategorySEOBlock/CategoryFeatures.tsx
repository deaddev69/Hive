import React from "react";
import { CheckCircle2 } from "lucide-react";

export function CategoryFeatures({ features }: { features: string[] }) {
  if (!features || features.length === 0) return null;

  return (
    <div className="mb-12 bg-hive-cream/30 border border-hive-border/40 rounded-2xl p-6 sm:p-8">
      <h3 className="text-lg font-bold font-serif text-hive-dark mb-6">Why shop with Hive?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-hive-gold flex-shrink-0 mt-0.5" />
            <span className="text-sm text-stone-700 font-medium">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
