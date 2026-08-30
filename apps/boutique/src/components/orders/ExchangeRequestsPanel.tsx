"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { Repeat, Clock } from "lucide-react";
import { toast } from "@hive/utils";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

type ExchangeRow = {
  _id: Id<"exchangeRequests">;
  orderId: Id<"orders">;
  orderNumber: string | null;
  status: string;
  reason?: string;
  requestedAt: number;
  expiresAt: number;
  canAccept: boolean;
  msRemaining: number;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

/**
 * Exchange requests waiting on this boutique.
 *
 * `canAccept` and `msRemaining` come from the server — the countdown here is
 * cosmetic, and the accept mutation re-checks the 24h window against the stored
 * timestamp regardless of what this component believes.
 */
export function ExchangeRequestsPanel() {
  const exchanges = useQuery(api.exchanges.listMyBoutiqueExchanges, {});
  const disputeReceipt = useMutation(api.exchanges.disputeExchangeReceipt);

  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (!exchanges || exchanges.length === 0) return null;

  const actionable = (exchanges as ExchangeRow[]).filter((e) =>
    ["pending", "accepted"].includes(e.status)
  );
  if (actionable.length === 0) return null;

  const handleDispute = async (exchangeId: Id<"exchangeRequests">) => {
    const details = window.prompt(
      "Tell us what happened — the item was marked delivered back to you but didn't arrive?"
    );
    if (!details?.trim()) return;
    setBusyId(exchangeId);
    try {
      await disputeReceipt({ exchangeId, details: details.trim() });
      toast.success("Reported", "We've paused the exchange and the Hive team will look into it.");
    } catch (err: any) {
      toast.error("Couldn't report this", err.message || "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="w-4 h-4 text-amber-700" />
        <div>
          <h3 className="text-sm font-bold text-amber-950">
            Exchanges coming back ({actionable.length})
          </h3>
          <p className="text-[11px] text-amber-800/80">
            Accepted automatically under your 24h returns policy. Hive arranges the pickup.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {actionable.map((ex: ExchangeRow) => (
          <div
            key={ex._id}
            className="rounded-xl border border-amber-200 bg-white p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">
                Order {ex.orderNumber ?? "—"}
              </p>
              {ex.reason && (
                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                  &ldquo;{ex.reason}&rdquo;
                </p>
              )}
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {ex.status === "pending"
                  ? formatCountdown(ex.msRemaining)
                  : "Awaiting pickup from the customer"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busyId === ex._id}
                onClick={() => handleDispute(ex._id)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer"
              >
                Didn&apos;t receive it
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
