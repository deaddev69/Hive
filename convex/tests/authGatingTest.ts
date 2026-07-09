import { assertRoleIssuerGating } from "../lib/auth";

async function runAuthGatingTests() {
  console.log("=== Running Hybrid Auth Bi-Directional Role-Issuer Gating Tests ===");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  function assertThrows(fn: () => void, testName: string) {
    try {
      fn();
      console.error(`[FAIL] ${testName} (did not throw)`);
      failed++;
    } catch (err: any) {
      console.log(`[PASS] ${testName} (threw as expected: ${err.message || err.data?.message || err})`);
      passed++;
    }
  }

  // 1. Customer with Firebase token -> Allowed
  assert(
    assertRoleIssuerGating({ role: "customer" }, { issuer: "https://securetoken.google.com/hive-fashion" }),
    "Customer role with Firebase token is allowed"
  );

  // 2. Customer with Clerk token -> Blocked (Reverse Guard)
  assertThrows(
    () => assertRoleIssuerGating({ role: "customer" }, { issuer: "https://clerk.hivenow.in" }),
    "Customer role with Clerk token is blocked by Reverse Guard"
  );

  // 3. Boutique Owner with Clerk token -> Allowed
  assert(
    assertRoleIssuerGating({ role: "boutique_owner" }, { issuer: "https://clerk.hivenow.in" }),
    "Boutique Owner role with Clerk token is allowed"
  );

  // 4. Boutique Owner with Firebase token -> Blocked (Forward Guard)
  assertThrows(
    () => assertRoleIssuerGating({ role: "boutique_owner" }, { issuer: "https://securetoken.google.com/hive-fashion" }),
    "Boutique Owner role with Firebase token is blocked by Forward Guard"
  );

  // 5. Admin with Firebase token -> Blocked (Forward Guard)
  assertThrows(
    () => assertRoleIssuerGating({ role: "admin" }, { issuer: "https://securetoken.google.com/hive-fashion" }),
    "Admin role with Firebase token is blocked by Forward Guard"
  );

  // 6. Seller Pending with Firebase token -> Blocked (Forward Guard)
  assertThrows(
    () => assertRoleIssuerGating({ role: "seller_pending" }, { issuer: "https://securetoken.google.com/hive-fashion" }),
    "Seller Pending role with Firebase token is blocked by Forward Guard"
  );

  // 7. Test Dev Clerk instance excluded in production
  (process.env as any).NODE_ENV = "production";
  const isDevClerkAllowedInProd = assertRoleIssuerGating(
    { role: "boutique_owner" },
    { issuer: "https://artistic-tiger-76.clerk.accounts.dev" },
    false // don't throw, just check return boolean
  );
  assert(
    !isDevClerkAllowedInProd,
    "Dev Clerk instance token is NOT allowed as a valid Clerk issuer in production"
  );

  // 8. Spoofed unknown issuer -> Blocked for both roles
  assertThrows(
    () => assertRoleIssuerGating({ role: "customer" }, { issuer: "https://spoofed-auth.com" }),
    "Customer role with spoofed issuer is blocked"
  );
  assertThrows(
    () => assertRoleIssuerGating({ role: "boutique_owner" }, { issuer: "https://spoofed-auth.com" }),
    "Boutique Owner role with spoofed issuer is blocked"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuthGatingTests();
