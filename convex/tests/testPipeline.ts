import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const run = action({
  args: { },
  handler: async (ctx) => {
    const results: string[] = [];
    console.log("=== STARTING PIPELINE TESTS ===");

    // Test 1: Category with a valid image (simulated)
    try {
      const { presignedUrl, sessionId } = await ctx.runAction(internal.media.api.generateUploadUrlTest, {
        mimeType: "image/jpeg",
        fileSize: 100, // We'll just upload a 100 byte text string pretending to be a jpeg, which will fail magic bytes
        ownerType: "admin",
        ownerId: "categories",
        context: "category_image"
      });

      // Upload text/html as image/jpeg
      const badData = new TextEncoder().encode("<html><script>alert(1)</script></html>".padEnd(100, " "));
      const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: badData
      });
      if (!res.ok) throw new Error("Upload to R2 failed");

      // Commit the upload
      await ctx.runAction(internal.media.api.commitUploadTest, { sessionId });
      results.push("❌ CATEGORY POLYGLOT TEST FAILED: Upload succeeded but should have failed.");
    } catch (e: any) {
      if (e.message.includes("Magic byte verification failed")) {
        results.push("✅ CATEGORY POLYGLOT TEST PASSED: Properly rejected mislabeled file.");
      } else {
        results.push("❌ CATEGORY POLYGLOT TEST ERROR: " + e.message);
      }
    }

    // Test 2: Banner with a valid image (simulated)
    try {
      const { presignedUrl, sessionId } = await ctx.runAction(internal.media.api.generateUploadUrlTest, {
        mimeType: "image/png",
        fileSize: 100,
        ownerType: "admin",
        ownerId: "banners",
        context: "banner_image"
      });

      // Valid PNG magic bytes + padding
      const validPngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(92).fill(0)]);
      const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: validPngBytes
      });
      if (!res.ok) throw new Error("Upload to R2 failed");

      // Commit the upload
      await ctx.runAction(internal.media.api.commitUploadTest, { sessionId });
      results.push("✅ BANNER VALID UPLOAD TEST PASSED: Properly accepted valid PNG.");
    } catch (e: any) {
      results.push("❌ BANNER VALID UPLOAD TEST ERROR: " + e.message);
    }

    // Test 3: Banner with a size mismatch
    try {
      const { presignedUrl, sessionId } = await ctx.runAction(internal.media.api.generateUploadUrlTest, {
        mimeType: "image/png",
        fileSize: 100,
        ownerType: "admin",
        ownerId: "banners",
        context: "banner_image"
      });

      const validPngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(50).fill(0)]); // Only 58 bytes instead of 100
      const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: validPngBytes
      });

      await ctx.runAction(internal.media.api.commitUploadTest, { sessionId });
      results.push("❌ BANNER SIZE MISMATCH TEST FAILED: Upload succeeded but should have failed.");
    } catch (e: any) {
      if (e.message.includes("Size mismatch")) {
        results.push("✅ BANNER SIZE MISMATCH TEST PASSED: Properly rejected file with incorrect size.");
      } else {
        results.push("❌ BANNER SIZE MISMATCH TEST ERROR: " + e.message);
      }
    }

    console.log(results.join("\n"));
    return results;
  }
});
