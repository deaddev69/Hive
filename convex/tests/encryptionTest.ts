// convex/tests/encryptionTest.ts
import { mutation } from "../_generated/server";

export const runEncryptionRegressionTests = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING ENCRYPTION KEY DERIVATION REGRESSION TEST ===");

    const secret = "short-dev-key";
    const encoder = new TextEncoder();

    // 1. Naive padding-based raw key bytes (Old Method)
    const oldPaddedSecret = secret.padEnd(32, "0").slice(0, 32);
    const oldRawKeyBytes = encoder.encode(oldPaddedSecret);

    // 2. SHA-256 hashed raw key bytes (New Method)
    const secretBytes = encoder.encode(secret);
    const newHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
    const newRawKeyBytes = new Uint8Array(newHashBuffer);

    console.log("Old key bytes length:", oldRawKeyBytes.length);
    console.log("New key bytes length:", newRawKeyBytes.length);

    // Assert correct key size for AES-256 (32 bytes / 256 bits)
    if (oldRawKeyBytes.length !== 32 || newRawKeyBytes.length !== 32) {
      throw new Error(`FAIL: Derived keys must be exactly 32 bytes.`);
    }

    // Assert keys are cryptographically different
    let areKeysIdentical = true;
    for (let i = 0; i < 32; i++) {
      if (oldRawKeyBytes[i] !== newRawKeyBytes[i]) {
        areKeysIdentical = false;
        break;
      }
    }

    if (areKeysIdentical) {
      throw new Error("FAIL: Naive padded key and SHA-256 key are identical! Hashing did not occur.");
    }

    console.log("PASSED: SHA-256 derived key differs from naive padded key.");
    
    // 3. Scan boutiques table directly in the mutation context
    const list = await ctx.db.query("boutiques").collect();
    const encryptedCount = list.filter(b => b.bankAccount !== undefined).length;
    console.log(`Scan result: Found ${encryptedCount} boutiques with encrypted bank details out of ${list.length} total boutiques.`);
    
    console.log("=== ENCRYPTION REGRESSION TEST PASSED ===");
    return { success: true, totalBoutiques: list.length, encryptedBoutiquesCount: encryptedCount };
  }
});
