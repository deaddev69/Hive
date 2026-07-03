// convex/lib/rateLimit.ts
// Database-backed rate limiting helper.

import { MutationCtx } from "../_generated/server";

/**
 * Checks and updates rate limits for a given key.
 * Throws an error if the limit is exceeded.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number,
  windowMs: number
) {
  const now = Date.now();
  const limit = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!limit) {
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (now - limit.windowStart > windowMs) {
    // Reset window
    await ctx.db.patch(limit._id, {
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (limit.count >= maxAttempts) {
    throw new Error(`Too many requests. Rate limit exceeded. Please try again in ${Math.ceil((limit.windowStart + windowMs - now) / 1000)} seconds.`);
  }

  await ctx.db.patch(limit._id, {
    count: limit.count + 1,
  });
}
