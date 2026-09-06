"use client";
import { useEffect, useState } from "react";
import { Zap, Moon } from "lucide-react";
import { cn } from "@hive/ui";

export interface DeliveryCountdownData {
  mode: "today" | "tomorrow";
  orderCutoffAtMs: number | null;
  targetDeliveryAtMs: number;
}

// Only dramatize the countdown once it's inside Hive's own 90-minute delivery promise — a live
// clock reading "8:42:10" ten hours before cutoff would fabricate urgency that isn't real.
const URGENT_WINDOW_MS = 90 * 60 * 1000;

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTimeIST(epochMs: number): string {
  // en-IN renders "am"/"pm" lowercase; the brand copy elsewhere in the app uses "AM"/"PM".
  return new Date(epochMs)
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .toUpperCase();
}

const PillShell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "min-h-[42px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-amber-50/70 dark:bg-stone-900/70 border border-amber-200/80 dark:border-amber-900/40 backdrop-blur-sm shadow-2xs select-none transition-all",
      className
    )}
  >
    {children}
  </div>
);

export function DeliveryCountdownPill({
  countdown,
  locality,
}: {
  countdown?: DeliveryCountdownData | null;
  locality?: string | null;
}) {
  // Ticks against the fixed cutoff timestamp (Date.now() diff each second), never decrements a
  // counter — so the pill can't drift from the server's actual cutoff no matter how long the tab
  // stays open or how many timers get throttled in a background tab.
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const cutoffAt = countdown?.mode === "today" ? countdown.orderCutoffAtMs : null;

  useEffect(() => {
    if (cutoffAt == null) return;
    const tick = () => setRemainingMs(Math.max(0, cutoffAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cutoffAt]);

  if (!countdown) return null;

  const localityLabel = locality || "your area";
  const expiredToday = countdown.mode === "today" && remainingMs !== null && remainingMs <= 0;

  // The order window closed while this tab was open. Rather than fabricate tomorrow's real cutoff
  // client-side, just hide the pill — the next query refetch will bring the correct copy.
  if (expiredToday) return null;

  if (countdown.mode === "tomorrow") {
    return (
      <PillShell className="bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800">
        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Moon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/20" />
        </div>
        <p className="text-[12px] text-stone-700 dark:text-stone-300 leading-snug">
          <strong className="font-bold text-stone-950 dark:text-stone-100">Order tonight</strong> for Priority Morning Delivery to{" "}
          <span className="font-bold text-stone-900 dark:text-stone-100">{localityLabel}</span> by{" "}
          <span className="font-bold text-stone-900 dark:text-stone-100">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> tomorrow
        </p>
      </PillShell>
    );
  }

  const isUrgent = remainingMs !== null && remainingMs <= URGENT_WINDOW_MS;

  if (!isUrgent) {
    return (
      <PillShell>
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
        </div>
        <p className="text-[12px] text-stone-700 dark:text-stone-300 leading-snug">
          <strong className="font-bold text-amber-700 dark:text-amber-400">Hive it Now!</strong>{" "}
          Delivered to <span className="font-bold text-stone-900 dark:text-stone-100">{localityLabel}</span> by{" "}
          <span className="font-bold text-stone-900 dark:text-stone-100">{formatTimeIST(countdown.targetDeliveryAtMs)}</span>
        </p>
        <span className="ml-auto hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 uppercase tracking-wider shrink-0">
          90-Min
        </span>
      </PillShell>
    );
  }

  return (
    <PillShell className="border-amber-400/80 dark:border-amber-500/40 bg-amber-50/90 dark:bg-stone-900/90">
      <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
        <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500 animate-pulse" />
      </div>
      <p className="text-[12px] text-stone-700 dark:text-stone-300 leading-snug">
        <strong className="font-bold text-amber-700 dark:text-amber-400">Hive it Now!</strong>{" "}
        Order in next{" "}
        <span className="font-mono font-bold tabular-nums text-amber-800 dark:text-amber-300">
          {remainingMs != null ? formatClock(remainingMs) : "--:--"}
        </span>{" "}
        for delivery to <span className="font-bold text-stone-900 dark:text-stone-100">{localityLabel}</span> by{" "}
        <span className="font-bold text-stone-900 dark:text-stone-100">{formatTimeIST(countdown.targetDeliveryAtMs)}</span>
      </p>
      <span className="ml-auto hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 uppercase tracking-wider shrink-0">
        90-Min
      </span>
    </PillShell>
  );
}
