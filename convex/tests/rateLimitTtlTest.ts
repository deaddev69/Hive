// convex/tests/rateLimitTtlTest.ts
// Regression tests for the P1 rate-limit storage fixes:
//   1. rateLimits rows are now swept by age (nothing previously deleted them)
//   2. the anonymous search key no longer falls back to a shared "global" bucket
//
// The retention decision is exposed as a pure helper so it can be tested here without the
// Convex runtime, matching the approach in signatureTest.ts and p0HotfixTest.ts.

import {
  isRateLimitRowExpired,
  rateLimitSweepCutoff,
  RATE_LIMIT_RETENTION_MS,
  RATE_LIMIT_SWEEP_BATCH,
  RATE_LIMIT_SWEEP_MAX_PASSES,
} from "../rateLimitMaintenance";

let passed = 0;
let failed = 0;

function assertEqual(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } else {
    failed++;
    console.error(`❌ [FAIL] ${name} - Expected ${String(expected)} but got ${String(actual)}`);
  }
}

/**
 * Mirrors the anonymous/authenticated key selection in
 * products.ts checkSearchRateLimitInternal. Returns null when no limit is applied.
 */
function resolveSearchLimitKey(userId?: string, sessionId?: string): string | null {
  if (userId) return `search:${userId}`;
  if (!sessionId) return null;
  return `search:anon:${sessionId}`;
}

function testRetention() {
  console.log("\n── rateLimits retention horizon ──");
  const now = Date.now();

  // The longest window any caller uses is one hour, so a live row must never be swept.
  assertEqual("row from just now -> kept", isRateLimitRowExpired(now, now), false);
  assertEqual("row 1 minute old -> kept", isRateLimitRowExpired(now - 60_000, now), false);
  assertEqual("row 1 hour old (longest live window) -> kept", isRateLimitRowExpired(now - 60 * 60_000, now), false);
  assertEqual("row 23 hours old -> kept", isRateLimitRowExpired(now - 23 * 60 * 60_000, now), false);

  // Comfortably past every window in use.
  assertEqual("row 25 hours old -> swept", isRateLimitRowExpired(now - 25 * 60 * 60_000, now), true);
  assertEqual("row 30 days old -> swept", isRateLimitRowExpired(now - 30 * 24 * 60 * 60_000, now), true);

  // Exact boundary behaviour, so the horizon is not off by a window.
  assertEqual("row exactly at horizon -> kept", isRateLimitRowExpired(now - RATE_LIMIT_RETENTION_MS, now), false);
  assertEqual("row one ms past horizon -> swept", isRateLimitRowExpired(now - RATE_LIMIT_RETENTION_MS - 1, now), true);

  // The horizon must stay well clear of the longest window actually in use (1h).
  assertEqual("horizon exceeds longest live window", RATE_LIMIT_RETENTION_MS > 60 * 60_000, true);

  // The sweep's indexed query is `windowStart < rateLimitSweepCutoff(now)`. Pin that the helper
  // these tests assert on and the value the query is built from are the same decision, so the two
  // cannot drift apart again — an earlier revision computed the cutoff inline in the mutation and
  // the tests were silently validating code production never ran.
  const LONGEST_LIVE_WINDOW_MS = 60 * 60_000;
  let equivalenceHolds = true;
  let activeRowWouldBeDeleted = false;
  for (const offset of [
    0, 1, 1000, 60_000, LONGEST_LIVE_WINDOW_MS, LONGEST_LIVE_WINDOW_MS + 1,
    RATE_LIMIT_RETENTION_MS - 1, RATE_LIMIT_RETENTION_MS, RATE_LIMIT_RETENTION_MS + 1,
    2 * RATE_LIMIT_RETENTION_MS,
  ]) {
    const ws = now - offset;
    const queryWouldDelete = ws < rateLimitSweepCutoff(now); // exactly the index predicate
    if (queryWouldDelete !== isRateLimitRowExpired(ws, now)) equivalenceHolds = false;
    // Any row still inside the longest live window must survive the sweep.
    if (offset <= LONGEST_LIVE_WINDOW_MS && queryWouldDelete) activeRowWouldBeDeleted = true;
  }
  assertEqual("helper and index predicate agree on every boundary", equivalenceHolds, true);
  assertEqual("no row inside the longest live window is ever swept", activeRowWouldBeDeleted, false);
  assertEqual("sweep batch is bounded", RATE_LIMIT_SWEEP_BATCH > 0 && RATE_LIMIT_SWEEP_BATCH <= 1000, true);
  assertEqual("drain passes are bounded", RATE_LIMIT_SWEEP_MAX_PASSES > 0 && RATE_LIMIT_SWEEP_MAX_PASSES <= 100, true);
}

function testSearchKey() {
  console.log("\n── anonymous search key ──");

  // Signed-in callers key on server-derived identity.
  assertEqual("authenticated -> user key", resolveSearchLimitKey("user_123", undefined), "search:user_123");
  assertEqual("authenticated wins over sessionId", resolveSearchLimitKey("user_123", "sess_abc"), "search:user_123");

  // The regression: a missing sessionId used to land everyone in one shared bucket, which one
  // caller could exhaust to lock out every other signed-out shopper.
  assertEqual("anonymous without sessionId -> no limit applied", resolveSearchLimitKey(undefined, undefined), null);
  assertEqual("anonymous with empty sessionId -> no limit applied", resolveSearchLimitKey(undefined, ""), null);
  assertEqual(
    "no key can ever be the old shared global bucket",
    [
      resolveSearchLimitKey(undefined, undefined),
      resolveSearchLimitKey(undefined, ""),
      resolveSearchLimitKey(undefined, "sess_abc"),
      resolveSearchLimitKey("user_1", undefined),
    ].some((k) => k === "search:anon:global"),
    false
  );

  // Distinct sessions stay isolated from each other, so one shopper cannot throttle another.
  assertEqual("anonymous with sessionId -> own bucket", resolveSearchLimitKey(undefined, "sess_abc"), "search:anon:sess_abc");
  assertEqual(
    "two sessions do not collide",
    resolveSearchLimitKey(undefined, "sess_a") === resolveSearchLimitKey(undefined, "sess_b"),
    false
  );
}

export function runRateLimitTtlTests() {
  testRetention();
  testSearchKey();

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    throw new Error(`Rate Limit TTL Regression Tests Failed (${failed} failures)`);
  }
}

// Run immediately if executed via tsx
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("rateLimitTtlTest")) {
  runRateLimitTtlTests();
}
