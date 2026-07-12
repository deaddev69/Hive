import { promoteEmailToAdminDebug, forceCreateAdminDebug } from "../users";

async function runDebugGatingTests() {
  console.log("=== Running Debug Mutation Gating Tests ===");

  let passed = 0;
  let failed = 0;
  let running = 0;

  function assertThrows(fn: () => Promise<any>, testName: string, expectedMessagePart: string) {
    running++;
    fn().then(
      () => {
        console.error(`❌ [FAIL] ${testName} (did not throw)`);
        failed++;
        running--;
      },
      (err: any) => {
        const msg = err.message || String(err);
        if (msg.includes(expectedMessagePart)) {
          console.log(`✅ [PASS] ${testName} (threw as expected: "${msg}")`);
          passed++;
        } else {
          console.error(`❌ [FAIL] ${testName} (threw wrong error: "${msg}", expected to contain: "${expectedMessagePart}")`);
          failed++;
        }
        running--;
      }
    ).catch(e => {
      console.error(e);
      failed++;
      running--;
    });
  }

  // Backup original env vars
  const origNodeEnv = process.env.NODE_ENV;
  const origDebugTools = process.env.ENABLE_DEBUG_TOOLS;

  // Test Case 1: In production mode, promoteEmailToAdminDebug is blocked
  (process.env as any).NODE_ENV = "production";
  process.env.ENABLE_DEBUG_TOOLS = "false";
  
  assertThrows(
    async () => {
      const mockCtx: any = { db: {} };
      await (promoteEmailToAdminDebug as any)._handler(mockCtx, { email: "test@example.com" });
    },
    "promoteEmailToAdminDebug is blocked in production environment",
    "Debug mutations are strictly disabled in this environment"
  );

  // Test Case 2: In production mode, forceCreateAdminDebug is blocked
  assertThrows(
    async () => {
      const mockCtx: any = { db: {} };
      await (forceCreateAdminDebug as any)._handler(mockCtx, { email: "test@example.com", clerkId: "clerk_123" });
    },
    "forceCreateAdminDebug is blocked in production environment",
    "Debug mutations are strictly disabled in this environment"
  );

  // Test Case 3: When debug tools are disabled (even in dev), they should be blocked
  (process.env as any).NODE_ENV = "development";
  process.env.ENABLE_DEBUG_TOOLS = "false";
  assertThrows(
    async () => {
      const mockCtx: any = { db: {} };
      await (promoteEmailToAdminDebug as any)._handler(mockCtx, { email: "test@example.com" });
    },
    "promoteEmailToAdminDebug is blocked when ENABLE_DEBUG_TOOLS is false",
    "Debug mutations are strictly disabled in this environment"
  );

  // Test Case 4: Gating passes when not in production and debug tools are enabled
  (process.env as any).NODE_ENV = "development";
  process.env.ENABLE_DEBUG_TOOLS = "true";
  assertThrows(
    async () => {
      const mockCtx: any = { db: {} };
      await (promoteEmailToAdminDebug as any)._handler(mockCtx, { email: "test@example.com" });
    },
    "Gating passes when environment is correct (reaches database execution)",
    "is not a function"
  );

  // Restore env vars
  (process.env as any).NODE_ENV = origNodeEnv;
  process.env.ENABLE_DEBUG_TOOLS = origDebugTools;

  // Wait a small amount of time for all async assertions to complete
  const interval = setInterval(() => {
    if (running === 0) {
      clearInterval(interval);
      console.log(`\nTest Summary: ${passed} passed, ${failed} failed.\n`);
      if (failed > 0) {
        process.exit(1);
      }
    }
  }, 50);
}

runDebugGatingTests();
