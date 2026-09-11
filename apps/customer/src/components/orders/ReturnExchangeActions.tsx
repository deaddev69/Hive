"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { RotateCcw, Repeat, AlertCircle, Ticket, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@hive/utils";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useConvexMutation } from "@/hooks/useConvexMutation";
import { CUSTOMER_FEATURES } from "@/config/features";

type Mode = "return" | "exchange";

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "917356019103";

/**
 * Hand the conversation to WhatsApp straight after the request lands.
 * Opened only once the mutation has succeeded, so the customer is never sent to
 * chat about a request the server rejected.
 */
function openWhatsApp(message: string) {
  if (typeof window === "undefined") return;
  window.open(
    `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

/**
 * Return and exchange actions on a delivered order.
 *
 * Return gives the customer their money back; exchange gives them credit.
 * Both windows are enforced on the server.
 */
export function ReturnExchangeActions({
  orderId,
  orderNumber,
  returnStatus,
  isWindowActive,
  returnInspection,
}: {
  orderId: Id<"orders">;
  orderNumber: string;
  returnStatus?: string | null;
  isWindowActive: boolean;
  /** The boutique's check of the returned item, once it has arrived. */
  returnInspection?: {
    decision: "accepted" | "rejected";
    resolution?: "refunded" | "no_refund";
  } | null;
}) {
  const exchange = useQuery(api.exchanges.getExchangeForOrder, { orderId });
  const requestReturn = useConvexMutation(api.returns.requestReturn);
  const requestExchange = useConvexMutation(api.exchanges.requestExchange);

  const [mode, setMode] = useState<Mode | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Please tell us what went wrong with your order.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "return") {
        await requestReturn({ orderId, reason: reason.trim() });
        toast.success("Return requested. We'll confirm shortly and arrange pickup.");
      } else {
        await requestExchange({ orderId, reason: reason.trim() });
        toast.success("Exchange confirmed. Let's sort out your replacement on WhatsApp.");
      }
      // Both flows hand off to the same support conversation
      openWhatsApp(
        `Hi Hive Support, I want to request a ${mode} for my order ${orderNumber}. Reason: ${reason.trim()}`
      );
      setMode(null);
      setReason("");
    } catch {
      // useConvexMutation already surfaced the message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── An exchange is already under way ──────────────────────────────────────
  if (exchange) {
    if (!CUSTOMER_FEATURES.EXCHANGES_ENABLED) {
      return (
        <StatusCard
          tone="amber"
          icon={<Clock className="w-4 h-4 text-amber-700" />}
          title="Request in progress"
          body="Your request has been received. Hive Support will contact you shortly regarding resolution."
        />
      );
    }

    if (exchange.status === "pending") {
      return (
        <StatusCard
          tone="amber"
          icon={<Clock className="w-4 h-4 text-amber-700" />}
          title="Exchange requested"
          body="Your exchange request has been submitted. We'll message you as soon as it's confirmed."
        />
      );
    }

    if (exchange.status === "accepted") {
      return (
        <div className="space-y-2">
          <StatusCard
            tone="emerald"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-700" />}
            title="Exchange accepted"
            body="Confirm what piece or size you'd like instead. We'll arrange doorstep pickup of your original item."
          />
          {exchange.whatsappVisible && (
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                `Hi Hive Support, I want to coordinate my exchange for order #${orderNumber}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-stone-950 hover:bg-stone-900 text-white font-semibold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <Repeat className="w-3.5 h-3.5 text-stone-400" />
              <span>Continue on WhatsApp</span>
            </a>
          )}
        </div>
      );
    }

    if (exchange.status === "completed") {
      return (
        <StatusCard
          tone="emerald"
          icon={<Ticket className="w-4 h-4 text-emerald-700" />}
          title="Exchange complete"
          body="Your store credit is ready under Coupons — valid for 30 days toward any piece."
        />
      );
    }

    if (exchange.status === "rejected") {
      return (
        <StatusCard
          tone="slate"
          icon={<AlertCircle className="w-4 h-4 text-stone-500" />}
          title="Exchange declined"
          body={exchange.rejectionReason || "This exchange request could not be accepted."}
        />
      );
    }

    if (exchange.status === "expired") {
      return (
        <StatusCard
          tone="slate"
          icon={<Clock className="w-4 h-4 text-stone-500" />}
          title="Exchange request expired"
          body="This exchange request expired. Contact Hive Support and we'll resolve this for you."
        />
      );
    }
  }

  // ── A return is already under way ─────────────────────────────────────────
  if (returnStatus) {
    // Every stage before the money moves says the same thing about the money,
    // because "when do I get my refund" is the only question a customer
    // actually has while an item is on its way back.
    const copy: Record<string, string> = {
      requested:
        "We've received your return request and will confirm pickup details shortly. Your refund is sent once the boutique has the item back and has checked it over.",
      approved:
        "Return approved. We're arranging courier pickup from your delivery address. Your refund is sent once the boutique has the item back and has checked it over.",
      initiated:
        "A rider is on the way to collect the item from your doorstep. Once it reaches the boutique and they've checked it over, we'll refund what you paid in full.",
      picked_up:
        "Your item has been collected and is on its way back to the boutique. Once it arrives and they've checked it over, we'll refund what you paid in full.",
      in_transit:
        "Your item is on its way back to the boutique. Once it arrives and they've checked it over, we'll refund what you paid in full.",
      delivered:
        "The boutique has your item and is checking it. Once they accept it, we'll refund what you paid in full to the card or account you paid with.",
      completed:
        "Refunded in full. It should reach your original payment method within 5-7 working days.",
      failed: "Something went wrong with the return pickup. Contact Hive Support and we'll fix it.",
      cancelled: "This return request was cancelled.",
    };

    // The refund now waits for the boutique to check the item, so the two
    // outcomes of that check each need their own words.
    let returnBody = copy[returnStatus] || "Your return is being processed.";
    if (
      returnStatus === "delivered" &&
      returnInspection?.decision === "rejected" &&
      !returnInspection.resolution
    ) {
      returnBody =
        "The boutique raised a concern about the returned item. Hive is reviewing it and will be in touch shortly.";
    } else if (returnStatus === "cancelled" && returnInspection?.resolution === "no_refund") {
      returnBody =
        "This return wasn't accepted after the item was inspected. Contact Hive Support if you have any questions.";
    }

    return (
      <StatusCard
        tone={returnStatus === "completed" ? "emerald" : "amber"}
        icon={<RotateCcw className="w-4 h-4 text-stone-600" />}
        title={returnStatus === "completed" ? "Return complete" : "Return in progress"}
        body={returnBody}
      />
    );
  }

  if (!isWindowActive) return null;

  // ── Choose an action ──────────────────────────────────────────────────────
  if (!mode) {
    if (!CUSTOMER_FEATURES.EXCHANGES_ENABLED) {
      return (
        <button
          type="button"
          onClick={() => setMode("return")}
          className="w-full h-11 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
          <span>Request a Return</span>
        </button>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setMode("exchange")}
          className="h-11 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          <Repeat className="w-3.5 h-3.5 text-stone-500" />
          <span>Exchange</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("return")}
          className="h-11 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
          <span>Return</span>
        </button>
      </div>
    );
  }

  // ── Reason form ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs text-left">
      <div className="space-y-1">
        <h4 className="text-sm font-serif font-bold text-stone-900 tracking-tight">
          {mode === "exchange" ? "Request an exchange" : "Request a return"}
        </h4>
        <p className="text-xs text-stone-500 leading-relaxed font-normal">
          {mode === "exchange"
            ? "We'll arrange doorstep collection and issue instant store credit for the full purchase value, valid for 30 days."
            : "We'll refund what you paid to your original payment method once the item is received and inspected."}
        </p>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder={
          mode === "exchange"
            ? "What size or piece would suit you better?"
            : "What was wrong with the item?"
        }
        className="w-full text-xs rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all font-sans leading-relaxed"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setMode(null);
            setReason("");
          }}
          className="h-10 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="h-10 bg-stone-950 hover:bg-stone-900 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
        >
          {submitting ? "Sending..." : "Submit request"}
        </button>
      </div>
    </div>
  );
}

function StatusCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: "amber" | "emerald" | "slate";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const tones = {
    amber: "bg-amber-50/70 border-amber-200/80 text-amber-900",
    emerald: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
    slate: "bg-stone-50 border-stone-200/90 text-stone-700",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 text-left ${tones[tone]}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-stone-900">{title}</h4>
        <p className="text-[11px] leading-relaxed text-stone-600 font-normal">{body}</p>
      </div>
    </div>
  );
}
