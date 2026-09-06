// convex/rateLimitMaintenance.ts
// Background sweep that deletes dead rate-limit rows.
//
// convex/lib/rateLimit.ts enforces limits by writing a row per key. Nothing ever deleted those
// rows: the only deletion path was adminSweep, which is a full data-reset utility rather than an
// expiry mechanism. Every distinct key therefore became permanent, and because the anonymous
// search key is built from a caller-supplied sessionId, an attacker rotating it could mint rows
// without bound — turning the rate limiter itself into a write-amplification vector.
//
// Reads already tolerate a stale row (checkRateLimit resets the window when it has elapsed), so
// this sweep is purely about storage: it removes rows whose window is long past and which no
// longer influence any decision.

import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * How old a row's window must be before the row is considered dead.
 *
 * The longest window any caller of checkRateLimit uses today is one hour (media uploads and
 * WhatsApp sends). A 24-hour horizon therefore sits an order of magnitude beyond the longest
 * live window, so a row can never be deleted while it still affects a decision, while still
 * bounding the table to roughly "distinct keys seen in the last day". The margin also leaves
 * recent buckets in place long enough to be useful when debugging a limit complaint.
 */
export const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Rows deleted per invocation. Keeps each transaction small and predictable. */
export const RATE_LIMIT_SWEEP_BATCH = 500;

/** Guards the self-rescheduling drain so a pathological backlog cannot loop forever. */
export const RATE_LIMIT_SWEEP_MAX_PASSES = 20;

/**
 * The single source of truth for the sweep boundary: a row is dead iff its windowStart is
 * strictly below this value. The mutation below builds its indexed range query from this exact
 * function rather than recomputing the arithmetic inline, so the boundary the tests assert on is
 * literally the boundary production evaluates — there is no second copy to drift.
 */
export function rateLimitSweepCutoff(
  now: number,
  retentionMs: number = RATE_LIMIT_RETENTION_MS
): number {
  return now - retentionMs;
}

/**
 * Whether a row is old enough to delete. Expressed in terms of the same cutoff the query uses,
 * so `isRateLimitRowExpired(ws, now)` and the index predicate `windowStart < cutoff` cannot
 * disagree. Strict `<` means a row sitting exactly on the horizon is deliberately KEPT.
 */
export function isRateLimitRowExpired(
  windowStart: number,
  now: number,
  retentionMs: number = RATE_LIMIT_RETENTION_MS
): boolean {
  return windowStart < rateLimitSweepCutoff(now, retentionMs);
}

export const cleanupExpiredRateLimits = internalMutation({
  args: { pass: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const pass = args.pass ?? 1;
    // Same function the tests assert against — not a re-derivation of the same arithmetic.
    const cutoff = rateLimitSweepCutoff(Date.now());

    // Indexed range read, so the cost is proportional to what is actually deleted rather than to
    // table size — important precisely in the case this exists for, a table bloated by abuse.
    const expired = await ctx.db
      .query("rateLimits")
      .withIndex("by_windowStart", (q) => q.lt("windowStart", cutoff))
      .take(RATE_LIMIT_SWEEP_BATCH);

    for (const row of expired) {
      await ctx.db.delete(row._id);
    }

    // A full batch means there is probably more waiting. Drain it in further small transactions
    // instead of one large one: a burst that minted tens of thousands of rows should not have to
    // wait for the next cron tick, and should not be cleared in a single oversized mutation.
    const drainedFullBatch = expired.length === RATE_LIMIT_SWEEP_BATCH;
    const shouldContinue = drainedFullBatch && pass < RATE_LIMIT_SWEEP_MAX_PASSES;
    if (shouldContinue) {
      await ctx.scheduler.runAfter(5000, internal.rateLimitMaintenance.cleanupExpiredRateLimits, {
        pass: pass + 1,
      });
    }

    return { deleted: expired.length, pass, scheduledAnotherPass: shouldContinue };
  },
});
