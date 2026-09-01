"use client";
import { useEffect, useState } from "react";

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

const GoldDot = () => (
  <span className="relative flex h-2 w-2 shrink-0">
    <span className="absolute inline-flex h-full w-full rounded-full bg-[#D9A71E] opacity-75 animate-ping" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D9A71E]" />
  </span>
);

const PillShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[38px] flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/60 select-none">
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
      <PillShell>
        <GoldDot />
        <p className="text-[11.5px] font-semibold text-stone-800 leading-tight">
          <span aria-hidden>🌙</span> Order tonight for Priority Morning Delivery to{" "}
          <span className="font-bold">{localityLabel}</span> by{" "}
          <span className="font-bold">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> tomorrow
        </p>
      </PillShell>
    );
  }

  const isUrgent = remainingMs !== null && remainingMs <= URGENT_WINDOW_MS;

  if (!isUrgent) {
    return (
      <PillShell>
        <GoldDot />
        <p className="text-[11.5px] font-semibold text-stone-800 leading-tight">
          <span aria-hidden>⚡</span> Order today for delivery to{" "}
          <span className="font-bold">{localityLabel}</span> by{" "}
          <span className="font-bold">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> today
        </p>
      </PillShell>
    );
  }

  return (
    <PillShell>
      <GoldDot />
      <p className="text-[11.5px] font-semibold text-stone-800 leading-tight">
        <span aria-hidden>⚡</span> Order in the next{" "}
        <span className="font-mono font-bold tabular-nums text-stone-900">
          {remainingMs === null ? "--:--" : formatClock(remainingMs)}
        </span>{" "}
        for delivery to <span className="font-bold">{localityLabel}</span> by{" "}
        <span className="font-bold">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> today
      </p>
    </PillShell>
  );
}
