import { isSignatureBypassAllowed } from "../payments";

/**
 * Regression test for the Razorpay signature bypass logic.
 * Ensures that BOTH ENABLE_DEBUG_TOOLS="true" and RAZORPAY_KEY_SECRET="mock_secret"
 * are strictly required to bypass signature verification.
 */
export function runSignatureBypassTests() {
  let passed = 0;
  let failed = 0;

  function assertEqual(name: string, actual: boolean, expected: boolean) {
    if (actual === expected) {
      passed++;
      console.log(`✅ [PASS] ${name}`);
    } else {
      failed++;
      console.error(`❌ [FAIL] ${name} - Expected ${expected} but got ${actual}`);
    }
  }

  // 1. Both conditions met (Should Bypass)
  assertEqual(
    "Both conditions true -> returns true",
    isSignatureBypassAllowed("true", "mock_secret"),
    true
  );

  // 2. Only debug tools enabled (Should NOT Bypass)
  assertEqual(
    "Only debug tools enabled -> returns false",
    isSignatureBypassAllowed("true", "real_secret"),
    false
  );

  // 3. Only mock secret present (Should NOT Bypass)
  assertEqual(
    "Only mock secret present -> returns false",
    isSignatureBypassAllowed("false", "mock_secret"),
    false
  );

  // 4. Neither condition met (Should NOT Bypass)
  assertEqual(
    "Neither condition met -> returns false",
    isSignatureBypassAllowed(undefined, "real_secret"),
    false
  );

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    throw new Error(`Signature Bypass Regression Tests Failed (${failed} failures)`);
  }
}

// Run immediately if executed via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('signatureTest')) {
  runSignatureBypassTests();
}
