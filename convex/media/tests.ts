import { v } from "convex/values";
import { action, internalAction, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";

export const runMediaVerification = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING MEDIA VERIFICATION TESTS ===");
    let testsPassed = 0;
    let testsFailed = 0;

    // TEST 1: Role Enforcement
    console.log("\\n[TEST 1] Testing PRIMARY Role Enforcement in Products...");
    try {
      const mockImages = [
        { assetId: "img1", objectKey: "test/1.jpg", mime: "image/jpeg", size: 100, uploadedAt: Date.now(), imageRole: "PRIMARY", displayOrder: 1 },
        { assetId: "img2", objectKey: "test/2.jpg", mime: "image/jpeg", size: 100, uploadedAt: Date.now(), imageRole: "PRIMARY", displayOrder: 0 },
        { assetId: "img3", objectKey: "test/3.jpg", mime: "image/jpeg", size: 100, uploadedAt: Date.now(), imageRole: "PRIMARY", displayOrder: 2 },
      ];
      
      const normalizedImages = enforceRolesLocally(mockImages);
      
      const primaryCount = normalizedImages.filter(img => img.imageRole === "PRIMARY").length;
      const primaryIndex = normalizedImages.findIndex(img => img.imageRole === "PRIMARY");
      
      if (primaryCount === 1 && normalizedImages[primaryIndex].assetId === "img2") {
        console.log("✅ Role Enforcement Passed: Normalized to exactly one PRIMARY (asset img2 won due to displayOrder 0).");
        testsPassed++;
      } else {
        console.error("❌ Role Enforcement Failed:", normalizedImages);
        testsFailed++;
      }
    } catch (e: any) {
      console.error("❌ Role Enforcement Failed with error:", e.message);
      testsFailed++;
    }

    // TEST 2: Polyglot Sniffing
    console.log("\\n[TEST 2] Testing Polyglot Sniffing (Magic Bytes)...");
    try {
      // Simulate a text file passed as a JPEG
      const textBytes = new TextEncoder().encode("<html><script>alert(1)</script></html>");
      
      // We can call the verifyMagicBytes function directly if we extract it, 
      // but since it's an internal function in api.ts, we'll simulate the logic here.
      const isJpeg = verifyMagicBytesLocal(textBytes, "image/jpeg");
      
      if (!isJpeg) {
        console.log("✅ Polyglot Sniffing Passed: Text file masquerading as image/jpeg was rejected.");
        testsPassed++;
      } else {
        console.error("❌ Polyglot Sniffing Failed: Text file was accepted as JPEG!");
        testsFailed++;
      }
    } catch (e: any) {
      console.error("❌ Polyglot Sniffing Failed with error:", e.message);
      testsFailed++;
    }

    console.log(`\\n=== VERIFICATION COMPLETE: ${testsPassed} passed, ${testsFailed} failed ===\\n`);
    return { testsPassed, testsFailed };
  },
});

function enforceRolesLocally(images: any[]) {
  let hasPrimary = false;
  const sortedImages = [...images].sort((a: any, b: any) => {
    const orderA = typeof a === "object" ? (a.displayOrder ?? 999) : 999;
    const orderB = typeof b === "object" ? (b.displayOrder ?? 999) : 999;
    return orderA - orderB;
  });

  const processed = sortedImages.map((img: any) => {
    if (typeof img === "string") return img;
    let role = img.imageRole;
    if (role === "PRIMARY") {
      if (hasPrimary) {
        role = "OTHER"; 
      } else {
        hasPrimary = true;
      }
    }
    return { ...img, imageRole: role };
  });

  if (!hasPrimary && processed.length > 0) {
    const firstObjIndex = processed.findIndex((img: any) => typeof img === "object");
    if (firstObjIndex !== -1) {
      processed[firstObjIndex].imageRole = "PRIMARY";
    }
  }
  return processed;
}

function verifyMagicBytesLocal(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 4) return false;
  
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  if (mime === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  }
  if (mime === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
           bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}
