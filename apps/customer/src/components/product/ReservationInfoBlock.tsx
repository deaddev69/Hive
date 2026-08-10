import React from "react";
import { Info } from "lucide-react";
import { cn } from "@hive/ui";

interface ReservationInfoBlockProps {
  className?: string;
}

export const ReservationInfoBlock: React.FC<ReservationInfoBlockProps> = ({ className }) => {
  return (
    <div className={cn("bg-stone-50 border border-stone-200 rounded-xl p-3.5", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-stone-500" />
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-stone-700 leading-none">
          How Reservations Work
        </h4>
      </div>
      <ul className="list-disc pl-5 space-y-1.5 text-[11px] font-medium text-stone-600 leading-relaxed">
        <li>The seller will review and confirm your reservation request.</li>
        <li>Once confirmed, you will have exactly 30 minutes to complete the payment.</li>
        <li>You will receive a WhatsApp message to your number once the seller accepts, then you need to complete the payment.</li>
      </ul>
    </div>
  );
};
