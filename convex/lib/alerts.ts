// convex/lib/alerts.ts
// System Alerts Helper — logs system alerts idempotently.

import { MutationCtx } from "../_generated/server";

export async function logSystemAlert(
  ctx: MutationCtx,
  code: "claim.transition_failed" | "shipment.transition_failed" | "payout.blocked" | "settlement.frozen" | "inventory.restore_blocked" | "cron.failed" | "finance.reconciliation_failed" | "finance.settlement_missing",
  message: string,
  severity: "info" | "warning" | "critical",
  details?: Record<string, unknown>
) {
  const now = Date.now();

  // Deduplication guard: Check if there is already an unresolved duplicate of this alert
  const unresolvedAlerts = await ctx.db
    .query("systemAlerts")
    .withIndex("by_resolved", (q) => q.eq("resolved", false))
    .collect();

  const isDuplicate = unresolvedAlerts.some(
    (alert) => alert.code === code && alert.message === message
  );

  if (isDuplicate) {
    return; // Skip duplicate unresolved alerts
  }

  await ctx.db.insert("systemAlerts", {
    code,
    severity,
    message,
    details: details ? JSON.stringify(details) : undefined,
    resolved: false,
    createdAt: now,
  });
}
