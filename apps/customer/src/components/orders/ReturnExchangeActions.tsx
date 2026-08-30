"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { RotateCcw, Repeat, AlertCircle, Ticket, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@hive/utils";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useConvexMutation } from "@/hooks/useConvexMutation";

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
 * Return gives the customer their money back; exchange gives them credit at the
 * same boutique. Both windows are enforced on the server — the UI hides expired
 * buttons for tidiness, but the mutation is what actually refuses.
 */
export function ReturnExchangeActions({
  orderId,
  orderNumber,
  returnStatus,
  isWindowActive,
}: {
  orderId: Id<"orders">;
  orderNumber: string;
  returnStatus?: string | null;
  isWindowActive: boolean;
}) {
  const exchange = useQuery(api.exchanges.getExchangeForOrder, { orderId });
  const requestReturn = useConvexMutation(api.returns.requestReturn);
  const requestExchange = useConvexMutation(api.exchanges.requestExchange);

  const [mode, setMode] = useState<Mode | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast.error("Please tell us what went wrong so the boutique can help.");
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
      // Both flows hand off to the same support conversation, so the customer
      // always lands in one thread rather than two depending on what they picked.
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
    if (exchange.status === "pending") {
      return (
        <StatusCard
          tone="amber"
          icon={<Clock className="w-4 h-4" />}
          title="Exchange requested"
          body="The boutique has 24 hours to respond. We'll message you as soon as they do."
        />
      );
    }

    if (exchange.status === "accepted") {
      return (
        <div className="space-y-2">
          <StatusCard
            tone="emerald"
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Exchange accepted"
            body="Message the boutique to agree what you'd like instead. We'll arrange pickup of the original item."
          />
          {exchange.whatsappVisible && (
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
                `Hi Hive Support, I want to request a exchange for my order ${orderNumber}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
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
          icon={<Ticket className="w-4 h-4" />}
          title="Exchange complete"
          body="Your credit is ready. Find it under Coupons — it's valid for 30 days at this boutique."
        />
      );
    }

    if (exchange.status === "rejected") {
      return (
        <StatusCard
          tone="slate"
          icon={<AlertCircle className="w-4 h-4" />}
          title="Exchange declined"
          body={exchange.rejectionReason || "The boutique couldn't accept this exchange."}
        />
      );
    }

    if (exchange.status === "expired") {
      return (
        <StatusCard
          tone="slate"
          icon={<Clock className="w-4 h-4" />}
          title="Exchange request expired"
          body="The boutique didn't respond within 24 hours. Contact support and we'll sort it out."
        />
      );
    }
  }

  // ── A return is already under way ─────────────────────────────────────────
  if (returnStatus) {
    const copy: Record<string, string> = {
      requested: "We've got your return request and will confirm it shortly.",
      approved: "Return approved. We're arranging pickup from your address.",
      initiated: "A rider is on the way to collect the item.",
      picked_up: "The item has been collected and is on its way back to the boutique.",
      in_transit: "The item is on its way back to the boutique.",
      delivered: "The boutique has received the item. Your refund is being processed.",
      completed: "Refunded. It should reach your original payment method in 5-7 working days.",
      failed: "Something went wrong with the return pickup. Contact support and we'll fix it.",
      cancelled: "This return was cancelled.",
    };

    return (
      <StatusCard
        tone={returnStatus === "completed" ? "emerald" : "amber"}
        icon={<RotateCcw className="w-4 h-4" />}
        title={returnStatus === "completed" ? "Return complete" : "Return in progress"}
        body={copy[returnStatus] || "Your return is being processed."}
      />
    );
  }

  if (!isWindowActive) return null;

  // ── Choose an action ──────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setMode("exchange")}
          className="py-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 border border-amber-300 dark:border-amber-800 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Repeat className="w-4 h-4" />
          <span>Exchange</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("return")}
          className="py-3 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return</span>
        </button>
      </div>
    );
  }

  // ── Reason form ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="space-y-1">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
          {mode === "exchange" ? "Request an exchange" : "Request a return"}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
          {mode === "exchange"
            ? "We'll collect this item and give you credit worth what you paid, to spend at this boutique within 30 days."
            : "We'll refund what you paid to your original payment method once the boutique has the item back."}
        </p>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder={
          mode === "exchange"
            ? "What size or item would suit you better?"
            : "What was wrong with the item?"
        }
        className="w-full text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-3 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setMode(null);
            setReason("");
          }}
          className="py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="py-2.5 bg-hive-amber hover:bg-[#d07b0a] text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-60 active:scale-[0.98]"
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
    amber:
      "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400",
    slate:
      "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${tones[tone]}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-[11px] leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
