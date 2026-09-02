"use client";
import { useEffect, useState } from "react";
import { Zap, Moon } from "lucide-react";

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

const PillShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[38px] flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200/90 select-none">
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
        <Moon className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
        <p className="text-[11.5px] font-medium text-stone-700 leading-tight">
          Order tonight for Priority Morning Delivery to{" "}
          <span className="font-bold text-stone-900">{localityLabel}</span> by{" "}
          <span className="font-bold text-stone-900">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> tomorrow
        </p>
      </PillShell>
    );
  }

  const isUrgent = remainingMs !== null && remainingMs <= URGENT_WINDOW_MS;

  if (!isUrgent) {
    return (
      <PillShell>
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
        <p className="text-[11.5px] font-medium text-stone-700 leading-tight">
          Order today for delivery to{" "}
          <span className="font-bold text-stone-900">{localityLabel}</span> by{" "}
          <span className="font-bold text-stone-900">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> today
        </p>
      </PillShell>
    );
  }

  return (
    <PillShell>
      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse shrink-0" />
      <p className="text-[11.5px] font-medium text-stone-700 leading-tight">
        Order in the next{" "}
        <span className="font-mono font-bold tabular-nums text-stone-950">
          {remainingMs != null ? formatClock(remainingMs) : "--:--"}
        </span>{" "}
        for delivery to{" "}
        <span className="font-bold text-stone-900">{localityLabel}</span> by{" "}
        <span className="font-bold text-stone-900">{formatTimeIST(countdown.targetDeliveryAtMs)}</span> today
      </p>
    </PillShell>
  );
}
