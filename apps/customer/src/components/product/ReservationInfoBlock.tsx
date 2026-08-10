import React from "react";
import { Info } from "lucide-react";
import { cn } from "@hive/utils";

interface ReservationInfoBlockProps {
  className?: string;
}

export const ReservationInfoBlock: React.FC<ReservationInfoBlockProps> = ({ className }) => {
  return (
    <div className={cn("bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-[#D97706]" />
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#92400E] leading-none">
          How Reservations Work
        </h4>
      </div>
      <ul className="list-disc pl-5 space-y-1.5 text-[11px] font-medium text-[#B45309]/90 leading-relaxed">
        <li>The boutique will review and confirm your reservation request.</li>
        <li>Once confirmed, you will have exactly 30 minutes to complete the payment.</li>
        <li>Unpaid reservations will automatically expire and release the stock.</li>
      </ul>
    </div>
  );
};
