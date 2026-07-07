import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

export const runBurstTest = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING AUTHENTICATED BURST TEST ===");
    
    // 1. Setup mock authenticated session
    const setup = await ctx.runMutation((internal as any)["tests/rateLimitGeocode"].setupTestSession);
    const token = setup.token;
    
    let successCount = 0;
    let blockedCount = 0;
    let errors: string[] = [];

    // 2. Fire 25 reverse geocoding attempts
    for (let i = 1; i <= 25; i++) {
      try {
        await ctx.runAction(api.location.reverseGeocode, {
          lat: 9.9816,
          lng: 76.2999,
          token,
        });
        successCount++;
        console.log(`[Burst Test] Request ${i}: SUCCESS`);
      } catch (err: any) {
        if (err.message.includes("Rate limit exceeded") || err.message.includes("Geocoding rate limit exceeded")) {
          blockedCount++;
        }
        errors.push(err.message);
        console.log(`[Burst Test] Request ${i}: FAILED - ${err.message}`);
      }
    }

    // 3. Tear down mock session
    await ctx.runMutation((internal as any)["tests/rateLimitGeocode"].cleanupTestSession, {
      userId: setup.userId,
    });

    console.log(`=== TEST SUMMARY ===`);
    console.log(`Successes: ${successCount} (Expected: 10)`);
    console.log(`Blocked: ${blockedCount} (Expected: 15)`);

    return { successCount, blockedCount, lastError: errors[errors.length - 1] };
  }
});

export const forceSetRole = internalMutation({
  args: { userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: args.role as any });
    return `Updated ${args.userId} to ${args.role}`;
  }
});
