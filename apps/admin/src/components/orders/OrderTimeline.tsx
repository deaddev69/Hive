"use client";

import React from "react";
import { useQuery } from "convex/react";
import { Clock, Truck, Store, CheckCircle2, Package } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

/** Full date + time, since operations need to know the day as well as the clock. */
function stamp(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** How long a leg took, shown against the step that ended it. */
function gap(from: number | null, to: number | null): string | null {
  if (!from || !to || to <= from) return null;
  const mins = Math.round((to - from) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

const ICONS: Record<string, React.ReactNode> = {
  placed: <Package className="w-3.5 h-3.5" />,
  accepted: <Store className="w-3.5 h-3.5" />,
  rider_assigned: <Truck className="w-3.5 h-3.5" />,
  picked_up: <Truck className="w-3.5 h-3.5" />,
  delivered: <CheckCircle2 className="w-3.5 h-3.5" />,
  return_picked_up: <Truck className="w-3.5 h-3.5" />,
  return_delivered: <Store className="w-3.5 h-3.5" />,
  return_completed: <CheckCircle2 className="w-3.5 h-3.5" />,
};

/**
 * The order's journey with real timestamps.
 *
 * Times marked "Porter" come from the courier's own webhooks rather than from
 * when Hive happened to process them, so they reflect what actually happened on
 * the ground.
 */
export function OrderTimeline({ orderId }: { orderId: Id<"orders"> }) {
  const timeline = useQuery(api.orderTimeline.getOrderTimelineAdmin, { orderId });

  if (timeline === undefined) {
    return (
      <div className="rounded-2xl border border-hive-border/60 bg-white p-4">
        <div className="h-3 w-24 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 w-full bg-slate-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!timeline) return null;

  const reached = timeline.events.filter((e: any) => e.at);

  return (
    <div className="rounded-2xl border border-hive-border/60 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3.5 h-3.5 text-hive-amber" />
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-hive-text-muted">
          Order timeline
        </h4>
      </div>

      <ol className="space-y-0">
        {timeline.events.map((event: any, i: number) => {
          const previousReached = reached
            .filter((r: any) => r.at && r.at <= (event.at ?? 0))
            .slice(-2)[0];
          const took = event.at ? gap(previousReached?.at ?? null, event.at) : null;
          const done = !!event.at;

          return (
            <li
              key={event.key}
              className={`flex items-start gap-3 py-2 ${
                i > 0 ? "border-t border-slate-50" : ""
              }`}
            >
              <div
                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  done
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-slate-50 text-slate-300 border border-slate-200"
                }`}
              >
                {ICONS[event.key] ?? <Clock className="w-3.5 h-3.5" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`text-[11px] font-bold ${
                      done ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {event.label}
                  </span>
                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 ${
                      done ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    {stamp(event.at)}
                  </span>
                </div>

                {(event.detail || took || event.source === "porter") && (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {event.source === "porter" && done && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1 py-px">
                        Porter
                      </span>
                    )}
                    {took && (
                      <span className="text-[10px] text-slate-500 font-medium">+{took}</span>
                    )}
                    {event.detail && (
                      <span className="text-[10px] text-slate-500">{event.detail}</span>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {timeline.trackingUrl && (
        <a
          href={timeline.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-hive-amber hover:underline"
        >
          <Truck className="w-3 h-3" />
          Open Porter tracking
        </a>
      )}

      {timeline.webhookLog.length > 0 && (
        <details className="mt-3">
          <summary className="text-[10px] font-bold uppercase tracking-wider text-hive-text-muted cursor-pointer">
            Courier event log ({timeline.webhookLog.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {timeline.webhookLog.map((e: any, i: number) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[10px]">
                <span className="font-semibold text-slate-700">
                  {String(e.status ?? "—").replace(/_/g, " ")}
                </span>
                <span className="font-mono tabular-nums text-slate-500 shrink-0">
                  {stamp(e.at)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
