"use client";

import React from "react";
import { RotateCcw, User, Phone, Bike, ExternalLink, PackageCheck } from "lucide-react";

/**
 * An item on its way back to the boutique.
 *
 * A seller could see every step of an order going out — rider, plate, live map,
 * timestamps — and nothing at all coming back. The first they knew of a return
 * was the item arriving at the counter. This gives the inbound leg the same
 * detail as the outbound one.
 */

type ReturnShipment = {
  awbNumber: string | null;
  status: string;
  trackingUrl: string | null;
  liveTrackingUrl: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  etaMinutes: number | null;
  pickedUpAt: number | null;
  deliveredAt: number | null;
};

/** What each stage of the return means to the person behind the counter. */
const STAGE: Record<string, { label: string; body: string }> = {
  requested: {
    label: "Return requested",
    body: "The customer has asked to return this. Hive is reviewing it — no action needed from you yet.",
  },
  approved: {
    label: "Return approved",
    body: "Hive approved the return and is arranging a rider to collect it from the customer.",
  },
  initiated: {
    label: "Rider on the way to the customer",
    body: "A rider is collecting the item from the customer and bringing it back to you.",
  },
  picked_up: {
    label: "Collected from the customer",
    body: "The item is with the rider and on its way to your store.",
  },
  in_transit: {
    label: "On its way back to you",
    body: "The item is in transit to your store.",
  },
  delivered: {
    label: "Back with you",
    body: "Check the item over. The customer is refunded in full once it is received, and your payout for this order is released back to you.",
  },
  completed: {
    label: "Return settled",
    body: "The customer has been refunded in full and this order is closed.",
  },
  failed: {
    label: "Return pickup failed",
    body: "The collection did not happen. Hive support is looking into it.",
  },
  cancelled: {
    label: "Return cancelled",
    body: "This return was called off. Nothing is coming back to you.",
  },
};

function stamp(ms: number | null): string | null {
  if (!ms) return null;
  return new Date(ms).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function ReturnLegPanel({
  returnStatus,
  returnShipment,
}: {
  returnStatus: string | null | undefined;
  returnShipment: ReturnShipment | null | undefined;
}) {
  if (!returnStatus) return null;

  const stage = STAGE[returnStatus] ?? {
    label: "Return in progress",
    body: "This item is being returned.",
  };
  const settled = returnStatus === "completed" || returnStatus === "delivered";
  const collected = stamp(returnShipment?.pickedUpAt ?? null);
  const arrived = stamp(returnShipment?.deliveredAt ?? null);

  return (
    <div
      className={`mt-2.5 p-3 rounded-xl text-left border ${
        settled
          ? "bg-emerald-50/70 border-emerald-200/80"
          : "bg-amber-50/70 border-amber-200/80"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {settled ? (
          <PackageCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        )}
        <span
          className={`text-[11px] font-extrabold ${
            settled ? "text-emerald-900" : "text-amber-950"
          }`}
        >
          {stage.label}
        </span>
      </div>

      <p
        className={`text-[11px] leading-relaxed ${
          settled ? "text-emerald-900/80" : "text-amber-900/80"
        }`}
      >
        {stage.body}
      </p>

      {(collected || arrived) && (
        <div className="mt-2 flex flex-col gap-0.5 text-[10px] text-stone-600">
          {collected && (
            <span>
              Collected from customer <span className="font-semibold">{collected}</span>
            </span>
          )}
          {arrived && (
            <span>
              Back at your store <span className="font-semibold">{arrived}</span>
            </span>
          )}
        </div>
      )}

      {returnShipment?.awbNumber && (
        <div className="mt-2.5 pt-2.5 border-t border-stone-200/70 flex items-center justify-between gap-2 text-[10px]">
          <span className="uppercase tracking-wider font-extrabold text-stone-400">
            Return booking
          </span>
          <span className="font-mono font-bold text-stone-900">
            {returnShipment.awbNumber}
          </span>
        </div>
      )}

      {returnShipment?.driverName && (
        <div className="mt-2 pt-2 border-t border-stone-200/70">
          <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider mb-1.5">
            Rider bringing it back
          </p>
          <div className="flex flex-col gap-1.5 text-[11px]">
            <span className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-bold text-stone-900">{returnShipment.driverName}</span>
            </span>
            {returnShipment.driverPhone && (
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <a
                  href={`tel:${returnShipment.driverPhone}`}
                  className="font-mono font-semibold text-stone-700 hover:underline"
                >
                  {returnShipment.driverPhone}
                </a>
              </span>
            )}
            <span className="flex items-center gap-2">
              <Bike className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-mono text-stone-700">
                {returnShipment.vehiclePlate || "2 Wheeler"}
              </span>
            </span>
            {returnShipment.etaMinutes != null && (
              <span className="font-semibold text-amber-700">
                {returnShipment.etaMinutes} mins away
              </span>
            )}
          </div>
        </div>
      )}

      {(returnShipment?.liveTrackingUrl || returnShipment?.trackingUrl) && (
        <a
          href={returnShipment.liveTrackingUrl || returnShipment.trackingUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer"
        >
          <span>Track return</span>
          <ExternalLink className="w-3 h-3 text-stone-300" />
        </a>
      )}
    </div>
  );
}
