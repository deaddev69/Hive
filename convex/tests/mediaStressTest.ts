import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

export const runUploadBurstTest = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING MEDIA UPLOAD RATE LIMIT TEST ===");
    
    // 1. Setup mock session
    const setup = await ctx.runMutation("tests/rateLimitGeocode:setupTestSession" as any);
    const token = setup.token;
    
    let successCount = 0;
    let blockedCount = 0;
    let errors: string[] = [];

    // 2. Fire 25 generateUploadUrl attempts (limit is 20/hour)
    for (let i = 1; i <= 25; i++) {
      try {
        await ctx.runAction((api as any).media.api.generateUploadUrl, {
          token,
          context: "product_image",
          fileSize: 1024,
          mimeType: "image/jpeg",
          ownerId: "dummy_owner",
          ownerType: "boutique"
        });
        successCount++;
        console.log(`[Media Burst] Request ${i}: SUCCESS`);
      } catch (err: any) {
        if (err.message.includes("Rate limit exceeded") || err.message.includes("Too many requests")) {
          blockedCount++;
        }
        errors.push(err.message);
        console.log(`[Media Burst] Request ${i}: FAILED - ${err.message}`);
      }
    }

    // 3. Tear down mock session
    await ctx.runMutation("tests/rateLimitGeocode:cleanupTestSession" as any, {
      userId: setup.userId,
    });

    return { successCount, blockedCount, lastError: errors[errors.length - 1] };
  }
});

export const runOrphanCleanupTest = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("=== STARTING ORPHAN CLEANUP TEST ===");
    
    // 1. Create a dummy expired upload session
    // We reuse the setup user for the mock upload session
    const setup = await ctx.runMutation("tests/rateLimitGeocode:setupTestSession" as any);
    const sessionId = await ctx.runMutation("tests/rateLimitGeocode:createExpiredUploadSession" as any, { userId: setup.userId });
    console.log(`[Orphan Cleanup] Created expired session: ${sessionId}`);
    
    // 2. Call the actual cleanup cron directly
    const cleanupResult: any = await ctx.runAction((internal as any).media.cleanup.cleanupOrphans);
    console.log(`[Orphan Cleanup] Result:`, cleanupResult);
    
    // 3. Verify it was deleted
    const isDeleted = await ctx.runQuery("tests/rateLimitGeocode:checkSessionDeleted" as any, { sessionId });
    console.log(`[Orphan Cleanup] Session deleted? ${isDeleted}`);

    // Tear down mock user
    await ctx.runMutation("tests/rateLimitGeocode:cleanupTestSession" as any, { userId: setup.userId });
    
    return { sessionId, isDeleted };
  }
});
