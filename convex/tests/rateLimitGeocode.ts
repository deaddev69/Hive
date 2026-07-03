// convex/tests/rateLimitGeocode.ts
import { action, mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

export const setupTestSession = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: "chaos_rate_limit@hive.com",
      role: "customer",
      isActive: true,
      isPhoneVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const token = `mock_user_${userId}`;
    return { userId, token };
  }
});

export const cleanupTestSession = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Clear the test user
    await ctx.db.delete(args.userId);
    
    // Clean up created address documents
    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const addr of addresses) {
      await ctx.db.delete(addr._id);
    }

    // Clean up rate limit tracking records
    const limits = await ctx.db.query("rateLimits").collect();
    for (const lim of limits) {
      if (lim.key.includes(args.userId.toString())) {
        await ctx.db.delete(lim._id);
      }
    }
  }
});

export const runRateLimitGeocodeTests = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING GEOCODE RATE LIMIT BURST TEST ===");
    
    const setup = await ctx.runMutation((internal as any)["tests/rateLimitGeocode"].setupTestSession);
    const token = setup.token;
    
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Fire 15 address geocode attempts in rapid succession
    for (let i = 1; i <= 15; i++) {
      try {
        const result = await ctx.runAction((api as any).location.reverseGeocode, {
          lat: 28.7041,
          lng: 77.1025,
          token
        });
        
        if (i === 1) {
          console.log(`[Burst Test] Request 1 First Payload Output: ${JSON.stringify(result, null, 2)}`);
        }
        
        successCount++;
        console.log(`[Burst Test] Request ${i}: SUCCESS`);
      } catch (err: any) {
        failureCount++;
        errors.push(err.message);
        console.log(`[Burst Test] Request ${i}: FAILED - ${err.message}`);
      }
    }

    // Tear down setup
    await ctx.runMutation((internal as any)["tests/rateLimitGeocode"].cleanupTestSession, {
      userId: setup.userId,
      sessionId: setup.sessionId,
    });

    console.log(`=== TEST SUMMARY ===`);
    console.log(`Successes: ${successCount} (Expected: 10)`);
    console.log(`Failures: ${failureCount} (Expected: 5)`);
    
    if (successCount !== 10) {
      throw new Error(`FAIL: Expected exactly 10 successes, got ${successCount}`);
    }
    if (failureCount !== 5) {
      throw new Error(`FAIL: Expected exactly 5 failures, got ${failureCount}`);
    }
    
    const rateLimitError = errors.find(msg => msg.includes("Rate limit exceeded") || msg.includes("too many requests"));
    if (!rateLimitError) {
      throw new Error("FAIL: Rejections did not specify rate limit error.");
    }
    
    console.log("=== GEOCODE RATE LIMIT BURST TEST PASSED ===");
    return { success: true, successCount, failureCount };
  }
});

// Helper: Create an artificially expired upload session for the orphan cleanup test
export const createExpiredUploadSession = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // We insert a session that expired 25 hours ago
    const expiredTime = Date.now() - (25 * 60 * 60 * 1000); 
    const sessionId = await ctx.db.insert("uploadSessions", {
      bucket: "test-bucket",
      objectKey: "test/mock_object.jpg",
      status: "pending",
      expiresAt: expiredTime,
      createdAt: expiredTime - 60000,
      ownerType: "boutique",
      ownerId: "dummy_owner",
      size: 1024,
      mime: "image/jpeg",
      sessionId: "mock_session_id" as any,
      userId: args.userId,
      assetType: "product_image",
      provider: "cloudflare_r2",
    });
    return sessionId;
  }
});

export const checkSessionDeleted = query({
  args: { sessionId: v.id("uploadSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session === null;
  }
});
